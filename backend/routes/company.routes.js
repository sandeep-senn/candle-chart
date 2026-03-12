import express from "express";
import { searchCompanies } from "../controllers/company.controller.js";

const router = express.Router();

router.get("/search", searchCompanies);

export default router;
