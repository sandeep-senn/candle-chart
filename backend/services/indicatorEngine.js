// PURE CUSTOM ENGINE – No external library

// ---------------- CONFIGURATION ----------------
const SMA_PERIODS = [3, 5, 7, 8, 9, 10, 12, 14, 17, 19, 20, 26, 50, 65, 100, 150, 200, 252, 504, 1260];
const RSI_PERIODS = [5, 7, 12, 14, 21, 65, 252];
const ADX_PERIODS = [5, 7, 12, 14, 21, 65, 252];
const ATR_PERIODS = [5, 7, 12, 14, 21, 65, 252];
const STOCH_PERIODS = [5, 7, 14, 21, 65, 252];
const BB_PERIODS = [5, 10, 20, 50, 65, 100, 150, 200, 252];
const BB_DEVS = [2];
const MFI_PERIODS = [5, 14, 65, 252];

// ---------------- BASIC HELPERS ----------------

const toNum = (v) => (v == null ? null : Number(v));
const safeDiv = (a, b) => (b === 0 || b == null ? null : a / b);

// Rolling sum
function rollingSum(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    if (i >= period) sum -= values[i - period] ?? 0;
    if (i >= period - 1) out[i] = sum;
  }
  return out;
}

// ---------------- SMA ----------------
function calculateSMA(values, period) {
  const sums = rollingSum(values, period);
  return sums.map(v => v != null ? v / period : null);
}

// ---------------- EMA ----------------
function calculateEMA(values, period) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev = null;

  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) continue;
    if (prev === null) {
      if (i >= period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += values[i - j];
        prev = sum / period;
        out[i] = prev;
      }
    } else {
      prev = values[i] * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

// ---------------- WILDER'S SMOOTHING (RMA) ----------------
function calculateRMA(values, period) {
  const out = new Array(values.length).fill(null);
  let prev = null;

  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) continue;

    if (prev === null) {
      if (i >= period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += values[i - j];
        prev = sum / period;
        out[i] = prev;
      }
    } else {
      prev = (prev * (period - 1) + values[i]) / period;
      out[i] = prev;
    }
  }
  return out;
}


// ---------------- RSI ----------------
function calculateRSI(values, period) {
  const gains = values.map((v, i) => (i === 0 || v == null || values[i - 1] == null) ? 0 : Math.max(v - values[i - 1], 0));
  const losses = values.map((v, i) => (i === 0 || v == null || values[i - 1] == null) ? 0 : Math.max(values[i - 1] - v, 0));

  const avgGain = calculateRMA(gains, period);
  const avgLoss = calculateRMA(losses, period);

  return avgGain.map((g, i) => {
    const l = avgLoss[i];
    if (g == null || l == null) return null;
    if (l === 0) return 100;
    const rs = g / l;
    return 100 - (100 / (1 + rs));
  });
}

// ---------------- ATR ----------------
function calculateTR(highs, lows, closes) {
  return highs.map((h, i) => {
    if (i === 0) return h - lows[i];
    const prevC = closes[i - 1];
    return Math.max(h - lows[i], Math.abs(h - prevC), Math.abs(lows[i] - prevC));
  });
}

function calculateATR(highs, lows, closes, period) {
  const tr = calculateTR(highs, lows, closes);
  return calculateRMA(tr, period);
}

// ---------------- DM / ADX ----------------
function calculateADX(highs, lows, closes, period) {
  const tr = calculateTR(highs, lows, closes);
  const smoothTR = calculateRMA(tr, period);

  const plusDM = highs.map((h, i) => {
    if (i === 0) return 0;
    const diffH = h - highs[i - 1];
    const diffL = lows[i - 1] - lows[i];
    return (diffH > diffL && diffH > 0) ? diffH : 0;
  });

  const minusDM = lows.map((l, i) => {
    if (i === 0) return 0;
    const diffH = highs[i] - highs[i - 1];
    const diffL = lows[i - 1] - l;
    return (diffL > diffH && diffL > 0) ? diffL : 0;
  });

  const smoothPlusDM = calculateRMA(plusDM, period);
  const smoothMinusDM = calculateRMA(minusDM, period);

  const plusDI = [];
  const minusDI = [];
  const dx = [];

  for (let i = 0; i < highs.length; i++) {
    if (!smoothTR[i] || !smoothPlusDM[i] || !smoothMinusDM[i]) {
      plusDI.push(null);
      minusDI.push(null);
      dx.push(null);
      continue;
    }
    const pdi = (smoothPlusDM[i] / smoothTR[i]) * 100;
    const mdi = (smoothMinusDM[i] / smoothTR[i]) * 100;
    plusDI.push(pdi);
    minusDI.push(mdi);

    const sum = pdi + mdi;
    dx.push(sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100);
  }

  const adx = calculateRMA(dx, period);

  return { adx, plusDI, minusDI };
}


