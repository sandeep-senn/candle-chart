# SELL Stop-Loss Backend Validation Architecture

This document outlines the backend validation logic and architecture for placing SELL Stop-Loss (SL & SL-M) orders in the trading panel.

## 1. Backend Flow (Step-by-Step)

The flow ensures high integrity by re-fetching fresh data and preventing race conditions.

1.  **Request Reception**: Controller receives `symbol`, `quantity`, `triggerPrice`, `limitPrice`, etc.
2.  **Concurrency Locking**: Acquire an in-memory or distributed lock for the `userId:symbol` combination. This prevents multiple SL orders from being processed simultaneously, which could lead to over-selling a position.
3.  **Fresh Data Fetching**: Fetch the latest **Positions** and **Market Quotes** (LTP, circuit limits) directly from the Broker API (e.g., Zerodha Kite).
4.  **Position Verification**:
    *   Find the symbol in the `net` positions.
    *   Validate that a BUY position exists (`quantity > 0`).
    *   Validate that the requested `quantity` is less than or equal to the `available quantity`.
5.  **Market Price Validation**:
    *   **Trigger Price Check**: Ensure `triggerPrice < Current Market Price (CMP)`. Placing a SELL SL above CMP is invalid.
    *   **Circuit Limit Check**: Ensure `triggerPrice` (and `limitPrice` if SL) is between the exchange's `lower_circuit` and `upper_circuit`.
6.  **Risk Management Validation**:
    *   Calculate the risk threshold (e.g., 10% below `average_buy_price`).
    *   Reject the order if the `triggerPrice` is lower than this threshold.
7.  **Order Type Specific Validation**:
    *   **SL-M**: Only `triggerPrice` is validated.
    *   **SL (Limit)**: Ensure `limitPrice <= triggerPrice` (for SELL). This ensures that if the trigger is hit, the limit order is placed at or below the trigger price to increase the chance of execution.
8.  **Order Execution**: Call the Broker API `placeOrder` method.
9.  **Lock Release**: Release the concurrency lock.
10. **Response**: Send a structured JSON response (success or error with code).

## 2. Edge Case Handling

| Edge Case | Handling Strategy |
| :--- | :--- |
| **Sudden Market Gap Down** | We fetch fresh LTP immediately before validation. If LTP is already below the `triggerPrice`, the order is rejected. |
| **No Open Position** | Backend explicitly checks the `net` positions from the API. If no buy position is found, order is rejected. |
| **Partial Quantity Sell** | The validation compares `requested quantity` against `pos.quantity`. The user can place multiple SLs for parts of their position as long as the total doesn't exceed holding. |
| **Race Conditions** | Handled via a lock-per-symbol. This prevents two rapid clicks from placing two SL orders for the same holding. |
| **Circuit Limits** | Positions are often untradable outside these limits. Backend rejects trigger prices outside the current bucket's bounds. |

## 3. Error Response Structure

We use a standard structure for consistent frontend handling:

```json
{
  "success": false,
  "error": "Validation Failed: Trigger price (2450) must be less than Current Market Price (2465.5).",
  "code": "VALIDATION_ERROR"
}
```

## 4. Production-Grade Implementation Notes

*   **Service Layer Architecture**: Logic is abstracted into `OrderService.js`. This keeps the Controller thin and makes the validation logic reusable (e.g., for automated trailing stop-losses).
*   **Race Condition Prevention**: In a multi-node production environment, replace the local Map-based `locks` with **Redis Redlock**. This ensures consistency across multiple server instances.
*   **Data Integrity**: Never trust the `last_price` or `average_price` passed from the frontend. Always re-fetch from the source of truth (Broker API) at the moment of validation.
*   **Audit Logging**: In production, every validation failure and successful placement should be logged with the snapshot of data used (LTP, position size) for later debugging of "why was my order rejected?".
