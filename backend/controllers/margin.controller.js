import smartApiSessionManager from "../clients/SmartApiSessionManager.js";

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
      triggerPrice,
      token
    } = req.body;

    const userId = req.user?.id || 1;

    // 1. Check for Angel One Session
    const angelSession = smartApiSessionManager.getSession(userId);
    if (!angelSession || !angelSession.smartApi) {
        return res.status(401).json({
            success: false,
            message: "No active Angel One session found. Please login to your broker."
        });
    }

    const smartApi = angelSession.smartApi;
    
    // Map product types for Margin API
    const productMap = {
        "INTRADAY": "INTRADAY",
        "DELIVERY": "DELIVERY",
        "CARRYFORWARD": "CARRYFORWARD",
        "MARGIN": "MARGIN"
    };

    try {
        const response = await smartApi.marginApi({
            positions: [{
                exchange,
                qty: Number(quantity),
                price: orderType === "MARKET" ? 0 : Number(price),
                productType: productMap[product] || product,
                token,
                tradeType: transactionType,
                orderType: orderType
            }]
        });

        const rms = await smartApi.getRMSLimit();
        const availableMargin = rms.status ? parseFloat(rms.data.availablecash) : 0;

        if (response.status && response.data) {
            return res.json({
                success: true,
                broker: "AngelOne",
                requiredMargin: response.data.totalMarginRequired,
                availableMargin,
                allowed: availableMargin >= response.data.totalMarginRequired,
                components: response.data.marginComponents
            });
        } else {
            throw new Error(response.message || "Failed to fetch margin from broker");
        }
    } catch (e) {
        console.error("MARGIN API ERROR:", e.message);
        res.status(400).json({
            success: false,
            message: e.message || "Could not calculate margin"
        });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
