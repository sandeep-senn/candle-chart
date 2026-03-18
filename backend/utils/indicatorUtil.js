import { SMA, EMA, RSI, BollingerBands, MACD, ATR, ADX, MFI, Stochastic } from "technicalindicators";

/**
 * Calculates technical indicators for chart data
 * @param {Array} data - Array of OHLC objects { open, high, low, close, volume, date }
 * @returns {Array} - Data with technical indicators attached
 */
export const calculateIndicators = (data) => {
    if (!data || data.length < 5) return data;

    const prices = data.map(d => Number(d.close));
    const highs = data.map(d => Number(d.high));
    const lows = data.map(d => Number(d.low));
    const opens = data.map(d => Number(d.open));
    const volumes = data.map(d => Number(d.volume));

    // SMA & EMA Periods
    const periods = [3, 5, 7, 8, 9, 10, 12, 14, 17, 19, 20, 26, 50, 65, 100, 150, 200, 252, 504, 1260];

    // SMA
    periods.forEach(p => {
        if (prices.length >= p) {
            const vals = SMA.calculate({ period: p, values: prices });
            const offset = data.length - vals.length;
            vals.forEach((v, i) => {
                data[i + offset][`sma_price_${p}`] = v;
            });
        }
    });

    // EMA
    periods.forEach(p => {
        if (prices.length >= p) {
            const vals = EMA.calculate({ period: p, values: prices });
            const offset = data.length - vals.length;
            vals.forEach((v, i) => {
                data[i + offset][`ema_${p}`] = v;
            });
        }
    });

    // RSI
    const rsiPeriods = [5, 7, 12, 14, 21, 65, 252];
    rsiPeriods.forEach(p => {
        if (prices.length > p) {
            const vals = RSI.calculate({ period: p, values: prices });
            const offset = data.length - vals.length;
            vals.forEach((v, i) => {
                data[i + offset][`rsi_${p}`] = v;
            });
        }
    });

    // ATR
    rsiPeriods.forEach(p => {
        if (data.length > p) {
            const vals = ATR.calculate({ period: p, high: highs, low: lows, close: prices });
            const offset = data.length - vals.length;
            vals.forEach((v, i) => {
                data[i + offset][`atr_${p}`] = v;
            });
        }
    });

    // ADX
    rsiPeriods.forEach(p => {
        if (data.length > p * 2) {
            const vals = ADX.calculate({ period: p, high: highs, low: lows, close: prices });
            const offset = data.length - vals.length;
            vals.forEach((v, i) => {
                data[i + offset][`adx_${p}`] = v.adx;
            });
        }
    });

    // Bollinger Bands
    const bbPeriods = [5, 10, 20, 50, 65, 100, 150, 200, 252];
    bbPeriods.forEach(p => {
        if (prices.length >= p) {
            const vals = BollingerBands.calculate({ period: p, stdDev: 2, values: prices });
            const offset = data.length - vals.length;
            vals.forEach((v, i) => {
                data[i + offset][`bollinger_upper_${p}_2`] = v.upper;
                data[i + offset][`bollinger_lower_${p}_2`] = v.lower;
                data[i + offset][`bollinger_middle_${p}_2`] = v.middle;
            });
        }
    });

    // MACD (12, 26, 9)
    if (prices.length > 26) {
        const macd26 = MACD.calculate({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, values: prices, SimpleMAOscillator: false, SimpleMASignal: false });
        const offset26 = data.length - macd26.length;
        macd26.forEach((v, i) => {
            data[i + offset26][`macd_line_26`] = v.MACD;
            data[i + offset26][`macd_signal_26`] = v.signal;
            data[i + offset26][`macd_histogram_26`] = v.histogram;
        });

        const macd17 = MACD.calculate({ fastPeriod: 8, slowPeriod: 17, signalPeriod: 9, Values: prices });
        const offset17 = data.length - macd17.length;
        macd17.forEach((v, i) => {
            data[i + offset17][`macd_line_17`] = v.MACD;
            data[i + offset17][`macd_signal_17`] = v.signal;
        });
    }

    // MFI
    const mfiPeriods = [5, 14, 65, 252];
    mfiPeriods.forEach(p => {
        if (data.length > p) {
            const vals = MFI.calculate({ high: highs, low: lows, close: prices, volume: volumes, period: p });
            const offset = data.length - vals.length;
            vals.forEach((v, i) => {
                data[i + offset][`mfi_${p}`] = v;
            });
        }
    });

    // Stochastic
    rsiPeriods.forEach(p => {
        if (data.length > p) {
            const vals = Stochastic.calculate({ high: highs, low: lows, close: prices, period: p, signalPeriod: 3 });
            const offset = data.length - vals.length;
            vals.forEach((v, i) => {
                data[i + offset][`stoch_k_${p}`] = v.k;
                data[i + offset][`stoch_d_${p}`] = v.d;
            });
        }
    });

    return data;
};
