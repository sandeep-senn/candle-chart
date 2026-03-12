# ⚡ Trading Panel: Order Execution Scenarios & Use-Cases

This document outlines every possible buy and sell case supported by the current trading panel, including **Market**, **Limit**, and **Smart (OCO)** orders.

---

## 🟢 BUY SCENARIOS (Going Long)

### 1. Simple Market Buy
*   **Scenario**: You want to enter a trade immediately at whatever the current sellers are asking.
*   **Inputs**:
    *   **Symbol**: `RELIANCE`
    *   **Transaction**: `BUY`
    *   **Entry Price**: `⚡ Market Price`
    *   **Quantity**: `10`
*   **Result**: Order executes instantly at the best available price. Use this for fast entries in highly liquid stocks.

### 2. Strategic Limit Buy
*   **Scenario**: You think the current price (₹2500) is too high. You only want to buy if it dips to ₹2480.
*   **Inputs**:
    *   **Symbol**: `RELIANCE`
    *   **Transaction**: `BUY`
    *   **Entry Price**: `🎯 Custom Price` -> `2480.00`
    *   **Quantity**: `10`
*   **Result**: Order stays in "PENDING" status. It only executes if the market price touches ₹2480.

### 3. Smart "Set & Forget" Buy (Entry + Target + SL)
*   **Scenario**: You want to buy at market price, but also want the system to automatically sell and book profit at +2% OR exit at -1% loss without you watching the screen.
*   **Inputs**:
    *   **Entry**: `⚡ Market Price` (e.g., ₹2500)
    *   **Target (Profit)**: `2550.00` (+₹50)
    *   **Stop-Loss (Risk)**: `2475.00` (-₹25)
*   **Result**: 
    1.  Main Buy order executes.
    2.  System creates a **GTT OCO** (One-Cancels-Other) leg.
    3.  If price hits ₹2550 -> You book profit, and the SL order is **Auto-Cancelled**.
    4.  If price hits ₹2475 -> You exit with minimal loss, and the Target order is **Auto-Cancelled**.

---

## 🔴 SELL SCENARIOS (Exiting or Shorting)

### 1. Market Exit (Square Off)
*   **Scenario**: You have 10 shares of `TCS` in your positions and you want to get out immediately because of bad news.
*   **Inputs**:
    *   **Transaction**: `SELL`
    *   **Entry Price**: `⚡ Market Price`
    *   **Quantity**: `10`
*   **Result**: Your position becomes **0**. You have realized your P&L.

### 2. Intraday Short Selling (Sell First, Buy Later)
*   **Scenario**: You think `SBIN` (currently ₹700) will crash today. You want to sell it high and buy it back lower.
*   **Inputs**:
    *   **Product**: `MIS` (Intraday)
    *   **Transaction**: `SELL`
    *   **Entry Price**: `⚡ Market Price` (at ₹700)
    *   **Quantity**: `50`
*   **Result**: Your position shows **Quantity: -50**. If the price drops to ₹690, you "Buy" to close, making ₹10 per share profit.

### 3. Smart Short with Auto-Cover
*   **Scenario**: Short sell at ₹700, target profit at ₹680, and protect yourself if it goes up to ₹710.
*   **Inputs**:
    *   **Transaction**: `SELL`
    *   **Target (Profit)**: `680.00` (Lower than entry)
    *   **Stop-Loss (Risk)**: `710.00` (Higher than entry)
*   **Result**: If the stock falls, you win. If it rises, you are protected by the auto-stop.

---

## 📊 POSITION QUANTITY EXPLAINED

| Quantity | Meaning | Action Needed |
| :--- | :--- | :--- |
| **+10** | **Long Position**: You own 10 shares. | Sell 10 to exit. |
| **-10** | **Short Position**: You owe 10 shares. | Buy 10 to exit (cover). |
| **0** | **Closed**: Trade is finished. | None (Profit/Loss is booked). |

---

## ⚠️ CRITICAL RULES & FAILURES

*   **Insufficient Margin**: If your "Required Margin" > "Available Margin", the order will be rejected.
*   **Product Mismatch**: You cannot sell `CNC` (Long term) shares if you don't actually have them in your holdings. Use `MIS` for intraday trading of stocks you don't own.
*   **Circuit Limits**: If you set a Target or SL price outside the stock's upper/lower circuit for the day, the exchange will reject the order.
*   **Smart Order Cancellation**: In a Smart Order, if you manually cancel the "Entry" order before it fills, the Target/SL legs will never trigger.
