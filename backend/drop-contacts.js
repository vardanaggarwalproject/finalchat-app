import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

async function dropTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { require: true, rejectUnauthorized: false }
  });

  try {
    console.log('🗑️ [CLEANUP] Dropping user_contacts table...');
    await pool.query('DROP TABLE IF EXISTS user_contacts CASCADE;');
    console.log('✅ [CLEANUP] Table dropped successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ [CLEANUP] Failed to drop table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

dropTable();
