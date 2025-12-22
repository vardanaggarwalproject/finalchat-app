-- Create user_contacts table for tracking friend/contact relationships
CREATE TABLE IF NOT EXISTS "user_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "contact_user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "added_for_chat" boolean DEFAULT true,
  "added_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unique_user_contact" UNIQUE("user_id", "contact_user_id")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_user_contacts_user_id" ON "user_contacts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_contacts_contact_user_id" ON "user_contacts"("contact_user_id");
CREATE INDEX IF NOT EXISTS "idx_user_contacts_added_for_chat" ON "user_contacts"("added_for_chat");
