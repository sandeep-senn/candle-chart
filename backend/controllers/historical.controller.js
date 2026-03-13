import pool from "../config/db.js";
import { getInstrumentBySymbol } from "../services/instrumentService.js";
import smartApiSessionManager from "../clients/SmartApiSessionManager.js";

/**
 * Get historical data for a specific symbol
 */
export const getHistoricalData = async (req, res) => {
  try {
    let { symbol } = req.params;
    const { interval = "day", to, limit = 500 } = req.query;
    const userId = req.user?.id || 1;

    symbol = decodeURIComponent(symbol);

    const client = await pool.connect();
    try {
      // 1. Try Local DB
      let query = `SELECT * FROM trading WHERE tradingsymbol = $1 AND interval = $2`;
      const params = [symbol, interval];

      if (to) {
        query += ` AND date < $3`;
        params.push(to);
      }
      query += ` ORDER BY date DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const finalQuery = `SELECT * FROM (${query}) as sub ORDER BY date ASC`;
      let result = await client.query(finalQuery, params);

      // 2. Sync from Angel One if empty
      if (result.rows.length === 0 && !to) {
        console.log(`[Historical] On-demand sync for ${symbol}`);
        const session = smartApiSessionManager.getSession(userId);
        const inst = getInstrumentBySymbol(symbol);

        if (session && inst) {
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(toDate.getDate() - 30);
            const formatDate = (d) => d.toISOString().replace('T', ' ').substring(0, 16);

            try {
                const candleRes = await session.smartApi.getCandleData({
                    exchange: inst.exchange || "NSE",
                    symboltoken: inst.token,
                    interval: interval === "day" ? "ONE_DAY" : "ONE_MINUTE",
                    fromdate: formatDate(fromDate),
                    todate: formatDate(toDate)
                });

                if (candleRes.status && candleRes.data) {
                    for (const row of candleRes.data) {
                        await client.query(
                            `INSERT INTO trading (tradingsymbol, date, interval, open, high, low, close, volume)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                             ON CONFLICT (tradingsymbol, date, interval) DO NOTHING`,
                            [symbol, row[0], interval, row[1], row[2], row[3], row[4], row[5]]
                        );
                    }
                    result = await client.query(finalQuery, params);
                }
            } catch (e) {
                console.error("[Historical] Sync error:", e.message);
            }
        }
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Data not available. Login to Angel One to sync." });
      }

      const data = result.rows.map(row => ({
        ...row,
        date: new Date(row.date).toISOString()
      }));
      res.json(data);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[ERROR] Historical:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * Get all available symbols
 */
export const getAllSymbols = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`SELECT DISTINCT tradingsymbol FROM trading ORDER BY tradingsymbol ASC`);
      res.json({ success: true, symbols: result.rows.map(r => r.tradingsymbol) });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Error" });
  }
};

/**
 * Get latest price
 */
export const getPriceData = async (req, res) => {
  try {
    let { symbol } = req.params;
    symbol = decodeURIComponent(symbol);
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT tradingsymbol, close as ltp, "change", volume, date FROM trading WHERE tradingsymbol = $1 ORDER BY date DESC LIMIT 1`,
        [symbol]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false });
      res.json({ success: true, data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

export const getChartStats = async (req, res) => {
    // Basic stub for stats
    res.json({ success: true, data: {} });
};

export const healthCheck = async (req, res) => {
  res.json({ success: true, message: "OK" });
};
