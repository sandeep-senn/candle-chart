# Backend Architecture & Workflow

This document outlines the detailed architecture, file responsibilities, and data flow of the backend system.

---

## 🏗️ **Core Initialization & Server**

### **`server.js` (Entry Point)**
The central hub of the application.
- **Initialization**: Sets up the Express app, activates CORS, and creates the HTTP server.
- **Socket.IO**: Attaches a Socket.IO server to the HTTP instance for real-time bidirectional communication.
- **Routing**: Registers all API routes (`/api/companies`, `/api/historical`, `/api/order`, etc.).
- **Startup Logic (`startApp`)**:
    - Triggers `run()` from `scripts/run_historical_load.js` immediately to ensure data freshness.
    - Starts the server on port 3000.
- **Authentication**:
    - **OAuth Flow**: Handles `/api/login` and `/broker-login` to capture the Kite access token.
    - **Token Management**: Uses `saveAccessToken` / `loadAccessToken` to persist sessions.
### **`config/`**
- **`db.js`**: Manages the PostgreSQL connection pool (`trading_db`).
- **`companies.js`**: Static registry of instrument tokens and symbols (e.g., NIFTY 50, RELIANCE) used for filtering data.

---

## ⚙️ **Services (The Engine Room)**

This directory (`/services`) contains the core business logic. This is where raw data is turned into valuable insights.

### **1. `historicalLoader.js` (The Data Pipeline)**
**Purpose**: robustly fetches standard historical data (Open, High, Low, Close) from the broker and saves it to the database.

*   **`retryWithBackoff(fn)`**:
    *   **Concept**: APIs fail. Networks blink.
    *   **Logic**: If a request fails, it doesn't give up. It waits 200ms, then 400ms, then 800ms (exponential), adding a bit of randomness ("jitter") to prevent hammering the server.
*   **`fetchChunkedHistorical(...)`**:
    *   **Concept**: You can't ask for 5 years of data in one go; the request will time out.
    *   **Logic**: It breaks the requested time range (e.g., 2020-2025) into 1-year chunks. It fetches 2020, then 2021, stitches them together into a single array, and returns it.
*   **`processInstrument(...)`**:
    *   **Step 1 (Check DB)**: Runs `SELECT MAX(date)` to see what we already have. If we have data up to yesterday, we only fetch *today's* data.
    *   **Step 2 (Fetch)**: Calls `fetchChunkedHistorical` for the missing range.
    *   **Step 3 (Calculate)**: Passes the raw candles to `indicatorEngine.js` to add RSI, MACD, etc.
    *   **Step 4 (Save)**: Uses a **Transaction** (`BEGIN`...`COMMIT`). This means if saving the candles works but saving the indicators fails, *everything* is undone. This keeps the database clean.
*   **`processAllInstruments(...)`**:
    *   **Concept**: Concurrency Control.
    *   **Logic**: We have 200+ stocks. If we fire 200 requests at once, we crash. This function uses a "Semaphore" to ensure only 3-5 stocks are processed at the exact same time.

### **2. `indicatorEngine.js` (The Analyst)**
**Purpose**: Takes simple price data and applies mathematical formulas to find trends.

*   **`calculateIndicators(candles)`**:
    *   **Input**: Array of `{ open, high, low, close, volume }`.
    *   **Processing**:
        *   **SMA/EMA**: Loops through periods [3, 5... 200]. Computes the average price over the last N days.
        *   **RSI (Relative Strength Index)**: Measures if a stock is "overbought" (>70) or "oversold" (<30).
        *   **MACD (Moving Average Convergence Divergence)**: Calculates the difference between fast (12-day) and slow (26-day) moving averages to spot momentum shifts.
        *   **Bollinger Bands**: Calculates a moving average and "Standard Deviations" above/below it. Price touching the top band often means it's expensive.
    *   **Output**: The original array, but every object now has massive detail: `{ ..., rsi_14: 65.4, sma_200: 1200.5, ... }`.

### **3. `service.js` (Real-Time Aggregator)**
**Purpose**: Handles live data that comes in sub-second ticks and formats it into usable "candles".

*   **`processTick(tick)`**:
    *   **Trigger**: Called every time the WebSocket receives a price update.
    *   **Logic**:
        *   It determines which "Bucket" the time falls into (e.g., the 9:15-9:20 bucket).
        *   If it's a new bucket, it saves the *previous* finished candle to the DB.
        *   It updates the *current* candle in memory:
            *   `High = Max(Current High, New Price)`
            *   `Low = Min(Current Low, New Price)`
            *   `Close = New Price`

### **4. `futureLoader.js` & `instrumentLoader.js` (The Filters)**
**Purpose**: Identify *which* stocks we care about from the thousands available.

*   **`loadFutures`**:
    *   Fetches the massive list of all instruments.
    *   Filters for `instrument_type === "FUT"` (Futures).
    *   Keeps only those that match our watchlist (e.g., Reliance, TCS).
*   **`loadSpotTokens`**:
    *   We need the "Instrument Token" (e.g., `738561`) to subscribe to live feeds.
    *   This file creates a map: `738561` -> `RELIANCE`, so we can show human-readable names on the UI.

---

## 🔄 **Clients & Scripts**

### **`clients/Ticker.js` (Real-Time Stream)**
- **`startTicker`**: Connects to the Kite Ticker WebSocket.
- **`on('ticks')`**:
    1. Maps incoming Token IDs to Symbols.
    2. Broadcasts data immediately to the frontend via `io.emit`.
- **`subscribeToTokens`**: API for the frontend to dynamically register interest in specific stocks.

### **`scripts/run_historical_load.js`**
- **`run`**: Startup script that identifies F&O stocks, finds their underlying Equity symbols, and triggers the full historical data fetch/analysis pipeline.

---

## 🎮 **Controllers (API Logic)**

### **`controllers/historical.controller.js`**
- **`getHistoricalData`**: Fetches candle data with pagination support (lazy loading).
- **`getPriceData`**: Retrieves the single latest price record.
- **`getChartStats`**: Computes summary statistics (High/Low bounds, Avg Volume) for a stock's entire history.

### **`controllers/order.controller.js`**
- **`placeOrder`**: Routes Buy/Sell commands to the Broker API.
- **`getOrders` / `getPositions` / `getHoldings`**: Retrieves portfolio state and formats it (P&L coloring, status mapping) for the UI.

### **`controllers/margin.controller.js`**
- **`calculateMargin`**: Pre-trade check that queries the broker for required margin vs. available cash, returning an `allowed` boolean.
