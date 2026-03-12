import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "trading_multi_user", // CHANGED: New database for multi-user project
  password: "Sandeep1111",
  port: 5432,
});

const createTables = async () => {
  try {
    // 1. Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Users table verified.");

    // 2. Kite Credentials Table (SEPARATE Table as requested)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_kite_credentials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        api_key TEXT NOT NULL,
        api_secret TEXT NOT NULL,
        access_token TEXT,
        request_token TEXT,
        last_login TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Kite Credentials table verified.");

    // 3. Baskets Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS baskets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Baskets table verified/created.");

    // 3. Basket Orders Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS basket_orders (
        id SERIAL PRIMARY KEY,
        basket_id INTEGER REFERENCES baskets(id) ON DELETE CASCADE,
        exchange VARCHAR(20) NOT NULL,
        tradingsymbol VARCHAR(50) NOT NULL,
        transaction_type VARCHAR(10) NOT NULL,
        order_type VARCHAR(10) NOT NULL,
        product VARCHAR(10) NOT NULL,
        quantity INTEGER NOT NULL,
        price NUMERIC DEFAULT 0,
        trigger_price NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Basket Orders table verified/created.");

  } catch (err) {
    console.error("Error creating tables:", err);
  }
};

createTables();

export default pool;
