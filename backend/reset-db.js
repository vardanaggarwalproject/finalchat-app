import { db } from "./config/db.js";
import { sql } from "drizzle-orm";

async function resetDatabase() {
  // try {
  //   console.log("🗑️  Dropping all tables...");
    
  //   // Drop tables in correct order (respect foreign keys)
  //   await db.execute(sql`DROP TABLE IF EXISTS messages CASCADE`);
  //   await db.execute(sql`DROP TABLE IF EXISTS group_members CASCADE`);
  //   await db.execute(sql`DROP TABLE IF EXISTS groups CASCADE`);
  //   await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    
  //   console.log("✅ Tables dropped successfully");
  //   console.log("📝 Now run: npm run db:push");
  //   console.log("   This will recreate tables with correct schema");
    
  //   process.exit(0);
  // } catch (error) {
  //   console.error("❌ Error resetting database:", error);
  //   process.exit(1);
  // }



}

resetDatabase();