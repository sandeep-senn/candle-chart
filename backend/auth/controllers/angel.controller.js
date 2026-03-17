import pool from "../../config/db.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import smartApiSessionManager from "../../clients/SmartApiSessionManager.js";
import { startAngelTicker } from "../../clients/AngelTicker.js";
import { getInstruments } from "../../services/instrumentService.js";

/**
 * Save/Update Angel One API Credentials for a user
 */
export const saveAngelCredentials = async (req, res) => {
    try {
        const { apiKey, clientCode, password, totpSecret } = req.body;
        const userId = req.user.id;

        if (!apiKey || !clientCode || !password || !totpSecret) {
            return res.status(400).json({ message: "All credentials (API Key, Client Code, Password, TOTP Secret) are required" });
        }

        // Encrypt credentials before saving
        const encryptedKey = encrypt(apiKey);
        const encryptedCode = encrypt(clientCode);
        const encryptedPass = encrypt(password);
        const encryptedTotp = encrypt(totpSecret);

        await pool.query(
            `INSERT INTO user_angelone_credentials (user_id, api_key, client_code, password, totp_secret) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (user_id) DO UPDATE SET api_key = $2, client_code = $3, password = $4, totp_secret = $5, updated_at = NOW()`,
            [userId, encryptedKey, encryptedCode, encryptedPass, encryptedTotp]
        );

        res.json({ success: true, message: "Angel One credentials saved securely." });
    } catch (err) {
        console.error("Save Angel Credentials Error:", err);
        res.status(500).json({ message: "Failed to save credentials" });
    }
};

/**
 * Perform login and start WebSocket
 */
export const loginAngel = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Fetch encrypted credentials
        const result = await pool.query(
            "SELECT api_key, client_code, password, totp_secret FROM user_angelone_credentials WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Angel One credentials not found. Please save them first." });
        }

        const creds = result.rows[0];
        const apiKey = decrypt(creds.api_key);
        const clientCode = decrypt(creds.client_code);
        const password = decrypt(creds.password);
        const totpSecret = decrypt(creds.totp_secret);

        // 2. Initialize Session and Start Ticker
        const session = await smartApiSessionManager.createSession(userId, {
            apiKey, clientCode, password, totpSecret
        });

        await startAngelTicker(userId, {
            apiKey, clientCode, password, totpSecret
        });

        // 3. Update tokens in DB
        await pool.query(
            "UPDATE user_angelone_credentials SET jwt_token = $1, refresh_token = $2, feed_token = $3, last_login = NOW() WHERE user_id = $4",
            [session.jwtToken, session.refreshToken, session.feedToken, userId]
        );

        res.json({ success: true, message: "Angel One session initialized and Ticker started." });
    } catch (err) {
        console.error("Angel Login Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Logout
 */
export const logoutAngel = async (req, res) => {
    try {
        const userId = req.user.id;
        smartApiSessionManager.destroySession(userId);

        // Clear tokens from DB
        await pool.query(
            "UPDATE user_angelone_credentials SET jwt_token = NULL, refresh_token = NULL, feed_token = NULL WHERE user_id = $1",
            [userId]
        );

        res.json({ success: true, message: "Angel One session cleared." });
    } catch (err) {
        console.error("Angel Logout Error:", err);
        res.status(500).json({ message: "Logout failed" });
    }
};

/**
 * Get Connection Status
 */
export const getAngelStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const session = smartApiSessionManager.getSession(userId);
        
        if (session && session.smartApi) {
            res.json({ success: true, status: "CONNECTED" });
        } else {
            res.json({ success: true, status: "DISCONNECTED" });
        }
    } catch (err) {
        res.json({ success: true, status: "DISCONNECTED" });
    }
};

/**
 * Search instruments (symbols)
 */
export const searchInstruments = (req, res) => {
    try {
        const query = req.query.query?.toUpperCase() || req.query.q?.toUpperCase() || "";

        if (query.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const all = getInstruments();
        const results = all.filter(i => 
            (i.symbol && i.symbol.toUpperCase().includes(query)) ||
            (i.name && i.name.toUpperCase().includes(query))
        ).slice(0, 15);

        res.json({ success: true, data: results });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ success: false, message: "Search failed" });
    }
};
