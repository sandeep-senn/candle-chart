import smartApiSessionManager from "../clients/SmartApiSessionManager.js";
import axios from "axios";

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
    const angelSession = await smartApiSessionManager.getOrRestoreSession(userId);
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
        const payload = {
            positions: [{
                exchange,
                qty: Number(quantity),
                price: orderType === "MARKET" ? 0 : Number(price) || 0,
                productType: productMap[product] || product,
                token,
                tradeType: transactionType,
                orderType: orderType
            }]
        };

        const config = {
            method: 'post',
            url: 'https://apiconnect.angelone.in/rest/secure/angelbroking/margin/v1/batch',
            headers: { 
                'X-PrivateKey': angelSession.apiKey, 
                'Accept': 'application/json', 
                'X-SourceID': 'WEB', 
                'X-ClientLocalIP': '192.168.1.1', 
                'X-ClientPublicIP': '106.193.147.98', 
                'X-MACAddress': 'fe80::216e:6507:4b90:3719', 
                'X-UserType': 'USER', 
                'Authorization': `Bearer ${angelSession.jwtToken}`, 
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(payload)
        };

        const { data: marginRes } = await axios(config);
        const response = marginRes;

        const rms = await smartApi.getRMS();
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
