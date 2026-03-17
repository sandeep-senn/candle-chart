import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

// ================= CONFIGURATION =================
// 1. Local Database Connection
const localPool = new Pool({
    connectionString: "postgresql://postgres:Sandeep1111@localhost:5432/trading_db"
});

// 2. Render Database Connection (Use EXTERNAL URL from Render Dashboard)
const renderPool = new Pool({
    connectionString: process.env.RENDER_EXTERNAL_URL || "PASTE_YOUR_RENDER_EXTERNAL_URL_HERE",
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log("🚀 Starting Migration: Local -> Render");
    
    try {
        // Test Connections
        const localClient = await localPool.connect();
        console.log("✅ Connected to Local DB");
        localClient.release();

        const renderClient = await renderPool.connect();
        console.log("✅ Connected to Render DB");
        renderClient.release();

        // 1. Fetch data from local
        console.log("📊 Fetching data from local 'trading' table...");
        const result = await localPool.query("SELECT * FROM trading");
        const rows = result.rows;
        console.log(`📦 Found ${rows.length} records to migrate.`);

        // 2. Insert into Render in bulk chunks
        const chunkSize = 100;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            console.log(`📤 Uploading chunk ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(rows.length / chunkSize)} (${i} / ${rows.length})...`);
            
            const values = [];
            const placeholders = [];
            
            chunk.forEach((row, idx) => {
                const offset = idx * 9;
                placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`);
                values.push(row.tradingsymbol, row.date, row.interval, row.open, row.high, row.low, row.close, row.volume, row.change);
            });

            const query = `
                INSERT INTO trading (tradingsymbol, date, interval, open, high, low, close, volume, "change") 
                VALUES ${placeholders.join(', ')}
                ON CONFLICT (tradingsymbol, date, interval) DO NOTHING
            `;

            await renderPool.query(query, values);
        }

        console.log("✨ Migration Completed Successfully!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Migration Failed:", err.message);
        if (err.message.includes("PASTE_YOUR_RENDER_EXTERNAL_URL_HERE")) {
            console.log("👉 Tip: Please edit migrate_to_render.js and paste your Render External URL.");
        }
        process.exit(1);
    }
}

migrate();
