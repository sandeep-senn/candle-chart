import { KiteConnect, KiteTicker } from "kiteconnect";

/**
 * KiteSessionManager
 * Manages isolated KiteConnect and KiteTicker instances for multiple users.
 */
class KiteSessionManager {
    constructor() {
        // Map<userId, { kite, ticker }>
        this.sessions = new Map();
    }

    /**
     * Initializes or returns an existing session for a user.
     */
    async createSession(userId, { apiKey, accessToken }) {
        if (this.sessions.has(userId)) {
            console.log(`Session already exists for user ${userId}. Returning existing.`);
            return this.sessions.get(userId);
        }

        const kite = new KiteConnect({ api_key: apiKey });
        kite.setAccessToken(accessToken);

        // Note: Ticker initialization is handled separately or on-demand
        const session = { kite, ticker: null, apiKey, accessToken };
        this.sessions.set(userId, session);

        console.log(`New Kite session created for user ${userId}`);
        return session;
    }

    /**
     * Initializes the Ticker for a specific user.
     */
    initTicker(userId, { apiKey, accessToken }) {
        const session = this.sessions.get(userId);
        if (!session) throw new Error(`No session found for user ${userId}`);

        if (session.ticker) {
            console.log(`Ticker already active for user ${userId}`);
            return session.ticker;
        }

        const ticker = new KiteTicker({
            api_key: apiKey,
            access_token: accessToken,
        });

        session.ticker = ticker;
        return ticker;
    }

    /**
     * Retrieves a user's KiteConnect instance.
     */
    getKite(userId) {
        const session = this.sessions.get(userId);
        return session ? session.kite : null;
    }

    /**
     * Retrieves a user's Ticker instance.
     */
    getTicker(userId) {
        const session = this.sessions.get(userId);
        return session ? session.ticker : null;
    }

    /**
     * Cleans up and removes a user's session.
     */
    destroySession(userId) {
        const session = this.sessions.get(userId);
        if (session) {
            if (session.ticker) {
                session.ticker.disconnect();
                console.log(`Ticker disconnected for user ${userId}`);
            }
            this.sessions.delete(userId);
            console.log(`Session destroyed for user ${userId}`);
            return true;
        }
        return false;
    }

    /**
     * List all active user sessions.
     */
    getActiveUsers() {
        return Array.from(this.sessions.keys());
    }
}

const sessionManager = new KiteSessionManager();
export default sessionManager;
