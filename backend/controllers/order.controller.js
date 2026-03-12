import sessionManager from "../clients/sessionManager.js";
import orderService from "../services/orderService.js";

/**
 * Middleware-like helper to get kite instance or return error
 */
const getKiteInstance = (req, res) => {
  const userId = req.user?.id;
  const kite = sessionManager.getKite(userId);
  if (!kite) {
    res.status(403).json({ success: false, message: "Broker session not active. Please connect Kite." });
    return null;
  }
  return kite;
};

/* ================= PLACE ORDER ================= */
export const placeOrder = async (req, res) => {
  const kite = getKiteInstance(req, res);
  if (!kite) return;

  try {
    const {
      exchange,
      symbol,
      transactionType,
      product,
      orderType,
      quantity,
      price,
      triggerPrice,
      targetPrice,
      stopLossPrice,
      isSmartOrder
    } = req.body;

    if (isSmartOrder) {
      const result = await orderService.placeSmartOrder(kite, {
        exchange,
        symbol,
        transactionType,
        product,
        orderType,
        quantity,
        price,
        targetPrice,
        stopLossPrice
      });
      return res.status(200).json(result);
    }

    if (transactionType === "SELL" && (orderType === "SL" || orderType === "SL-M")) {
      const result = await orderService.placeSellStopLoss(kite, {
        userId: req.user.id,
        symbol,
        exchange,
        orderType,
        quantity: Number(quantity),
        triggerPrice: Number(triggerPrice),
        limitPrice: price ? Number(price) : undefined
      });

      if (!result.success) return res.status(400).json(result);
      return res.status(200).json(result);
    }

    const orderId = await kite.placeOrder("regular", {
      exchange,
      tradingsymbol: symbol,
      transaction_type: transactionType,
      quantity,
      product,
      order_type: orderType,
      price: orderType === "LIMIT" ? price : undefined,
      trigger_price: (orderType === "SL" || orderType === "SL-M") ? triggerPrice : undefined,
      validity: "DAY",
    });

    res.status(200).json({ success: true, orderId });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= GET ORDERS ================= */
export const getOrders = async (req, res) => {
  const kite = getKiteInstance(req, res);
  if (!kite) return;

  try {
    const orders = await kite.getOrders();
    const formatted = orders.map(o => ({
      ...o,
      ui_status: o.status === "COMPLETE" ? o.transaction_type : (o.status === "OPEN" || o.status === "TRIGGER PENDING" ? "PENDING" : "OTHER"),
    }));
    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= GET POSITIONS ================= */
export const getPositions = async (req, res) => {
  const kite = getKiteInstance(req, res);
  if (!kite) return;

  try {
    const positions = await kite.getPositions();
    res.status(200).json({ success: true, data: positions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= GET HOLDINGS ================= */
export const getHoldings = async (req, res) => {
  const kite = getKiteInstance(req, res);
  if (!kite) return;

  try {
    const holdings = await kite.getHoldings();
    res.status(200).json({ success: true, data: holdings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= Cancel Order ================ */
export const cancelOrder = async (req, res) => {
  const kite = getKiteInstance(req, res);
  if (!kite) return;

  try {
    const { orderId, variety } = req.body;
    const response = await kite.cancelOrder(variety, orderId);
    res.status(200).json({ success: true, message: "Order cancelled successfully", data: response });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
