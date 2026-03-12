# Project Implementation Guide: Candle Trading Dashboard

This document provides a comprehensive breakdown of the **Candle** trading platform's frontend architecture and the implementation logic for its core features.

---

## 1. Core Architecture & Routing (`App.jsx`)
The application is built with **React** and **React Router DOM**.
- **Protected Routes**: Uses a `ProtectedRoute` component to ensure only authenticated users can access trading features.
- **Global Layout**: The `Navbar` and `ToastContainer` are placed outside the `Routes` to provide a consistent header and notification system across all pages.

---

## 2. Real-Time Data Synchronization
Real-time features (prices, P&L updates) are implemented using **Socket.io**.
- **Centralized Socket**: Components connect to a WebSocket server (typically on port 3000) to receive `price-update` events.
- **Subscription Model**: When a user searches for a symbol or views their positions, the frontend explicitly calls a `/subscribe` API to tell the backend which tokens to stream.

---

## 3. Dynamic Browser Tab Titles (The "Title Change" Task)
Implemented using the `useEffect` hook across various components to improve User Experience by reflecting the current application state in the browser tab.

### Logic by Page:
- **Orders**: Sets title to `"Order | Trading Panel"` on mount.
- **Positions**: Sets title to `"Position | Trading Panel"` on mount.
- **Holdings**: Sets title to `"Holding | Trading Panel"` on mount.
- **Dashboard**: Sets title to `"Dashboard | Trading Panel"`.
- **History Dashboard**: A more complex implementation that updates the title dynamically based on the searched symbol and its **live LTP (Last Traded Price)**.
- **Trading Panel**: Updates the title to `"Trade - [Symbol]"` when a company is selected for trading.

---

## 4. Key Page Functionalities

### 🛡️ History Dashboard (`HistoryDashboard.jsx`)
This is the most complex component, handling advanced charting.
- **Charting**: Uses `lightweight-charts` by TradingView.
- **Infinite Scrolling**: Implements a "lazy loading" trigger in the chart's `timeScale` to fetch older historical data from the API when the user scrolls back in time.
- **Indicator Engine**: A dynamic system that calculates and overlays technical indicators (SMA, EMA, RSI, MACD, etc.) onto the chart.
- **Legend & Crosshair**: Syncs with mouse movements to show OHLC data and indicator values in a custom legend overlay.

### ⚡ Smart Trading Panel (`TradingPanel.jsx`)
Streamlines order entry with intelligent defaults.
- **Smart Order Logic**: Allows users to set Entry, Target, and Stop-Loss prices simultaneously.
- **Margin Calculator**: Automatically calls the `/margin` API whenever the symbol, quantity, or price changes to show real-time affordability.
- **Search with Debounce**: Implements a debounced search to find trading symbols without overloading the backend API.

### 🧺 Basket Orders (`BasketOrders.jsx`)
Allows managing groups of orders for bulk execution.
- **CRUD Operations**: Users can create baskets, add multiple orders to them (Buy/Sell, MIS/CNC), and edit them.
- **Total Margin Aggregation**: Fetches the combined margin required for all orders in a basket.
- **Bulk Execution**: Sends a single request to the backend to execute all orders in the basket sequentially, handling partial successes/failures.

### 📊 Positions & Holdings
- **Positions (`Positions.jsx`)**: Displays active trades. It uses a hybrid approach: polling the `/getPositions` API for the "Source of Truth" and using WebSockets to update the **Floating P&L** locally in real-time.
- **Holdings (`Holdings.jsx`)**: Shows long-term portfolio data, sorted by total P&L performance.

---

## 5. UI/UX Design System
- **Styling**: Utilizes **Tailwind CSS** for a responsive, modern interface with a "premium" feel (glassmorphism, soft gradients, and rounded layouts).
- **Animations**: Uses **Framer Motion** for smooth transitions in lists (Orders, Positions) and modal entries.
- **State Feedback**: Consistent use of `loading` states (shimmer effects/spinners) and `Toast` notifications for every critical action (Order success, Login error, etc.).

---

## 6. API Integration Layer (`api/api.js`)
A centralized **Axios** instance is used for all HTTP requests, handling:
- Base URL configuration.
- Adding Authorization tokens (JWT) to every request header.
- Global error handling for 401 (Unauthorized) responses.

---

## 7. Technical Deep Dive: Key Functions

### `fetchHistory` (in `HistoryDashboard.jsx`)
Handles data retrieval for the chart. It supports two modes:
1.  **Initial Load**: Fetches the most recent 100 candles.
2.  **Lazy Load**: Using an `earliestDateRef`, it requests data older than the currently displayed range when the user scrolls left. This ensures the chart remains performant by only loading data as needed.

### `calculateMargin` (in `TradingPanel.jsx`)
Triggered by a `useEffect` that watches dependencies like `quantity`, `price`, and `product`. It makes an async POST request to the `/margin` endpoint. The UI uses the `margin.allowed` boolean from the response to visually enable/disable the "Trade" button, preventing invalid orders from being sent.

### `handlePriceUpdate` (in `Positions.jsx`)
This function runs whenever a WebSocket event is received. Instead of re-fetching everything, it maps through the existing `positions` state and calculates a **visual approximation of P&L** locally:
```javascript
const newPnl = (ltp - p.average_price) * p.quantity;
```
This gives the user instant feedback on market movement between API polling intervals.

### `placeSmartOrder` (in `TradingPanel.jsx`)
A robust wrapper for order placement. It constructs a single payload containing entry parameters and optional "Target" and "StopLoss" prices. It handles loading states and provides UI feedback via `react-toastify`.
