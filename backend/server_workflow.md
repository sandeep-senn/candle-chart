# Workflow of `server.js`

1.  **Initialization**:
    *   Imports libraries (express, cors, socket.io, mongoose, etc.).
    *   Sets up Express app with CORS.
    *   Creates HTTP server and Socket.IO server.

2.  **Route Setup**:
    *   Registers routes: `/api/companies`, `/api/margin`, `/api/order`, `/api/auth`.

3.  **Kite Authentication**:
    *   Handles Kite Broker login flow.
    *   `/api/login`: Redirects to Kite login.
    *   `/broker-login`: Callback URL that generates session and saves access token.

4.  **Historical Data Loading (`/api/loadHistoricalData`)**:
    *   **Important**: This endpoint uses a specific function `loadNiftyHistorical` (lines 138-428).
    *   It **only** loads data for **"NIFTY 50"** (hardcoded).
    *   It fetches 2 years of data.
    *   It calculates indicators (SMA, RSI, MACD, etc.) **locally** inside this file (duplicating logic from `indicatorEngine.js`).
    *   It inserts/updates data into the `trading` table.
    *   **Note**: This is likely why your general data loading wasn't working if you were hitting this endpoint - it's restricted to Nifty 50.

5.  **Profile API (`/api/profile`)**:
    *   Returns logged-in user details.

6.  **Instrument Loading (`loadInstruments`)**:
    *   Fetches NSE/BSE Equity instruments from Kite.
    *   Stores them in memory using `instrumentStore.js`.

7.  **Real-time Subscription (`/api/subscribe`)**:
    *   Allows frontend to subscribe to live ticks for specific tokens.

8.  **Server Startup (`startApp`)**:
    *   Loads instruments.
    *   Starts the Ticker (WebSocket).
    *   Starts the HTTP server on port 3000.