// ---------------- MACD ----------------
function calculateMACD(values, fast, slow, signal) {
  const emaFast = calculateEMA(values, fast);
  const emaSlow = calculateEMA(values, slow);

  const macdLine = values.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null
  );

  const signalLine = calculateEMA(macdLine, signal);

  const histogram = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? v - signalLine[i] : null
  );

  return { macd: macdLine, signal: signalLine, histogram };
}

// ---------------- STOCHASTIC ----------------
function calculateStochastic(highs, lows, closes, period, signalPeriod) {
  const stochK = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      stochK.push(null);
      continue;
    }
    const periodLows = lows.slice(i - period + 1, i + 1);
    const periodHighs = highs.slice(i - period + 1, i + 1);
    const lowest = Math.min(...periodLows);
    const highest = Math.max(...periodHighs);

    if (highest === lowest) {
      stochK.push(50);
    } else {
      const k = ((closes[i] - lowest) / (highest - lowest)) * 100;
      stochK.push(k);
    }
  }

  const stochD = calculateSMA(stochK, signalPeriod || 3);
  return { k: stochK, d: stochD };
}


// ---------------- BOLLINGER ----------------
function calculateBollinger(values, period, dev) {
  const out = new Array(values.length).fill(null);
  const sma = calculateSMA(values, period);

  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    out[i] = {
      upper: mean + dev * std,
      middle: mean,
      lower: mean - dev * std,
    };
  }
  return out;
}

// ---------------- ICHIMOKU ----------------
function calculateIchimoku(highs, lows, conversionPeriod, basePeriod, spanPeriod, displacement) {
  const donchian = (h, l, len, idx) => {
    if (idx < len - 1) return null;
    const subH = h.slice(idx - len + 1, idx + 1);
    const subL = l.slice(idx - len + 1, idx + 1);
    return (Math.max(...subH) + Math.min(...subL)) / 2;
  };

  const out = new Array(highs.length).fill(null);

  for (let i = 0; i < highs.length; i++) {
    out[i] = {
      tenkan: donchian(highs, lows, conversionPeriod, i),
      kijun: donchian(highs, lows, basePeriod, i),
      spanA: null,
      spanB: null
    };
  }

  for (let i = 0; i < highs.length; i++) {
    const shift_idx = i - displacement;
    if (shift_idx >= 0) {
      const t = out[shift_idx].tenkan;
      const k = out[shift_idx].kijun;
      if (t != null && k != null) {
        out[i].spanA = (t + k) / 2;
      }
      const b = donchian(highs, lows, spanPeriod, shift_idx);
      if (b != null) {
        out[i].spanB = b;
      }
    }
  }

  return out;
}


// ---------------- OBV ----------------
function calculateOBV(closes, volumes) {
  const out = new Array(closes.length).fill(null);
  let obv = 0;
  out[0] = obv;

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    out[i] = obv;
  }
  return out;
}

// ---------------- VWAP ----------------
function calculateVWAP(highs, lows, closes, volumes) {
  const out = new Array(closes.length).fill(null);
  let cumPV = 0;
  let cumVol = 0;

  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumPV += tp * volumes[i];
    cumVol += volumes[i];
    out[i] = safeDiv(cumPV, cumVol);
  }
  return out;
}

// ---------------- MFI ----------------
function calculateMFI(highs, lows, closes, volumes, period) {
  const out = new Array(closes.length).fill(null);

  const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);

  for (let i = period; i < closes.length; i++) {
    let posFlow = 0;
    let negFlow = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const raw = tp[j] * volumes[j];
      if (tp[j] > tp[j - 1]) posFlow += raw;
      else if (tp[j] < tp[j - 1]) negFlow += raw;
    }

    const mfr = safeDiv(posFlow, negFlow);
    if (mfr == null) {
      out[i] = 100;
    } else {
      out[i] = 100 - (100 / (1 + mfr));
    }
  }
  return out;
}

// ---------------- CMF ----------------
function calculateCMF(highs, lows, closes, volumes, period) {
  const out = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    let mfvSum = 0;
    let volSum = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const range = highs[j] - lows[j];
      const mfm = range === 0 ? 0 : ((closes[j] - lows[j]) - (highs[j] - closes[j])) / range;
      mfvSum += mfm * volumes[j];
      volSum += volumes[j];
    }
    out[i] = safeDiv(mfvSum, volSum);
  }
  return out;
}


// ---------------- MAIN ----------------

