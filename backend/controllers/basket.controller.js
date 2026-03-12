import pool from "../config/db.js";
import kite from "../clients/kiteClient.js";

// --- BASKET MANAGEMENT ---

// 1. Get all baskets for the user
export const getBaskets = async (req, res) => {
    try {
        const userId = req.user.id;
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
        const userId = req.user.id;
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
        const userId = req.user.id;
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

// 7. Execute Basket
export const executeBasket = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // 1. Fetch orders
        const ordersResult = await pool.query("SELECT * FROM basket_orders WHERE basket_id = $1", [id]);
        const orders = ordersResult.rows;

        if (orders.length === 0) return res.status(400).json({ message: "Basket is empty" });

        const results = {
            total: orders.length,
            success: [],
            failed: []
        };

        // 2. Execute sequentially to avoid rate limits (or use Promise.all for speed if API allows)
        // Using simple loop for safety
        for (const order of orders) {
            try {
                const payload = {
                    exchange: order.exchange,
                    tradingsymbol: order.tradingsymbol,
                    transaction_type: order.transaction_type,
                    quantity: order.quantity,
                    product: order.product,
                    order_type: order.order_type,
                    price: order.order_type === "LIMIT" ? parseFloat(order.price) : undefined
                };

                const response = await kite.placeOrder("regular", payload);
                results.success.push({ id: order.id, symbol: order.tradingsymbol, orderId: response.order_id });

            } catch (error) {
                console.error(`Failed to execute order ${order.id}:`, error.message);
                results.failed.push({ id: order.id, symbol: order.tradingsymbol, reason: error.message });
            }
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

        // 1. Fetch orders
        const ordersResult = await pool.query("SELECT * FROM basket_orders WHERE basket_id = $1", [id]);
        const orders = ordersResult.rows;

        if (orders.length === 0) return res.json({ requiredMargin: 0, availableMargin: 0 });

        // 2. Prepare payload for Kite
        const kitesPayload = orders.map(order => ({
            exchange: order.exchange,
            tradingsymbol: order.tradingsymbol,
            transaction_type: order.transaction_type,
            variety: "regular",
            product: order.product,
            order_type: order.order_type,
            quantity: Number(order.quantity),
            price: order.order_type === "LIMIT" ? parseFloat(order.price) : 0
        }));

        // 3. Call Kite
        const marginResp = await kite.orderMargins(kitesPayload);

        if (!marginResp) throw new Error("No response from Kite");

        // 4. Sum up totals
        const totalRequired = marginResp.reduce((acc, curr) => acc + (curr.total || 0), 0);

        // 5. Get Available Funds
        const funds = await kite.getMargins();
        const available = funds?.equity?.available?.cash || 0;

        res.json({
            requiredMargin: totalRequired,
            availableMargin: available,
            allowed: totalRequired <= available
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to calculate margin" });
    }
};
