import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { require: true, rejectUnauthorized: false }
  });

  try {
    console.log('🔍 [SCHEMA] Checking "users" table "id" column type...');
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id';
    `);
    
    if (res.rows.length > 0) {
      console.log(`✅ Column "id": ${res.rows[0].data_type}`);
    } else {
      console.log('❌ Table "users" or column "id" not found!');
    }
  } catch (error) {
    console.error('❌ [SCHEMA] Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
