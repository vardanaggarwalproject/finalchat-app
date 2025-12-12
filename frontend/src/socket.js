// src/socket.js
import { io } from "socket.io-client";

// Helper function to get token from localStorage (httpOnly cookies can't be read by JS)
const getToken = () => {
  // Try localStorage first (where we store the token for socket auth)
  const token = localStorage.getItem("token");

  if (token) {
    console.log("✅ Token found in localStorage");
    return token;
  }

  console.error("❌ No token found in localStorage!");
  return null;
};

// Create socket connection with proper config
const socket = io("http://localhost:8000", {
  withCredentials: true,
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  auth: (cb) => {
    // Dynamically get token when connecting
    const token = getToken();
    console.log("🔐 Authenticating socket with token:", token ? "✓ Token found" : "✗ No token");
    cb({ token });
  }
});

// Connection event handlers
socket.on("connect", () => {
  console.log("✅ Socket connected successfully:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error.message);
  console.error("Error details:", error);
});

export default socket;