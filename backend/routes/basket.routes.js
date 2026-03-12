import express from "express";
import {
    getBaskets,
    createBasket,
    deleteBasket,
    getBasketOrders,
    addOrderToBasket,
    updateBasketOrder,
    deleteBasketOrder,
    executeBasket,
    getBasketMargin,
} from "../controllers/basket.controller.js";
import { protect } from "../auth/utils/util.js";

const router = express.Router();

router.get("/", protect, getBaskets);
router.post("/", protect, createBasket);
router.delete("/:id", protect, deleteBasket);

router.get("/:id/orders", protect, getBasketOrders);
router.post("/:id/orders", protect, addOrderToBasket);
router.put("/orders/:orderId", protect, updateBasketOrder);
router.delete("/orders/:orderId", protect, deleteBasketOrder);

router.post("/:id/execute", protect, executeBasket);
router.get("/:id/margin", protect, getBasketMargin);

export default router;
