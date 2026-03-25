import pkg from "smartapi-javascript";
const { WebSocketV2 } = pkg;
import { loadAngelTokens } from "../services/instrumentService.js";
import { io } from "../server.js";
import smartApiSessionManager from "./SmartApiSessionManager.js";

const userLivePriceMaps = new Map();
const userEmitQueues = new Map();
const userEmitTimers = new Map();

const emitPriceUpdate = (userId, priceData) => {
  if (!userEmitQueues.has(userId)) userEmitQueues.set(userId, []);
  const queue = userEmitQueues.get(userId);
  queue.push(priceData);

  if (!userEmitTimers.has(userId)) {
    const timer = setTimeout(() => {
      const latest = {};
      const userQueue = userEmitQueues.get(userId) || [];
      userQueue.forEach(p => { latest[p.symbol] = p; });
      
      Object.values(latest).forEach(p => {
        io.to(`user:${userId}`).emit("price-update", p);
      });
      
      userEmitQueues.set(userId, []);
      userEmitTimers.delete(userId);
    }, 200); // 200ms batch window
    userEmitTimers.set(userId, timer);
  }
};

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

    webSocket.on('connect', async () => {
        console.log(`[AngelOne] WebSocket connected for user: ${userId}`);
        // Auto‑subscribe to all tokens after connection
        try {
          const tokens = Object.keys(tokenMap);
          if (tokens.length) {
            await webSocket.fetchData({
              action: ACTION_SUBSCRIBE,
              mode: MODE_LTP,
              exchangeType: 'NSE', // default exchange, adjust if needed
              tokens
            });
            console.log(`[AngelOne] Auto‑subscribed ${tokens.length} tokens for user ${userId}`);
          }
        } catch (e) {
          console.error(`[AngelOne] Auto‑subscribe error for user ${userId}:`, e);
        }
    });

    webSocket.on('tick', (data) => {
        if (!userLivePriceMaps.has(userId)) {
            userLivePriceMaps.set(userId, {});
        }
        const priceMap = userLivePriceMaps.get(userId);

        const cleanToken = typeof data.token === 'string' ? data.token.replace(/^\"|\"$/g, '') : data.token;
        const rawSymbol = tokenMap[cleanToken];
        if (!rawSymbol) return;

        // Guard against missing price
        const rawPrice = data.last_traded_price;
        if (rawPrice == null) {
          console.warn(`[AngelOne] Tick received with missing price for token ${cleanToken}`);
          return;
        }

        const priceData = {
            symbol: rawSymbol,
            instrument_token: data.token,
            ltp: Number(rawPrice) / 100,
            exchange: data.exchange_type,
            timestamp: new Date().toISOString()
        };

        priceMap[rawSymbol] = priceData;
        // Use throttled emit to reduce frequency, passing userId for scoped rooms
        emitPriceUpdate(userId, priceData);
    });

    webSocket.on('error', (err) => console.error(`[AngelOne] WS Error for user ${userId}:`, err));
    webSocket.on('close', () => {
        console.log(`[AngelOne] WS Closed for user ${userId}`);
        // Cleanup price map to avoid memory leak
        userLivePriceMaps.delete(userId);
        // Reset stream reference so reconnect can happen
        const sess = smartApiSessionManager.getSession(userId);
        if (sess) sess.stream = null;
    });

    return webSocket;
}

export async function reconnectAngelTicker(userId) {
    console.log(`[AngelOne] Reconnecting user ${userId} ticker...`);
    const session = await smartApiSessionManager.getOrRestoreSession(userId);
    if (!session) return false;
    // Verify existing stream health (simple readyState check if available)
    if (session.stream && session.stream.readyState === 1) {
        return true; // Already healthy
    }
    // Clean up stale stream reference
    if (session.stream) session.stream = null;
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
        // Deduplicate tokens before sending
        const uniqueTokens = Array.from(new Set(sub.tokens));
        if (uniqueTokens.length === 0) return;
        session.stream.fetchData({
            action: ACTION_SUBSCRIBE,
            mode: MODE_LTP,
            exchangeType: sub.exchangeType,
            tokens: uniqueTokens
        });
    });

    console.log(`[AngelOne] User ${userId} subscribed to ${subscriptionData.length} exchanges.`);
}

export const getAngelPriceMap = (userId) => userLivePriceMaps.get(userId) || {};
