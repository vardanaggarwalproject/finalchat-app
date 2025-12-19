/* eslint-disable no-console */
// src/socket.js
import { io } from "socket.io-client";

// Helper function to get token from localStorage (httpOnly cookies can't be read by JS)
const getToken = () => {
  // Try localStorage first (where we store the token for socket auth)
  const token = localStorage.getItem("token");

  if (token) {
    // console.log("Token found in localStorage");
    return token;
  }

  // console.error(" No token found in localStorage!");
  return null;
};

// Get backend URL from environment or determine from current location
const getBackendUrl = () => {
  // Priority 1: Environment variable (production deployment)
  if (import.meta.env.VITE_BACKEND_URL) {
    console.log("✅ [SOCKET] Using environment variable VITE_BACKEND_URL");
    console.log("   URL:", import.meta.env.VITE_BACKEND_URL);
    return import.meta.env.VITE_BACKEND_URL;
  }

  // Priority 2: Use current window location (automatic detection)
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;

  // Build backend URL using same protocol and hostname as frontend
  let backendUrl;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Local development - use localhost backend
    backendUrl = `${protocol}//${import.meta.env.VITE_BACKEND_URL}`;
    console.log("✅ [SOCKET] Auto-detected: Running locally (localhost)");
  } else {
    // Remote/cross-system - use same host with backend port
    backendUrl = `${protocol}//${hostname}:8000`;
    console.log("✅ [SOCKET] Auto-detected: Cross-system connection");
  }

  console.log(
    "   Frontend accessed from: " +
      protocol +
      "//" +
      hostname +
      (port ? ":" + port : "")
  );
  console.log("   Backend will connect to:", backendUrl);
  console.log("   💡 Both users MUST access frontend from same URL!");

  return backendUrl;
};

// Create socket connection with proper config
const socket = io(getBackendUrl(), {
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  auth: (cb) => {
    // Dynamically get token when connecting
    const token = getToken();
    // console.log(" Authenticating socket with token:", token ? "✓ Token found" : "✗ No token");
    cb({ token });
  },
});

// Log the backend URL for debugging
const backendUrl = getBackendUrl();
console.log(`🔌 Socket connecting to: ${backendUrl}`);

// ============ IMPORTANT FOR CROSS-SYSTEM SETUP ============
// Global function to set backend URL (for testing/debugging)
// Usage in browser console: setSocketBackendUrl("http://192.168.1.100:8000")
window.setSocketBackendUrl = (url) => {
  console.log(`📝 Setting backend URL to: ${url}`);
  sessionStorage.setItem("backendUrl", url);
  console.log("⚠️  Please refresh the page (F5) to apply changes");
  alert(
    "Backend URL updated to: " +
      url +
      "\n\nPlease refresh the page (F5) to apply changes"
  );
};

// Export function to check current connection
window.checkSocketStatus = () => {
  console.log({
    connected: socket.connected,
    socketId: socket.id,
    connectedUrl: backendUrl,
    userInStorage: localStorage.getItem("user"),
    tokenInStorage: !!localStorage.getItem("token"),
  });
};

// ========================================================

// Connection event handlers
socket.on("connect", () => {
  console.log("✅ Socket connected successfully:", socket.id);
  console.log("   Backend URL:", backendUrl);
  console.log("   User should now appear online on backend");
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected. Reason:", reason);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error.message);
  console.error("   This means socket cannot reach backend at:", backendUrl);
  console.error("   Error details:", error);
});

export default socket;
