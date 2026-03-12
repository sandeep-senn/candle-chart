# ⚡ Smart Order Logic: Line-by-Line Explanation

Ye document hamare application mein implemented **Smart Order (Entry + Target + Stop-Loss)** logic ko step-by-step samjhata hai.

---

## 1. Frontend: Smart Selection Logic (`TradingPanel.jsx`)

Jab aap `BUY` ya `SELL` select karte hain, toh system ko decide karna hota hai ki Target aur Stop-loss ka direction kya hoga.

### Auto-Suggestion Code:
```javascript
useEffect(() => {
  if (selectedCompany && selectedPrice && isMarket) {
    const ltp = selectedPrice.ltp;
    if (transactionType === "BUY") {
      // 🟢 BUY Case: Target upar (+2%), Stop-Loss neeche (-1%)
      if (!targetPrice) setTargetPrice((ltp * 1.02).toFixed(2)); 
      if (!stopLossPrice) setStopLossPrice((ltp * 0.99).toFixed(2)); 
    } else {
      // 🔴 SELL Case: Target neeche (-2%), Stop-Loss upar (+1%)
      if (!targetPrice) setTargetPrice((ltp * 0.98).toFixed(2));
      if (!stopLossPrice) setStopLossPrice((ltp * 1.01).toFixed(2));
    }
  }
}, [selectedCompany, transactionType, isMarket]);

```
**Explanation:**
- **Line 1-3:** Check karta hai ki Company selected hai aur Live Price aa raha hai ya nahi.
- **Line 5-7 (BUY):** Agar aap kharid rahe hain (BUY), toh profit tab hoga jab price badhega. Isliye Target ko `ltp * 1.02` (2% upar) set kiya gaya hai.
- **Line 8-11 (SELL):** Agar aap short sell rahe hain (SELL), toh profit tab hoga jab price girega. Isliye Target ko `ltp * 0.98` (2% neeche) set kiya gaya hai.

---

## 2. Backend: Order Routing (`order.controller.js`)

Controller decide karta hai ki order ko normal tarike se bhejna hai ya "Smart" process use karni hai.

```javascript
// req.body se data extract karna
const { ..., targetPrice, stopLossPrice, isSmartOrder } = req.body;

if (isSmartOrder) {
  // Agar flag true hai, toh 'placeSmartOrder' service ko call karo
  const result = await orderService.placeSmartOrder({
    exchange, symbol, transactionType, quantity, targetPrice, stopLossPrice ...
  });
  return res.status(200).json(result);
}
```

---

## 3. Core Engine: GTT OCO Implementation (`orderService.js`)

Ye sabse important part hai jahan actual "One-Cancels-the-Other" (OCO) magic hota hai.

### Step A: Entry Order Placement
```javascript
const entryOrderId = await kite.placeOrder("regular", {
  exchange,
  tradingsymbol: symbol,
  transaction_type: transactionType, // BUY or SELL
  quantity: Number(quantity),
  order_type: orderType, // MARKET or LIMIT
  ...
});
```
- Pehle system main order (Entry) bhejta hai. Jab tak shares nahi aayenge, hum unhe bech (Exit) nahi sakte.

### Step B: GTT OCO Setup (Automatic Exit)
```javascript
const exitTransactionType = transactionType === "BUY" ? "SELL" : "BUY";

const gttParams = {
  type: "two-leg", // Leg 1: Target, Leg 2: Stop-Loss
  condition: {
    exchange,
    tradingsymbol: symbol,
    last_price: Number(targetPrice || stopLossPrice),
  },
  orders: [
    { /* Leg 1: Target Order Details */ },
    { /* Leg 2: Stop-Loss Order Details */ }
  ]
};

const gttResp = await kite.placeGTT(gttParams);
```

**Line-by-Line Logic:**
1. **`exitTransactionType`**: Agar pehle Buy kiya tha, toh Exit ke liye Sell karna hoga (aur vice versa).
2. **`type: "two-leg"`**: Ye broker ko batata hai ki ye do orders ka joda hai.
3. **Trigger Logic**: GTT (Good Till Triggered) server par baitha rehta hai aur 1 saal tak valid rehta hai.
4. **The "OCO" Magic**: Broker ke system mein in dono legs (Target & SL) ke beech ek link hota hai. Jaise hi ek leg ka price touch hota hai, broker turant dusre leg ko delete/cancel kar deta hai.

---

## Summary Summary Table

| Requirement | Frontend Value | Backend Service | Strategy Used |
| :--- | :--- | :--- | :--- |
| **Buy Profit (15)** | `targetPrice` | Leg 1 of GTT | Limit Order |
| **Buy Safety (7)** | `stopLossPrice` | Leg 2 of GTT | Stop-Loss Trigger |
| **Sell Profit (7)** | `targetPrice` | Leg 1 of GTT | Limit Order |
| **Sell Safety (15)**| `stopLossPrice` | Leg 2 of GTT | Stop-Loss Trigger |

---
