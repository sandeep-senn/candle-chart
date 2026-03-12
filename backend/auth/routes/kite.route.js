import express from "express";
import {
    saveKiteCredentials,
    kiteLoginRedirect,
    finalizeLogin,
    kiteLogout
} from "../controllers/kite.controller.js";
import { protect } from "../utils/util.js";

const router = express.Router();

// Protected routes
router.post("/credentials", protect, saveKiteCredentials);
router.get("/login", protect, kiteLoginRedirect);
router.post("/finalize", protect, finalizeLogin);
router.post("/logout", protect, kiteLogout);

export default router;
