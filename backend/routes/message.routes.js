import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  getDirectMessages,
  sendDirectMessage,
  getConversations,
  markMessagesAsRead,
} from "../controllers/message.controllers.js";

const router = express.Router();

// Direct message routes
router.get("/direct/:userId", isAuth, getDirectMessages);
router.post("/direct", isAuth, sendDirectMessage);
router.get("/conversations", isAuth, getConversations);
router.post("/mark-read/:userId", isAuth, markMessagesAsRead);

export default router;