export function calculateIndicators(candles) {
  if (!candles?.length) return [];

  const enriched = candles.map(c => ({ ...c }));

  const closes = candles.map(c => toNum(c.close));
  const highs = candles.map(c => toNum(c.high));
  const lows = candles.map(c => toNum(c.low));
  const volumes = candles.map(c => toNum(c.volume));

  // Change
  for (let i = 1; i < enriched.length; i++) {
    const diff = closes[i] - closes[i - 1];
    enriched[i].change = diff;
    enriched[i].change_percent = safeDiv(diff, closes[i - 1]) * 100;
  }

  // Pre-calculate standard indicators in bulk where possible
  const obv = calculateOBV(closes, volumes);
  const vwap = calculateVWAP(highs, lows, closes, volumes);
  const cmf = calculateCMF(highs, lows, closes, volumes, 14);

  // Apply Single Column Indicators
  enriched.forEach((row, i) => {
    row.obv = obv[i];
    row.vwap = vwap[i];
    row.cmf_14 = cmf[i];
  });

  // Iterative Indicators

  // SMA
  for (const p of SMA_PERIODS) {
    const sma = calculateSMA(closes, p);
    for (let i = 0; i < enriched.length; i++) enriched[i][`sma_price_${p}`] = sma[i];
  }

  // EMA
  for (const p of SMA_PERIODS) {
    const ema = calculateEMA(closes, p);
    for (let i = 0; i < enriched.length; i++) enriched[i][`ema_${p}`] = ema[i];
  }

  // RSI
  for (const p of RSI_PERIODS) {
    const rsi = calculateRSI(closes, p);
    for (let i = 0; i < enriched.length; i++) enriched[i][`rsi_${p}`] = rsi[i];
  }

  // ADX
  for (const p of ADX_PERIODS) {
    const { adx, plusDI, minusDI } = calculateADX(highs, lows, closes, p);
    for (let i = 0; i < enriched.length; i++) {
      enriched[i][`adx_${p}`] = adx[i];
      enriched[i][`directional_movement_plus_${p}`] = plusDI[i];
      enriched[i][`directional_movement_minus_${p}`] = minusDI[i];
    }
  }

  // ATR
  for (const p of ATR_PERIODS) {
    const atr = calculateATR(highs, lows, closes, p);
    for (let i = 0; i < enriched.length; i++) enriched[i][`atr_${p}`] = atr[i];
  }

  // Bollinger Bands
  for (const p of BB_PERIODS) {
    for (const dev of BB_DEVS) {
      const bb = calculateBollinger(closes, p, dev);
      const suffix = `${p}_${dev}`;
      for (let i = 0; i < enriched.length; i++) {
        const res = bb[i];
        enriched[i][`bollinger_upper_${suffix}`] = res?.upper ?? null;
        enriched[i][`bollinger_middle_${suffix}`] = res?.middle ?? null;
        enriched[i][`bollinger_lower_${suffix}`] = res?.lower ?? null;
      }
    }
  }

  // MACD
  // 12, 26, 9
  const macdStandard = calculateMACD(closes, 12, 26, 9);
  for (let i = 0; i < enriched.length; i++) {
    enriched[i][`macd_line_26`] = macdStandard.macd[i];
    enriched[i][`macd_signal_26`] = macdStandard.signal[i];
    enriched[i][`macd_histogram_26`] = macdStandard.histogram[i];
  }
  // 8, 17, 9
  const macdFast = calculateMACD(closes, 8, 17, 9);
  for (let i = 0; i < enriched.length; i++) {
    enriched[i][`macd_line_17`] = macdFast.macd[i];
    enriched[i][`macd_signal_17`] = macdFast.signal[i];
    enriched[i][`macd_histogram_17`] = macdFast.histogram[i];
  }

  // MFI
  for (const p of MFI_PERIODS) {
    const mfi = calculateMFI(highs, lows, closes, volumes, p);
    for (let i = 0; i < enriched.length; i++) enriched[i][`mfi_${p}`] = mfi[i];
  }

  // Stochastic
  for (const p of STOCH_PERIODS) {
    const { k, d } = calculateStochastic(highs, lows, closes, p, 3);
    for (let i = 0; i < enriched.length; i++) {
      enriched[i][`stoch_k_${p}`] = k[i];
      enriched[i][`stoch_d_${p}`] = d[i];
    }
  }

  // Ichimoku (9, 26, 52, 26)
  const ichi = calculateIchimoku(highs, lows, 9, 26, 52, 26);
  for (let i = 0; i < enriched.length; i++) {
    const v = ichi[i];
    enriched[i].ichimoku_tenkan = v?.tenkan ?? null;
    enriched[i].ichimoku_kijun = v?.kijun ?? null;
    enriched[i].ichimoku_senkou_a = v?.spanA ?? null;
    enriched[i].ichimoku_senkou_b = v?.spanB ?? null;
  }

  return enriched;
}
