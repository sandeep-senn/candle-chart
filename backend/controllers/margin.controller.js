import kite from "../clients/kiteClient.js";

export const calculateMargin = async (req, res) => {
  try {
    const {
      exchange,
      symbol,
      transactionType,
      product,
      orderType,
      quantity,
      price,
      triggerPrice
    } = req.body;

    // 🔥 Prevent index margin calculation
    if (exchange === "NSE" && symbol.includes("NIFTY")) {
      return res.status(400).json({
        success: false,
        message: "NIFTY index is not directly tradable. Use NFO futures/options."
      });
    }

    const marginResp = await kite.orderMargins([
      {
        exchange,
        tradingsymbol: symbol,
        transaction_type: transactionType,
        quantity: Number(quantity),
        product,
        order_type: orderType,
        price: (orderType === "LIMIT" || orderType === "SL") ? Number(price) : undefined,
        trigger_price: (orderType === "SL" || orderType === "SL-M") ? (Number(triggerPrice) || undefined) : undefined
      }
    ]);

    if (!marginResp || !marginResp.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid instrument or margin not available"
      });
    }

    const requiredMargin = marginResp[0]?.total || 0;

    const funds = await kite.getMargins();

    // 🔥 Safer margin extraction
    const availableMargin =
      funds?.equity?.available?.cash || 0;

    res.json({
      success: true,
      requiredMargin,
      availableMargin,
      allowed: requiredMargin <= availableMargin
    });

  } catch (error) {
    console.error("MARGIN ERROR:", error.response?.data || error.message);

    res.status(400).json({
      success: false,
      message: error.response?.data?.message || "Margin calculation failed"
    });
  }
};
