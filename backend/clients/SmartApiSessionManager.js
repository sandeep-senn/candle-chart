import pkg from "smartapi-javascript";
const { SmartAPI } = pkg;
import { authenticator } from "otplib";
import pool from "../config/db.js";
import { decrypt } from "../auth/utils/encryption.js";

/**
 * SmartApiSessionManager
 * Manages isolated SmartAPI and SmartStream instances for multiple users.
 */
class SmartApiSessionManager {
    constructor() {
        // Map<userId, { smartApi, stream, tokens }>
        this.sessions = new Map();
    }

    /**
     * Initializes a session for Angel One matching user credentials.
     */
    async createSession(userId, { apiKey, clientCode, password, totpSecret }) {
        if (this.sessions.has(userId)) {
            console.log(`[SmartAPI] Session already exists for user ${userId}.`);
            return this.sessions.get(userId);
        }

        const smartApi = new SmartAPI({
            api_key: apiKey,
        });

        // Generate TOTP
        const totp = authenticator.generate(totpSecret);

        try {
            const sessionData = await smartApi.generateSession(clientCode, password, totp);
            
            if (!sessionData.status) {
                throw new Error(sessionData.message || "Failed to generate session");
            }

            const session = {
                smartApi,
                clientCode,
                apiKey,
                feedToken: sessionData.data.feedToken,
                jwtToken: sessionData.data.jwtToken,
                refreshToken: sessionData.data.refreshToken,
                stream: null
            };

            this.sessions.set(userId, session);
            console.log(`[SmartAPI] New session created for user ${userId}`);
            return session;
        } catch (error) {
            console.error(`[SmartAPI] Login failed for user ${userId}:`, error.message);
            throw error;
        }
    }

    /**
     * Retrieves session data for a user.
     */
    getSession(userId) {
        return this.sessions.get(userId);
    }

    /**
     * Asynchronously retrieves a session from memory. If missing, attempts to seamlessly reconstruct it from PostgreSQL.
     */
    async getOrRestoreSession(userId) {
        let session = this.getSession(userId);
        if (session && session.smartApi) {
            return session;
        }

        console.log(`[SmartAPI] Session missing in memory for user ${userId}. Attempting DB restore...`);
        try {
            const result = await pool.query(
                "SELECT api_key, client_code, password, totp_secret, jwt_token, refresh_token, feed_token FROM user_angelone_credentials WHERE user_id = $1",
                [userId]
            );

            if (result.rows.length === 0) {
                console.log(`[SmartAPI] DB Restore failed: No credentials found for user ${userId}.`);
                return null;
            }

            const creds = result.rows[0];
            const apiKey = decrypt(creds.api_key);
            const clientCode = decrypt(creds.client_code);
            const password = decrypt(creds.password);
            const totpSecret = decrypt(creds.totp_secret);

            console.log(`[SmartAPI] DB Credentials found. Regenerating session for user ${userId}...`);
            const newlyRestoredSession = await this.createSession(userId, { apiKey, clientCode, password, totpSecret });
            
            // Optionally we could update the latest tokens back to DB using pool here, but createSession might auto regenerate it.
            return newlyRestoredSession;
        } catch (error) {
            console.error(`[SmartAPI] Error restoring session from DB for user ${userId}:`, error.message);
            return null;
        }
    }

    /**
     * Cleans up and removes a user's session.
     */
    destroySession(userId) {
        const session = this.sessions.get(userId);
        if (session) {
            // SmartAPI JS SDK doesn't have a formal logout that kills the process, 
            // but we can clear the memory and close the stream.
            if (session.stream) {
                session.stream.stop();
                console.log(`[SmartAPI] Stream stopped for user ${userId}`);
            }
            this.sessions.delete(userId);
            console.log(`[SmartAPI] Session destroyed for user ${userId}`);
            return true;
        }
        return false;
    }
}

const smartApiSessionManager = new SmartApiSessionManager();
export default smartApiSessionManager;
