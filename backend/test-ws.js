import pool from "./config/db.js";
import smartApiSessionManager from "./clients/SmartApiSessionManager.js";
import { setupWebSocket } from "./clients/AngelTicker.js"; // wait, setupWebSocket is not exported!

async function test() {
    const res = await pool.query("SELECT * FROM broker_credentials WHERE user_id = 1");
    if (res.rows.length === 0) return console.log("No credentials");
    const session = await smartApiSessionManager.getOrRestoreSession(1);
    if (!session) return console.log("No session");
    
    console.log("Session fetched. Testing WS...");
    // Let's just create WebSocketV2 directly
    import("smartapi-javascript").then(pkg => {
        const { WebSocketV2 } = pkg.default || pkg;
        const webSocket = new WebSocketV2({
            clientcode: session.clientCode,
            jwttoken: session.jwtToken,
            apikey: session.apiKey,
            feedtype: session.feedToken
        });
        
        webSocket.connect();
        webSocket.on('connect', () => {
             console.log("WS CONNECTED");
             webSocket.fetchData({ action: 1, mode: 1, exchangeType: 1, tokens: ["11536"] }); // TCS
        });
        webSocket.on('tick', (data) => console.log("TICK:", data));
        webSocket.on('error', (err) => console.log("ERR:", err));
        
        setTimeout(() => process.exit(0), 10000);
    });
}
test();
