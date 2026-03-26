import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./auth/routes/auth.route.js";
import angelRoutes from "./auth/routes/angel.route.js";
import companyRoutes from "./routes/company.routes.js";
import marginRoutes from "./routes/margin.routes.js";
import orderRoutes from "./routes/order.routes.js";
import historyRoutes from "./routes/historical.routes.js";
import basketRoutes from "./routes/basket.routes.js";

import { subscribeToAngelTokens, reconnectAngelTicker } from "./clients/AngelTicker.js";
import { protect } from "./auth/utils/util.js";

/* ================= APP INIT ================= */

const app = express();
app.use(cors({ 
    origin: ["https://candle-chart-ecru.vercel.app", "http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Health Check for Uptime Robot
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});


const server = http.createServer(app);
const io = new Server(server, { 
    cors: { 
        origin: ["https://candle-chart-ecru.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        credentials: true
    } 
});

export { io };

/* ================= SOCKET.IO ================= */
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their private socket room.`);
  }

  socket.on("disconnect", () => {
    console.log(`Socket disconnected for user ${socket.id}`);
  });
});


/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/angel", angelRoutes);

app.post("/api/subscribe", protect, async (req, res) => {
  const userId = req.user.id;
  const { tokens, exchangeType } = req.body;

  // 1. Angel One subscription
  // Angel One subscription needs exchangeType mapping
  // 1=NSE, 2=NFO, 3=BSE, 4=MCX etc.
  if (tokens && tokens.length > 0) {
    const isAlive = await reconnectAngelTicker(userId);
    if (isAlive) {
        const angelSubData = [
          {
            exchangeType: exchangeType || 1, // Default NSE
            tokens: tokens.map(String)
          }
        ];
        subscribeToAngelTokens(userId, angelSubData);
    }
  }

  res.json({ success: true, message: "Subscription request sent to active brokers" });
});

app.use("/api/companies", companyRoutes);
app.use("/api/margin", marginRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/historical", historyRoutes);
app.use("/api/baskets", basketRoutes);

/* ================= START APP ================= */

import { loadAngelTokens, setInstruments } from "./services/instrumentService.js";

async function startApp() {
  const PORT = process.env.PORT || 3000;
  
  // Start listening immediately so Render/Platform health checks pass
  server.listen(PORT, () => {
    console.log(`Server is live on port ${PORT}`);
    
    // Background tasks
    loadInitialData();
  });
}

async function loadInitialData() {
  try {
    console.log("Loading initial instrument data in background...");
    const { map: angelMap, raw: angelRaw } = await loadAngelTokens();
    if (angelRaw && angelRaw.length > 0) {
      const searchableInstruments = angelRaw
        .filter(i => i.exch_seg === "NSE" || i.exch_seg === "BSE")
        .map(i => ({
          token: i.token,
          symbol: i.symbol,
          name: i.name,
          exchange: i.exch_seg
        }));
      setInstruments(searchableInstruments);
      console.log("Instrument data loaded successfully.");
    }
  } catch (err) {
    console.error("Initial data load failed:", err);
  }
}

startApp();
