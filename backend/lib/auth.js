import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

let authInstance = null;

export async function initAuth() {
  if (authInstance) return authInstance;  // Prevent double init

  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db();

  authInstance = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: "/api/better-auth",
    secret: process.env.BETTER_AUTH_SECRET,
     origin: ["http://localhost:5173"],
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectURI: `http://${import.meta.env.VITE_BACKEND_URL}/api/better-auth/callback/github`,
      },
    },
    database: mongodbAdapter(db, { client }),
    experimental: { joins: true },
   
  });
  // console.log(`better-auth initialized with MongoDB adapter`);
  return authInstance;
}
