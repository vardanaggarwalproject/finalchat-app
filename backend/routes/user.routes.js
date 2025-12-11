import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { getCurrentUser, getAllUsers, updateUserStatus } from "../controllers/user.controllers.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.get("/all", isAuth, getAllUsers);
userRouter.post("/status", isAuth, updateUserStatus);

export default userRouter;