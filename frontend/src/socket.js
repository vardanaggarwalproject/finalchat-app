// src/socket.js
import { io } from "socket.io-client";

// Create socket connection
const socket = io("http://localhost:8000", {
  withCredentials: true,
  autoConnect: false, // Don't connect automatically
});

// Connection event handlers
socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log(" Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error(" Socket connection error:", error);
});

export default socket;