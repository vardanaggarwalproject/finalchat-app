import express from "express";
import { Login, Logout,signUp} from "../controllers/auth.controllers.js";

const authRouter = express.Router();

authRouter.post("/signup",signUp);
authRouter.post("/login",Login);
authRouter.get("/logout",Logout);

export default authRouter;
