import pkg from "smartapi-javascript";
const { WebSocketV2 } = pkg;
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
    const webSocket = new WebSocketV2({
        clientcode: session.clientCode,
        jwttoken: session.jwtToken,
        apikey: session.apiKey,
        feedtype: session.feedToken
    });

    webSocket.connect();

    webSocket.on('connect', () => {
        console.log(`[AngelOne] WebSocket connected for user: ${userId}`);
    });

    webSocket.on('tick', (data) => {
        if (!userLivePriceMaps.has(userId)) {
            userLivePriceMaps.set(userId, {});
        }
        const priceMap = userLivePriceMaps.get(userId);

        const rawSymbol = tokenMap[data.token];
        if (!rawSymbol) return;

        const priceData = {
            symbol: rawSymbol,
            instrument_token: data.token,
            ltp: Number(data.last_traded_price) / 100, 
            exchange: data.exchange_type,
            timestamp: new Date().toISOString()
        };

        priceMap[rawSymbol] = priceData;
        io.to(`user:${userId}`).emit("price-update", priceData);
    });

    webSocket.on('error', (err) => console.error(`[AngelOne] WS Error for user ${userId}:`, err));
    webSocket.on('close', () => console.log(`[AngelOne] WS Closed for user ${userId}`));

    return webSocket;
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
