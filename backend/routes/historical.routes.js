import express from "express";
import {
  getHistoricalData,
  getAllSymbols,
  getPriceData,
  getChartStats,
  healthCheck
} from "../controllers/historical.controller.js";

const router = express.Router();

// Get historical data for a symbol
router.get("/:symbol", getHistoricalData);

// Get all available symbols
router.get("/list/symbols", getAllSymbols);

// Get latest price for a symbol
router.get("/price/:symbol", getPriceData);

// Get chart statistics for a symbol
router.get("/stats/:symbol", getChartStats);

// Health check
router.get("/health/check", healthCheck);

export default router;
