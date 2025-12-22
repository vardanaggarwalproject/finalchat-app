import { useEffect, useRef, useCallback } from "react";
import socket from "../socket";

/**
 * Custom hook to manage user online/offline status
 * Detects when user closes the browser tab/window and marks them as offline
 *
 * This hook should be called in the main chat component to ensure
 * proper cleanup when the user leaves
 */
export const useOnlineStatusManager = (userId, currentUser) => {
  const userIdRef = useRef(userId);
  const offlineHandledRef = useRef(false);

  // Update ref when userId changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Handle page unload/tab close
  useEffect(() => {
    // Only setup handlers if user is authenticated
    if (!currentUser?.id || !socket) return;

    // Reset flag when component mounts
    offlineHandledRef.current = false;

    /**
     * Handle beforeunload event (triggered when user closes tab/window or navigates away)
     * This is called BEFORE the page is unloaded, so socket is still connected
     */
    const handleBeforeUnload = () => {
      if (!offlineHandledRef.current && socket.connected) {
        offlineHandledRef.current = true;

        console.log("📵 User closing tab - marking offline:", currentUser.id);

        // Emit explicit offline event with synchronous flag
        // Using 'volatile' flag for messages that don't require acknowledgment
        socket.emit(
          "user_going_offline",
          {
            userId: currentUser.id,
            timestamp: new Date().toISOString(),
          },
          (acknowledgement) => {
            console.log("✅ Offline event acknowledged by server:", acknowledgement);
          }
        );

        // Give server a brief moment to process before disconnect
        // Note: Most browsers will allow 1-2ms of execution
      }
    };

    /**
     * Handle unload event (fallback, triggered right after beforeunload)
     * Also handles cases where beforeunload might be blocked
     */
    const handleUnload = () => {
      if (!offlineHandledRef.current && socket.connected) {
        offlineHandledRef.current = true;

        console.log("📵 Page unload detected - disconnecting socket:", currentUser.id);

        // Immediately disconnect socket on unload
        socket.disconnect();
      }
    };

    /**
     * Handle page visibility changes
     * Marks user offline when tab becomes hidden, online when visible
     */
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("⚫ Tab hidden - sending idle status");
        // Optional: Send a different status for "idle" vs "offline"
        // For now, we'll just send idle
        if (socket.connected) {
          socket.emit("user_idle", {
            userId: currentUser.id,
            isIdle: true,
          });
        }
      } else {
        console.log("🟢 Tab visible - sending active status");
        // User came back, send online status
        if (socket.connected) {
          socket.emit("user_idle", {
            userId: currentUser.id,
            isIdle: false,
          });
        }
      }
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    console.log("✅ Online status manager initialized for user:", currentUser.id);

    // Cleanup function - remove listeners when component unmounts
    return () => {
      console.log("🧹 Cleaning up online status manager listeners");

      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser]);

  return {
    isSetup: Boolean(currentUser?.id),
  };
};

/**
 * Helper function to manually mark user as offline
 * Useful if you need to programmatically logout user
 */
export const markUserOffline = async (userId) => {
  if (!socket.connected) {
    console.warn("⚠️ Socket not connected, cannot mark user offline");
    return false;
  }

  return new Promise((resolve) => {
    socket.emit(
      "user_going_offline",
      {
        userId,
        timestamp: new Date().toISOString(),
      },
      (acknowledgement) => {
        console.log("✅ User marked offline:", acknowledgement);
        resolve(true);
      }
    );
  });
};

export default useOnlineStatusManager;
