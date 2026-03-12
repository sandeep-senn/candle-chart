import dotenv from "dotenv";
dotenv.config();

import kite from "../clients/kiteClient.js";
import pool from "../config/db.js";
import { setInstruments } from '../services/instrumentService.js';
import { processAllInstruments } from '../services/historicalLoader.js';
import fs from "fs";
import express from "express";

const app = express();
// Helper to load token if not in env
const TOKEN_FILE = process.env.TOKEN_FILE || "access_token.txt";
try {
    if (fs.existsSync(TOKEN_FILE)) {
        const token = fs.readFileSync(TOKEN_FILE, "utf8").trim();
        kite.setAccessToken(token);
        console.log("Loaded access token from file.");
    }
} catch (e) {
    console.log("No token file found, relying on .env or existing session.");
}

export async function run() {
    try {
        // 1. Fetch NFO instruments to identify F&O stocks
        console.log("Fetching NFO instruments...");
        const nfo = await kite.getInstruments("NFO");

        // 2. Extract unique underlying symbols that have Futures
        const fnoSymbols = new Set();
        nfo.forEach(inst => {
            if (inst.segment === 'NFO-FUT' && inst.name) {
                fnoSymbols.add(inst.name);
            }
        });

        console.log(`Found ${fnoSymbols.size} instruments with Futures & Options.`);

        // 3. Fetch NSE/BSE Equity instruments
        console.log("Fetching all NSE instruments...");
        const nse = await kite.getInstruments("NSE");

        // 4. Filter NSE/BSE Equity instruments that are in the FNO list
        const targetInstruments = nse.filter((i) =>
            i.instrument_type === "EQ" && fnoSymbols.has(i.tradingsymbol)
        );

        console.log(`Filtered down to ${targetInstruments.length} Equity instruments (NSE) corresponding to FNO stocks.`);

        // Map to format expected by processAllInstruments
        const instruments = targetInstruments.map((i) => ({
            symbol: i.tradingsymbol,
            name: i.name || i.tradingsymbol,
            exchange: i.exchange,
            token: i.instrument_token,
            expiry: i.expiry,
            instrument_type: i.instrument_type
        }));

        // setInstruments(instruments); // REMOVED: Do not overwrite the global 121k search index with 207 items!

        // Define time range: 5 years ago to today
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        const today = new Date();

        console.log(`Starting historical data load from ${fiveYearsAgo.toISOString()} to ${today.toISOString()}`);
        const results = await processAllInstruments({
            kite,
            pool,
            instruments,
            table: "trading",
            concurrency: 5,
            fromDate: fiveYearsAgo,
            toDate: today,
        });

        console.log("Done! Processed:", results.length);

        // Log summary
        const success = results.filter(r => !r.error).length;
        const failed = results.filter(r => r.error).length;
        console.log(`Success: ${success}, Failed: ${failed}`);
        if (failed > 0) {
            console.log("First 5 failures:", results.filter(r => r.error).slice(0, 1));
        }


    } catch (err) {
        console.error("Fatal error:", err);
    }
}

// run();
