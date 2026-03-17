import smartApiSessionManager from "../clients/SmartApiSessionManager.js";

/**
 * Helper to get Angel One smartApi instance or return error
 */
const getAngelInstance = (req, res) => {
  const userId = req.user?.id || 1;
  const session = smartApiSessionManager.getSession(userId);
  if (!session || !session.smartApi) {
    res.status(403).json({ success: false, message: "Angel One session not active. Please Login." });
    return null;
  }
  return session.smartApi;
};

/* ================= PLACE ORDER ================= */
export const placeOrder = async (req, res) => {
  const smartApi = getAngelInstance(req, res);
  if (!smartApi) return;

  try {
    const {
      exchange,
      symbol,
      transactionType,
      product, // INTRADAY, DELIVERY, CARRYFORWARD, MARGIN
      orderType, // MARKET, LIMIT
      quantity,
      price,
      triggerPrice,
      token,
      variety = "NORMAL"
    } = req.body;

    // Map Product Types to Angel One Internal Strings
    // INTRADAY -> MIS, DELIVERY -> CNC, CARRYFORWARD -> NRML, MARGIN -> MARGIN
    const productMap = {
        "INTRADAY": "MIS",
        "DELIVERY": "CNC",
        "CARRYFORWARD": "NRML",
        "MARGIN": "MARGIN"
    };

    // Angel One placeOrder params mapping (Strictly lowercase as per docs)
    const orderParams = {
      variety: variety,
      tradingsymbol: symbol,
      symboltoken: token,
      transactiontype: transactionType,
      exchange: exchange,
      ordertype: orderType,
      producttype: productMap[product] || product,
      duration: "DAY",
      price: price ? String(price) : "0",
      squareoff: "0",
      stoploss: "0",
      quantity: String(quantity)
    };

    if (triggerPrice) {
        orderParams.triggerprice = String(triggerPrice);
    }

    const response = await smartApi.placeOrder(orderParams);

    if (response.status && response.data) {
        res.status(200).json({ success: true, orderId: response.data.orderid });
    } else {
        res.status(400).json({ success: false, message: response.message || "Order placement failed at broker side" });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= GET ORDERS ================= */
export const getOrders = async (req, res) => {
  const smartApi = getAngelInstance(req, res);
  if (!smartApi) return;

  try {
    const response = await smartApi.getOrderBook();
    if (response.status) {
        const orders = response.data || [];
        const formatted = orders.map(o => ({
            ...o,
            tradingsymbol: o.tradingsymbol,
            status: o.status,
            ui_status: o.status === "complete" ? o.transactiontype : (o.status === "open" ? "PENDING" : "OTHER"),
        }));
        res.status(200).json({ success: true, data: formatted });
    } else {
        res.status(400).json({ success: false, message: response.message });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= GET POSITIONS ================= */
export const getPositions = async (req, res) => {
  const smartApi = getAngelInstance(req, res);
  if (!smartApi) return;

  try {
    const response = await smartApi.getPosition();
    if (response.status) {
        res.status(200).json({ success: true, data: response.data || [] });
    } else {
        res.status(400).json({ success: false, message: response.message });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= GET HOLDINGS ================= */
export const getHoldings = async (req, res) => {
  const smartApi = getAngelInstance(req, res);
  if (!smartApi) return;

  try {
    const response = await smartApi.getHolding();
    if (response.status) {
        res.status(200).json({ success: true, data: response.data || [] });
    } else {
        res.status(400).json({ success: false, message: response.message });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= Cancel Order ================ */
export const cancelOrder = async (req, res) => {
  const smartApi = getAngelInstance(req, res);
  if (!smartApi) return;

  try {
    const { orderId, variety = "NORMAL" } = req.body;
    const response = await smartApi.cancelOrder({
        variety,
        orderid: orderId
    });

    if (response.status) {
        res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } else {
        res.status(400).json({ success: false, message: response.message });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
