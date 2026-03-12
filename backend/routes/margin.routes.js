import express from "express";
import { calculateMargin } from "../controllers/margin.controller.js";

const router = express.Router();

router.post("/", calculateMargin);

export default router;
