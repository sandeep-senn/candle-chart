import { promisify } from "util";
import { calculateIndicators as calcEngine } from "./indicatorEngine.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Exponential backoff with full jitter
async function retryWithBackoff(fn, { retries = 5, baseMs = 200, maxMs = 30000 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const exp = Math.min(maxMs, baseMs * 2 ** attempt);
      // full jitter: random between 0 and exp
      const delay = Math.floor(Math.random() * exp);
      await wait(delay);
    }
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 1) fetchChunkedHistorical: fetches historical data chunked by 1-year windows
export async function fetchChunkedHistorical(kite, instrumentToken, fromDate, toDate) {
  const chunks = [];
  let curFrom = new Date(fromDate);
  const end = new Date(toDate);

  while (curFrom <= end) {
    const curTo = new Date(curFrom);
    curTo.setFullYear(curFrom.getFullYear() + 1);
    if (curTo > end) curTo.setTime(end.getTime());

    const fromStr = `${formatDate(curFrom)} 09:30:00`;
    const toStr = `${formatDate(curTo)} 15:30:00`;

    const data = await retryWithBackoff(() =>
      kite.getHistoricalData(instrumentToken, "day", fromStr, toStr),
    );


    if (Array.isArray(data) && data.length) {
      chunks.push(...data);
    }

    curFrom = new Date(curTo);
    curFrom.setDate(curFrom.getDate() + 1);
  }

  // sort by date ascending
  chunks.sort((a, b) => new Date(a.date) - new Date(b.date));
  return chunks;
}

// NOTE: indicator calculations are delegated to the modular engine in services/indicatorEngine.js

// helper to build bulk insert for base candle columns
function buildBulkInsertQuery(table, tradingsymbol, exchange, candles) {
  // base columns
  const cols = [
    "tradingsymbol",
    "exchange",
    "interval",
    "date",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "change",
    "change_percent",
  ];

  const values = [];
  const placeholders = [];
  let idx = 1;

  for (const c of candles) {
    const dateStr = c.date instanceof Date ? formatDate(c.date) : (typeof c.date === 'string' ? c.date.split(' ')[0] : c.date);
    const row = [
      tradingsymbol,
      exchange,
      "day",
      dateStr,
      c.open,
      c.high,
      c.low,
      c.close,
      c.volume,
      c.change ?? null,
      c.change_percent ?? null,
    ];
    values.push(...row);

    const ph = [];
    for (let i = 0; i < row.length; i++) {
      ph.push(`$${idx++}`);
    }
    placeholders.push(`(${ph.join(",")})`);
  }

  const sql = `INSERT INTO ${table}(${cols.join(",")}) VALUES ${placeholders.join(",")}  ON CONFLICT ON CONSTRAINT trading_unique_row
DO NOTHING;`;
  return { sql, values };
}

// 3) insertBulkCandles: performs bulk insert of base candle fields within a transaction using provided client
export async function insertBulkCandles(client, table, tradingsymbol, exchange, candles) {
  if (!candles || !candles.length) return 0;
  const { sql, values } = buildBulkInsertQuery(table, tradingsymbol, exchange, candles);

  try {
    const result = await client.query(sql, values);
    return result.rowCount || candles.length;
  } catch (err) {
    throw err;
  }
}

// Helper to perform per-date UPDATE for indicator columns (keeps parity with earlier code)
async function updateIndicatorsForDates(client, table, tradingsymbol, exchange, candles, indicatorRows) {
  // indicatorRows is array aligned with candles, each an object of additional columns to set
  for (let i = 0; i < candles.length; i++) {
    const indicators = indicatorRows[i] || {};
    const updates = [];
    const values = [];
    let idx = 1;

    for (const [col, val] of Object.entries(indicators)) {
      updates.push(`${col} = $${idx++}`);
      values.push(val ?? null);
    }

    if (!updates.length) continue; // nothing to update

    // Ensure date is properly formatted
    const dateStr = candles[i].date instanceof Date ? formatDate(candles[i].date) : (typeof candles[i].date === 'string' ? candles[i].date.split(' ')[0] : candles[i].date);

    values.push(tradingsymbol);
    values.push(exchange);
    values.push(dateStr);

    const sql = `UPDATE ${table} SET ${updates.join(",")} WHERE tradingsymbol = $${idx++} AND exchange = $${idx++} AND interval = 'day' AND date = $${idx++}`;

    try {
      await client.query(sql, values);
    } catch (err) {
      console.error(`❌ UPDATE ERROR for ${tradingsymbol} on ${dateStr}:`, err.message);
      throw err;
    }
  }
}

