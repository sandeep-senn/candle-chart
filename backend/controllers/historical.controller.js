import pool from "../config/db.js";

/**
 * Get historical data for a specific symbol
 * @route GET /api/historical/:symbol
 * @param req - Request object with symbol in params and interval in query
 * @param res - Response object
 */
export const getHistoricalData = async (req, res) => {
  try {
    let { symbol } = req.params;
    const { interval = "day", to, limit = 500 } = req.query; // Default 500 candles per chunk

    symbol = decodeURIComponent(symbol);

    console.log(`[DEBUG] Fetching history: "${symbol}", interval: "${interval}", to: ${to}, limit: ${limit}`);

    const client = await pool.connect();
    try {
      let query = `
        SELECT *
        FROM trading
        WHERE tradingsymbol = $1 AND interval = $2
      `;
      const params = [symbol, interval];

      if (to) {
        query += ` AND date < $3`;
        params.push(to);
      }

      // Order by DESC to get latest first, then limit
      query += ` ORDER BY date DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      // Wrap to sort back to ASC for the chart
      const finalQuery = `
        SELECT * FROM (${query}) as sub
        ORDER BY date ASC
      `;

      const result = await client.query(finalQuery, params);

      if (result.rows.length === 0 && !to) { // Only 404 on initial load if empty
        console.log(`[DEBUG] No data found for symbol: "${symbol}"`);
        return res.status(404).json({
          success: false,
          message: `No historical data found for symbol: ${symbol}`,
        });
      }

      console.log(`[DEBUG] Found ${result.rows.length} records`);

      // Format dates
      const data = result.rows.map(row => ({
        ...row,
        date: new Date(row.date).toISOString()
      }));

      res.json(data);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[ERROR] Fetching historical data:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch historical data",
      error: err.message,
    });
  }
};

/**
 * Get all available symbols in the database
 * @route GET /api/historical/symbols
 * @param req - Request object
 * @param res - Response object
 */
export const getAllSymbols = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT DISTINCT tradingsymbol 
         FROM trading 
         ORDER BY tradingsymbol ASC`
      );

      res.json({
        success: true,
        symbols: result.rows.map(r => r.tradingsymbol),
        count: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[ERROR] Fetching symbols:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch symbols",
      error: err.message
    });
  }
};

/**
 * Get price data for a specific symbol
 * @route GET /api/historical/price/:symbol
 * @param req - Request object with symbol in params
 * @param res - Response object
 */
export const getPriceData = async (req, res) => {
  try {
    let { symbol } = req.params;

    // Decode URL encoded symbol (e.g., "NIFTY%2050" -> "NIFTY 50")
    symbol = decodeURIComponent(symbol);

    console.log(`[DEBUG] Fetching price for symbol: "${symbol}"`);

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
      tradingsymbol,
        close as ltp,
        change,
        volume,
        date
        FROM trading
        WHERE tradingsymbol = $1 AND interval = $2
        ORDER BY date DESC
        LIMIT 1`,
        [symbol, 'day']
      );

      if (result.rows.length === 0) {
        console.log(`[DEBUG] No price data found for symbol: "${symbol}"`);

        // Try to list available symbols for debugging
        const availableResult = await client.query(
          `SELECT DISTINCT tradingsymbol FROM trading LIMIT 10`
        );

        return res.status(404).json({
          success: false,
          message: `No price data found for symbol: ${symbol} `,
          availableSymbols: availableResult.rows.map(r => r.tradingsymbol)
        });
      }

      console.log(`[DEBUG] Found price data: `, result.rows[0]);

      res.json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[ERROR] Fetching price data:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch price data",
      error: err.message
    });
  }
};

/**
 * Get chart statistics for a symbol
 * @route GET /api/historical/stats/:symbol
 * @param req - Request object with symbol in params
 * @param res - Response object
 */
export const getChartStats = async (req, res) => {
  try {
    let { symbol } = req.params;

    // Decode URL encoded symbol
    symbol = decodeURIComponent(symbol);

    console.log(`[DEBUG] Calculating stats for symbol: "${symbol}"`);

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
      MAX(high) as highest,
        MIN(low) as lowest,
        FIRST_VALUE(open) OVER(ORDER BY date ASC) as open_price,
          LAST_VALUE(close) OVER(ORDER BY date DESC) as close_price,
            AVG(volume) as avg_volume,
            COUNT(*) as total_candles,
            MIN(date) as start_date,
            MAX(date) as end_date
        FROM trading
        WHERE tradingsymbol = $1 AND interval = $2
        LIMIT 1`,
        [symbol, 'day']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No data found for symbol: ${symbol} `,
        });
      }

      const stats = result.rows[0];
      res.json({
        success: true,
        data: {
          symbol,
          highestPrice: parseFloat(stats.highest),
          lowestPrice: parseFloat(stats.lowest),
          openPrice: parseFloat(stats.open_price),
          closePrice: parseFloat(stats.close_price),
          averageVolume: parseFloat(stats.avg_volume),
          totalCandles: stats.total_candles,
          startDate: new Date(stats.start_date).toISOString(),
          endDate: new Date(stats.end_date).toISOString()
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[ERROR] Calculating stats:", err);
    res.status(500).json({
      success: false,
      message: "Failed to calculate statistics",
      error: err.message
    });
  }
};

/**
 * Health check - verify database connection and data availability
 * @route GET /api/historical/health/check
 * @param req - Request object
 * @param res - Response object
 */
export const healthCheck = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM trading');
      const symbolsResult = await client.query('SELECT COUNT(DISTINCT tradingsymbol) as count FROM trading');

      res.json({
        success: true,
        message: "Database connected",
        totalRecords: result.rows[0].count,
        totalSymbols: symbolsResult.rows[0].count
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[ERROR] Database health check:", err);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: err.message
    });
  }
};
