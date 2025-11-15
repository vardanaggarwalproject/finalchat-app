import { genToken } from "../config/token.js";
import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
export const signUp = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    const checkUserByUserName = await User.findOne({ userName });

    if (checkUserByUserName) {
      return res.status(400).json({ message: "username already exists" });
    }
    const checkUserByUserEmail = await User.findOne({ email });
    if (checkUserByUserEmail) {
      return res.status(400).json({ message: "email already exists" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "password must be at least 6 characters long" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      userName,
      email,
      password: hashedPassword,
    });

    const token = genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "None",
    });

    return res.status(201).json({ user, token });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error during signup",error: error.message } );
  }
};


export const Login = async (req, res) => {
  try {
    const {email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not exists" });
    }
    const confirmPassword = await bcrypt.compare(password, user.password);
   if(!confirmPassword){
        return res.status(400).json({message:"invalid password"});
   }
    const token = genToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "None",
    });

    return res.status(200).json({ user, token });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error during Login" });
  }
};

export const Logout = async (req, res) => {
    try {
        res.clearCookie("token");
        res.status(200).json({message:"Logged out successfully"});
    } catch (error) {
        res.status(500).json({message:" error during Log out"});
    }
}