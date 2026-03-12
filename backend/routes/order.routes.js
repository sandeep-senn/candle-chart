import express from "express";
import { cancelOrder, getHoldings, getOrders, getPositions, placeOrder } from "../controllers/order.controller.js";

const router = express.Router();

router.post("/", placeOrder);
router.get('/getOrders', getOrders)
router.get('/getPositions', getPositions)
router.get('/getHoldings', getHoldings)
router.post('/cancel', cancelOrder)
export default router;
