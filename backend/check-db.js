
import "dotenv/config";
import { db } from "./config/db.js";
import { usersTable, messagesTable, userContactsTable } from "./drizzle/schema.js";

async function checkDB() {
  try {
    const allUsers = await db.select().from(usersTable);
    console.log(`Total users: ${allUsers.length}`);
    allUsers.forEach(u => console.log(` - User: ${u.userName} (id: ${u.id})`));

    const allMessages = await db.select().from(messagesTable);
    console.log(`Total messages: ${allMessages.length}`);
    allMessages.forEach(m => console.log(` - Msg: ${m.content.substring(0, 20)}... (from: ${m.senderId}, to: ${m.receiverId})`));

    const allContacts = await db.select().from(userContactsTable);
    console.log(`Total contacts: ${allContacts.length}`);
    allContacts.forEach(c => console.log(` - Contact: user ${c.userId} -> contact ${c.contactUserId}`));

    process.exit(0);
  } catch (error) {
    console.error("Error checking DB:", error);
    process.exit(1);
  }
}

checkDB();
