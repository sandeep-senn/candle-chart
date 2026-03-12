import { loadSpotTokens } from "../services/instrumentService.js";
import { io } from "../server.js";
import sessionManager from "./sessionManager.js";

// Map to store per-user livePriceMap if needed, but usually we just emit
// Map<userId, livePriceMap>
const userLivePriceMaps = new Map();

/**
 * Starts the Ticker for a specific user.
 */
export async function startUserTicker(userId, credentials) {
  try {
    const { apiKey, accessToken } = credentials;

    // Get/Create Kite session
    const { kite } = await sessionManager.createSession(userId, { apiKey, accessToken });

    // Load tokens for this user's context (often common, but instrument tokens are per-exchange)
    const spotTokenMap = await loadSpotTokens(kite);

    // Initialize Ticker via Manager
    const ticker = sessionManager.initTicker(userId, { apiKey, accessToken });

    ticker.connect();

    ticker.on("connect", () => {
      console.log(`WebSocket connected for user: ${userId}`);
    });

    ticker.on("ticks", (ticks) => {
      if (!userLivePriceMaps.has(userId)) {
        userLivePriceMaps.set(userId, {});
      }
      const priceMap = userLivePriceMaps.get(userId);

      for (const tick of ticks) {
        const rawSymbol = spotTokenMap[tick.instrument_token];
        if (!rawSymbol) continue;

        const priceData = {
          symbol: rawSymbol,
          instrument_token: tick.instrument_token,
          ltp: tick.last_price,
          ohlc: tick.ohlc,
          volume: tick.volume,
          timestamp: tick.exchange_timestamp,
        };

        priceMap[rawSymbol] = priceData;

        // Emit ONLY to this user's room to prevent data leakage
        io.to(`user:${userId}`).emit("price-update", priceData);
      }
    });

    ticker.on("error", (err) => console.error(`WS error [User ${userId}]:`, err));
    ticker.on("close", () => {
      console.log(`WS closed for user ${userId}, session management will handle reconnection if active.`);
    });

  } catch (error) {
    console.error(`Failed to start ticker for user ${userId}:`, error.message);
  }
}

/**
 * Subscribes to tokens for a specific user.
 */
export function subscribeToUserTokens(userId, tokens) {
  const ticker = sessionManager.getTicker(userId);
  if (!ticker) {
    console.error(`Subscription failed: No ticker found for user ${userId}`);
    return;
  }

  const numericTokens = Array.isArray(tokens)
    ? tokens.map(Number)
    : [Number(tokens)];

  ticker.subscribe(numericTokens);
  ticker.setMode(ticker.modeFull, numericTokens);

  console.log(`User ${userId} subscribed to ${numericTokens.length} tokens.`);
}

/**
 * Utility to get latest prices for a user
 */
export const getUserPriceMap = (userId) => userLivePriceMaps.get(userId) || {};

