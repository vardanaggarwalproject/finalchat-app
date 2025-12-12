import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { getCurrentUser, getAllUsers, updateUserStatus, updateUserProfile } from "../controllers/user.controllers.js";

const userRouter = express.Router();

// Middleware to inject io instance
export const setIOMiddleware = (io) => {
  return (req, res, next) => {
    req.io = io;
    next();
  };
};

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.get("/all", isAuth, getAllUsers);
userRouter.post("/status", isAuth, updateUserStatus);

// Profile update route with socket broadcast
userRouter.put("/update", isAuth, async (req, res) => {
  try {
    // Call the controller function
    await updateUserProfile(req, res);

    // Broadcast profile update via socket if update was successful
    if (req.io && res.locals.updatedUser) {
      // console.log(" Broadcasting profile update for user:", res.locals.updatedUser.id);
      // Broadcast to ALL connected clients (including other browser windows/tabs)
      // Use io.emit() to send to all connected sockets across all rooms
      req.io.emit("profile_updated", {
        userId: res.locals.updatedUser.id,
        user: res.locals.updatedUser
      });
      // console.log("Profile update broadcasted to all clients");
    }
  } catch (error) {
    console.error("Profile update route error:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
});

export default userRouter;