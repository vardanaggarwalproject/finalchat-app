import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { require: true, rejectUnauthorized: false }  // ALWAYS REQUIRED FOR SUPABASE
});

// Add error handler
pool.on("error", (err) => {
  console.error("DATABASE ERROR:", err);
});

// Test connection
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    // console.log("Connected at:", res.rows[0].now);
  } catch (err) {
    console.error("Connection failed:", err);
  }
})();

export const db = drizzle(pool);
