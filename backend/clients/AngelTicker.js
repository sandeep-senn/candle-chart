import WebSocket from "ws";
import { loadAngelTokens } from "../services/instrumentService.js";
import { io } from "../server.js";
import smartApiSessionManager from "./SmartApiSessionManager.js";

const userLivePriceMaps = new Map();

// Angel One v1.0.x Constants (since they are hard to import in ESM)
const ACTION_SUBSCRIBE = 1;
const MODE_LTP = 1;

/**
 * Starts the Angel One Ticker for a specific user.
 */
function setupWebSocket(userId, session, tokenMap) {
    // Determine headers
    const jwtToken = session.jwtToken.startsWith('Bearer') ? session.jwtToken : `Bearer ${session.jwtToken}`;

    const ws = new WebSocket('ws://smartapisocket.angelone.in/smart-stream', {
        headers: {
            'Authorization': jwtToken,
            'x-api-key': session.apiKey,
            'x-client-code': session.clientCode,
            'x-feed-token': session.feedToken
        }
    });

    ws.on('open', () => {
        console.log(`[AngelOne] Raw WebSocket connected for user: ${userId}`);
    });

    ws.on('message', (data) => {
        try {
            const jsonStr = Buffer.from(data).toString('utf8');
            const tick = JSON.parse(jsonStr);

            if (tick && tick.ltp && tick.token) {
                if (!userLivePriceMaps.has(userId)) {
                    userLivePriceMaps.set(userId, {});
                }
                const priceMap = userLivePriceMaps.get(userId);

                const rawSymbol = tokenMap[tick.token];
                if (!rawSymbol) return;

                const priceData = {
                    symbol: rawSymbol,
                    instrument_token: tick.token,
                    ltp: Number(tick.ltp), 
                    exchange: tick.exchange || "NSE",
                    timestamp: new Date().toISOString()
                };

                priceMap[rawSymbol] = priceData;
                io.to(`user:${userId}`).emit("price-update", priceData);
            }
        } catch (e) {
            // Ignore parse errors for ping/pongs or non-tick data
        }
    });

    ws.on('error', (err) => console.error(`[AngelOne] WS Error for user ${userId}:`, err.message));
    ws.on('close', () => console.log(`[AngelOne] WS Closed for user ${userId}`));

    // Shim to match the previous interaction signature for subscribeToAngelTokens
    ws.fetchData = (subRequest) => {
        const exchMap = { 1: "NSE", 2: "NFO", 3: "BSE", 4: "MCX" };
        const exchangeStr = exchMap[subRequest.exchangeType] || "NSE";

        const payload = JSON.stringify({
            "type": "subscribe",
            "data": {
                "exchange": exchangeStr,
                "tokens": subRequest.tokens
            }
        });

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        } else {
            ws.once('open', () => ws.send(payload));
        }
    };

    return ws;
}

export async function reconnectAngelTicker(userId) {
    console.log(`[AngelOne] Reconnecting user ${userId} ticker...`);
    const session = await smartApiSessionManager.getOrRestoreSession(userId);
    if (!session) return false;
    if (session.stream) return true; // Already connected

    try {
        const { map: tokenMap } = await loadAngelTokens();
        session.stream = setupWebSocket(userId, session, tokenMap);
        return true;
    } catch (e) {
        console.error(`[AngelOne] Reconnect ticker failed for user ${userId}:`, e.message);
        return false;
    }
}

export async function startAngelTicker(userId, credentials) {
    try {
        const { apiKey, clientCode, password, totpSecret } = credentials;

        const session = await smartApiSessionManager.createSession(userId, { 
            apiKey, clientCode, password, totpSecret 
        });

        // Load Angel One tokens for mapping
        const { map: tokenMap } = await loadAngelTokens();
        session.stream = setupWebSocket(userId, session, tokenMap);
    } catch (error) {
        console.error(`[AngelOne] Failed to start ticker for user ${userId}:`, error.message);
    }
}

/**
 * Subscribes to tokens for a specific user.
 */
export function subscribeToAngelTokens(userId, subscriptionData) {
    const session = smartApiSessionManager.getSession(userId);
    if (!session || !session.stream) {
        console.error(`[AngelOne] Subscription failed: No active stream for user ${userId}`);
        return;
    }

    // subscriptionData is expected to be an array of {exchangeType, tokens}
    subscriptionData.forEach(sub => {
        session.stream.fetchData({
            action: ACTION_SUBSCRIBE,
            mode: MODE_LTP,
            exchangeType: sub.exchangeType,
            tokens: sub.tokens
        });
    });

    console.log(`[AngelOne] User ${userId} subscribed to ${subscriptionData.length} exchanges.`);
}

export const getAngelPriceMap = (userId) => userLivePriceMaps.get(userId) || {};
