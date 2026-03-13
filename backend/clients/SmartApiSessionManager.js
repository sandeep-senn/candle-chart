import pkg from "smartapi-javascript";
const { SmartAPI } = pkg;
import { authenticator } from "otplib";

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
