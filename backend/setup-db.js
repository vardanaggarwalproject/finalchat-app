import 'dotenv/config';
import { db } from './config/db.js';
import { sql } from 'drizzle-orm';

/**
 * Setup script to create the user_contacts table
 * Run this once to initialize the contacts feature
 */

async function setupDatabase() {
  try {
    console.log('🔧 [SETUP] Starting database setup...\n');

    // Create user_contacts table
    console.log('📦 [SETUP] Creating user_contacts table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_contacts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "contact_user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "added_for_chat" boolean DEFAULT true,
        "added_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "unique_user_contact" UNIQUE("user_id", "contact_user_id")
      )
    `);
    console.log('✅ [SETUP] Table "user_contacts" created successfully!\n');

    // Create indexes for better performance
    console.log('📑 [SETUP] Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_user_contacts_user_id" ON "user_contacts"("user_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_user_contacts_contact_user_id" ON "user_contacts"("contact_user_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_user_contacts_added_for_chat" ON "user_contacts"("added_for_chat")
    `);
    console.log('✅ [SETUP] All indexes created successfully!\n');

    console.log('🎉 [SETUP] Database setup completed successfully!');
    console.log('💡 [INFO] The user_contacts feature is now ready to use.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ [SETUP] Database setup failed:');
    console.error(error);
    console.error('\n💡 [INFO] If the table already exists, this is expected.\n');
    process.exit(1);
  }
}

setupDatabase();
