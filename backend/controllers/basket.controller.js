import pool from "../config/db.js";
import smartApiSessionManager from "../clients/SmartApiSessionManager.js";
import { findTokenBySymbol } from "../services/instrumentService.js";

// Helper to get Angel One instance
const getAngelInstance = (userId) => {
    const session = smartApiSessionManager.getSession(userId);
    return session ? session.smartApi : null;
};

// --- BASKET MANAGEMENT ---

// 1. Get all baskets for the user
export const getBaskets = async (req, res) => {
    try {
        const userId = req.user.id || 1;
        const result = await pool.query("SELECT * FROM baskets WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch baskets" });
    }
};

// 2. Create a new basket
export const createBasket = async (req, res) => {
    try {
        const userId = req.user.id || 1;
        const { name } = req.body;

        if (!name) return res.status(400).json({ message: "Basket name is required" });

        const result = await pool.query(
            "INSERT INTO baskets (user_id, name) VALUES ($1, $2) RETURNING *",
            [userId, name]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create basket" });
    }
};

// 3. Delete a basket
export const deleteBasket = async (req, res) => {
    try {
        const userId = req.user.id || 1;
        const { id } = req.params;

        // Check ownership
        const check = await pool.query("SELECT * FROM baskets WHERE id = $1 AND user_id = $2", [id, userId]);
        if (check.rows.length === 0) return res.status(404).json({ message: "Basket not found" });

        await pool.query("DELETE FROM baskets WHERE id = $1", [id]);
        res.json({ message: "Basket deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete basket" });
    }
};

// --- ORDER MANAGEMENT WITHIN BASKET ---

// 4. Get all orders in a basket
export const getBasketOrders = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM basket_orders WHERE basket_id = $1 ORDER BY created_at ASC", [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch basket orders" });
    }
};

// 5. Add order to basket
export const addOrderToBasket = async (req, res) => {
    try {
        const { id } = req.params; // basket_id
        const { exchange, tradingsymbol, transaction_type, order_type, product, quantity, price } = req.body;

        const result = await pool.query(
            `INSERT INTO basket_orders 
      (basket_id, exchange, tradingsymbol, transaction_type, order_type, product, quantity, price) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [id, exchange, tradingsymbol, transaction_type, order_type, product, quantity, price || 0]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add order to basket" });
    }
};

// 6. Update order in basket
export const updateBasketOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { exchange, tradingsymbol, transaction_type, order_type, product, quantity, price } = req.body;

        const result = await pool.query(
            `UPDATE basket_orders 
             SET exchange = $1, tradingsymbol = $2, transaction_type = $3, order_type = $4, product = $5, quantity = $6, price = $7
             WHERE id = $8 RETURNING *`,
            [exchange, tradingsymbol, transaction_type, order_type, product, quantity, price || 0, orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update order" });
    }
};

// 6. Delete order from basket
export const deleteBasketOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        await pool.query("DELETE FROM basket_orders WHERE id = $1", [orderId]);
        res.json({ message: "Order removed from basket" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to remove order" });
    }
};

// --- EXECUTION ---

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 7. Execute Basket
export const executeBasket = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id || 1;
        const smartApi = getAngelInstance(userId);

        if (!smartApi) return res.status(403).json({ message: "No active Angel One session" });

        const ordersResult = await pool.query("SELECT * FROM basket_orders WHERE basket_id = $1", [id]);
        const orders = ordersResult.rows;

        if (orders.length === 0) return res.status(400).json({ message: "Basket is empty" });

        const productMap = {
            "INTRADAY": "MIS",
            "DELIVERY": "CNC",
            "CARRYFORWARD": "NRML",
            "MARGIN": "MARGIN"
        };

        const results = { total: orders.length, success: [], failed: [] };

        for (const order of orders) {
            try {
                // Angel One placeOrder params mapping (Strictly lowercase)
                const response = await smartApi.placeOrder({
                    variety: "NORMAL",
                    tradingsymbol: order.tradingsymbol,
                    symboltoken: await findTokenBySymbol(order.tradingsymbol) || "0",
                    transactiontype: order.transaction_type,
                    exchange: order.exchange,
                    ordertype: order.order_type,
                    producttype: productMap[order.product] || order.product,
                    duration: "DAY",
                    price: String(order.price || 0),
                    quantity: String(order.quantity)
                });

                if (response.status && response.data) {
                    results.success.push({ id: order.id, symbol: order.tradingsymbol, orderId: response.data.orderid });
                } else {
                    results.failed.push({ id: order.id, symbol: order.tradingsymbol, reason: response.message || "Broker side error" });
                }
            } catch (error) {
                results.failed.push({ id: order.id, symbol: order.tradingsymbol, reason: error.message });
            }
            
            // Add 200ms delay to respect 9 RPS (Requests Per Second) limit
            await delay(200);
        }

        res.json({ message: "Basket execution completed", results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Basket execution failed" });
    }
};

// 8. Get Basket Margin
export const getBasketMargin = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id || 1;
        const smartApi = getAngelInstance(userId);

        if (!smartApi) return res.status(403).json({ message: "No active Angel One session" });

        const ordersResult = await pool.query("SELECT * FROM basket_orders WHERE basket_id = $1", [id]);
        const orders = ordersResult.rows;

        if (orders.length === 0) return res.json({ requiredMargin: 0, availableMargin: 0, allowed: true });

        const productMap = {
            "INTRADAY": "INTRADAY",
            "DELIVERY": "DELIVERY",
            "CARRYFORWARD": "CARRYFORWARD",
            "MARGIN": "MARGIN"
        };

        // Prepare positions for Batch Margin API
        const positions = await Promise.all(orders.map(async (o) => ({
            exchange: o.exchange,
            qty: parseInt(o.quantity),
            price: o.order_type === "MARKET" ? 0 : parseFloat(o.price),
            productType: productMap[o.product] || o.product,
            token: await findTokenBySymbol(o.tradingsymbol) || "0",
            tradeType: o.transaction_type,
            orderType: o.order_type
        })));

        let totalRequired = 0;
        let availableMargin = 0;

        try {
            // 1. Get Batch Margin Required
            const marginRes = await smartApi.marginApi({ positions });
            if (marginRes.status && marginRes.data) {
                totalRequired = marginRes.data.totalMarginRequired;
            }

            // 2. Get Available Funds
            const rms = await smartApi.getRMSLimit();
            if (rms.status && rms.data) {
                availableMargin = parseFloat(rms.data.availablecash);
            }
        } catch (apiErr) {
            console.error("Basket Margin API Error:", apiErr.message);
            // Fallback to basic calculation if API is down
            orders.forEach(o => {
                const price = parseFloat(o.price) || 500;
                const quantity = parseInt(o.quantity) || 1;
                const leverage = o.product === "INTRADAY" ? 5 : 1;
                totalRequired += (price * quantity) / leverage;
            });
        }

        res.json({
            requiredMargin: totalRequired,
            availableMargin,
            allowed: availableMargin >= totalRequired,
            isMock: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to calculate margin" });
    }
};
