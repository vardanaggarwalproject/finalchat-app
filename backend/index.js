import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import connectDB from "./config/dbConnection.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import { initAuth } from "./lib/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
console.log("ENV CHECK:", {
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
});
console.log("BETTER_AUTH_URL RAW:", JSON.stringify(process.env.BETTER_AUTH_URL));

const auth = await initAuth();
// console.log(auth);
app.use("/api/better-auth", toNodeHandler(auth));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