// Simple semaphore for controlled concurrency
function createSemaphore(max) {
  let active = 0;
  const queue = [];
  const take = () => new Promise((res) => queue.push(res));
  const release = () => {
    active--;
    if (queue.length) {
      active++;
      const res = queue.shift();
      res(release);
    }
  };
  return async function run(fn) {
    if (active < max) {
      active++;
      return fn().then((r) => {
        release();
        return r;
      }, (err) => {
        release();
        throw err;
      });
    }
    const rel = await take();
    try {
      return fn().then((r) => {
        rel();
        return r;
      }, (err) => {
        rel();
        throw err;
      });
    } catch (err) {
      throw err;
    }
  };
}

// 4) processInstrument: orchestrates incremental fetch, calculation, and DB writes for one instrument
export async function processInstrument({ kite, pool, table = "trading", instrument, fromDate, toDate }) {
  const client = await pool.connect();
  const startTime = Date.now();
  try {
    // 1. get max date for this tradingsymbol+exchange
    const query1 = `SELECT MAX(date) as max_date FROM ${table} WHERE tradingsymbol = $1 AND exchange = $2 AND interval = 'day'`;
    const { rows } = await client.query(query1, [instrument.symbol, instrument.exchange]);

    let startDate = fromDate;
    if (rows && rows[0] && rows[0].max_date) {
      const maxDate = new Date(rows[0].max_date);
      maxDate.setDate(maxDate.getDate() + 1); // start from next day
      startDate = maxDate;
    }

    const today = new Date(toDate);
    if (startDate > today) {
      return { instrument: instrument.symbol, inserted: 0, skipped: true };
    }

    // fetch historically in 1-year chunks from startDate to today
    const candles = await fetchChunkedHistorical(kite, instrument.token, startDate, today);
    if (!candles || !candles.length) return { instrument: instrument.symbol, inserted: 0 };

    // compute change and change_percent (base fields required for insert)
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        candles[i].change = null;
        candles[i].change_percent = null;
      } else {
        const prevClose = Number(candles[i - 1].close);
        const currClose = Number(candles[i].close);
        const ch = currClose - prevClose;
        candles[i].change = ch;
        candles[i].change_percent = prevClose ? (ch / prevClose) * 100 : null;
      }
    }
    let enriched;
    try {
      enriched = calcEngine(candles);
      console.log(`📍 LOG-4b: ✓ Indicators computed, got ${enriched?.length || 0} enriched rows`);
    } catch (err) {
      throw err;
    }

    if (!enriched || !enriched.length) {
      return { instrument: instrument.symbol, inserted: 0 };
    }

    // build indicatorRows: objects aligned with candles containing only indicator columns
    console.log(`processInstrument: building indicator rows for ${instrument.symbol}`);
    const baseCols = new Set(["date", "open", "high", "low", "close", "volume", "interval", "tradingsymbol", "exchange"]);
    const indicatorRows = enriched.map((row) => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        if (!baseCols.has(k)) out[k] = v;
      }
      return out;
    });

    // Insert within a transaction using this client
    await client.query("BEGIN");
    try {
      const inserted = await insertBulkCandles(client, table, instrument.symbol, instrument.exchange, candles);

      // Update indicator columns per date (this can be optimized to batch updates if desired)
      if (indicatorRows.length > 0) {
        await updateIndicatorsForDates(client, table, instrument.symbol, instrument.exchange, candles, indicatorRows);
      }

      await client.query("COMMIT");
      const took = Date.now() - startTime;
      return { instrument: instrument.symbol, inserted };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  } finally {
    client.release();
  }
}

// process all instruments with controlled concurrency
export async function processAllInstruments({ kite, pool, instruments, table = "trading", concurrency = 3, fromDate, toDate }) {
  const sem = createSemaphore(concurrency);
  const results = [];

  const tasks = instruments.map((inst) => async () => {
    return processInstrument({ kite, pool, table, instrument: inst, fromDate, toDate });
  });

  // run tasks with semaphore
  const runners = tasks.map((t) => sem(t));
  const settled = await Promise.allSettled(runners);
  for (const s of settled) {
    if (s.status === "fulfilled") results.push(s.value);
    else results.push({ error: s.reason && s.reason.message });
  }

  // Log summary
  const totalInserted = results.reduce((sum, r) => sum + (r.inserted || 0), 0);
  const successCount = results.filter(r => r.inserted !== undefined).length;
  const errorCount = results.filter(r => r.error).length;

  return results;
}
