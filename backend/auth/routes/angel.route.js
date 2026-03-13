import express from "express";
import { saveAngelCredentials, loginAngel, logoutAngel } from "../controllers/angel.controller.js";
import { protect } from "../utils/util.js";

const router = express.Router();

router.post("/credentials", protect, saveAngelCredentials);
router.post("/login", protect, loginAngel);
router.post("/logout", protect, logoutAngel);

export default router;
