import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./auth/routes/auth.route.js";
import kiteRoutes from "./auth/routes/kite.route.js";
import companyRoutes from "./routes/company.routes.js";
import marginRoutes from "./routes/margin.routes.js";
import orderRoutes from "./routes/order.routes.js";
import historyRoutes from "./routes/historical.routes.js";
import basketRoutes from "./routes/basket.routes.js";

/* ================= APP INIT ================= */

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

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
app.use("/api/kite", kiteRoutes);

app.get("/broker-login", (req, res) => {
  const { request_token, state } = req.query;
  // Use state if available (we passed it in the Login URL), otherwise default
  const userState = state || "default";
  res.redirect(`http://localhost:5174/kite-callback?request_token=${request_token}&state=${userState}`);
});
app.use("/api/companies", companyRoutes);
app.use("/api/margin", marginRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/historical", historyRoutes);
app.use("/api/baskets", basketRoutes);

/* ================= START APP ================= */

async function startApp() {
  try {
    server.listen(3000, () => {
      console.log("Dynamic Multi-User Server running on 3000");
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startApp();
