import pool from "../../config/db.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import sessionManager from "../../clients/sessionManager.js";
import { KiteConnect } from "kiteconnect";
import { startUserTicker } from "../../clients/Ticker.js";

/**
 * Save/Update Kite API Credentials for a user
 */
export const saveKiteCredentials = async (req, res) => {
    try {
        const { apiKey, apiSecret } = req.body;
        const userId = req.user.id;

        if (!apiKey || !apiSecret) {
            return res.status(400).json({ message: "API Key and Secret are required" });
        }

        // Encrypt credentials before saving
        const encryptedKey = encrypt(apiKey);
        const encryptedSecret = encrypt(apiSecret);

        await pool.query(
            `INSERT INTO user_kite_credentials (user_id, api_key, api_secret) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id) DO UPDATE SET api_key = $2, api_secret = $3, updated_at = NOW()`,
            [userId, encryptedKey, encryptedSecret]
        );

        res.json({ success: true, message: "Credentials saved securely." });
    } catch (err) {
        console.error("Save Credentials Error:", err);
        res.status(500).json({ message: "Failed to save credentials" });
    }
};

/**
 * Step 1: Redirect to Kite Login using User's unique API Key
 */
export const kiteLoginRedirect = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            "SELECT api_key FROM user_kite_credentials WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No API credentials found. Please enter your API Key and Secret first." });
        }

        try {
            const apiKey = decrypt(result.rows[0].api_key);
            const kite = new KiteConnect({ api_key: apiKey });

            // Pass userId in state so we can identify the user in the callback
            const loginUrl = `${kite.getLoginURL()}&state=${userId}`;
            res.json({ loginUrl });
        } catch (decryptErr) {
            console.error("Decryption Error:", decryptErr);
            return res.status(500).json({ message: "Security Error: Failed to decrypt your credentials. Please save them again." });
        }
    } catch (err) {
        console.error("Login Redirect Error:", err);
        res.status(500).json({ message: "System Error: Failed to generate login URL. Contact support." });
    }
};

/**
 * Step 2: Finalize Login (AJAX) 
 * Called by Frontend to exchange request_token for access_token
 */
export const finalizeLogin = async (req, res) => {
    const { request_token } = req.body;
    const userId = req.user.id; // Get from JWT instead of query state for better security

    if (!request_token) return res.status(400).json({ message: "Request token missing" });

    try {
        // 1. Fetch encrypted credentials
        const result = await pool.query(
            "SELECT api_key, api_secret FROM user_kite_credentials WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) throw new Error("API credentials not found. Please save them first.");

        const apiKey = decrypt(result.rows[0].api_key);
        const apiSecret = decrypt(result.rows[0].api_secret);

        // 2. Generate Session
        const kite = new KiteConnect({ api_key: apiKey });
        const session = await kite.generateSession(request_token, apiSecret);
        const accessToken = session.access_token;

        // 3. Encrypt and store access token
        const encryptedToken = encrypt(accessToken);
        await pool.query(
            "UPDATE user_kite_credentials SET access_token = $1, last_login = NOW() WHERE user_id = $2",
            [encryptedToken, userId]
        );

        // 4. Initialize Session in Manager and Start Ticker
        await sessionManager.createSession(userId, { apiKey, accessToken });
        await startUserTicker(userId, { apiKey, accessToken });

        res.json({ success: true, message: "Kite session initialized" });
    } catch (err) {
        console.error("Finalization Error:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Logout/Clear Session
 */
export const kiteLogout = async (req, res) => {
    try {
        const userId = req.user.id;
        sessionManager.destroySession(userId);

        // Clear token from DB
        await pool.query(
            "UPDATE user_kite_credentials SET access_token = NULL WHERE user_id = $1",
            [userId]
        );

        res.json({ success: true, message: "Kite session cleared." });
    } catch (err) {
        res.status(500).json({ message: "Logout failed" });
    }
};
