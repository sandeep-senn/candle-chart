import express from "express";
import { 
  saveAngelCredentials, loginAngel, logoutAngel, 
  searchInstruments, getAngelStatus 
} from "../controllers/angel.controller.js";
import { protect } from "../utils/util.js";
import { placeOrder, getPositions } from "../../controllers/order.controller.js";
import { calculateMargin } from "../../controllers/margin.controller.js";

const router = express.Router();

router.post("/credentials", protect, saveAngelCredentials);
router.post("/config", protect, saveAngelCredentials); // Alias for frontend compatibility
router.post("/login", protect, loginAngel);
router.post("/logout", protect, logoutAngel);
router.get("/search", protect, searchInstruments);
router.get("/status", protect, getAngelStatus);

// Aliases for Trading Panel and Positions
router.post("/margin", protect, calculateMargin);
router.post("/placeOrder", protect, placeOrder);
router.get("/positions", protect, getPositions);

export default router;
