import { genToken } from "../config/token.js";
import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import { usersTable } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

export const Logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: " error during Log out" });
  }
};

export const signUp = async (req, res) => {
  try {
    let { userName, email, password } = req.body;
    email = req.body.email.toLowerCase();

    // 1. Check username existence
    const userNameExists = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userName, userName));

    if (userNameExists.length > 0) {
      return res.status(400).json({ message: "username already exists" });
    }

    // 3. Check email existence
    const emailExists = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (emailExists.length > 0) {
      return res.status(400).json({ message: "email already exists" });
    }

    // 4. Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "password must be at least 6 characters long",
      });
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Insert user
    const [newUser] = await db
      .insert(usersTable)
      .values({
        userName,
        email,
        password: hashedPassword,
      })
      .returning(); // equivalent of Mongo create()

    // 7. Generate token
    const token = genToken(newUser.id);

    // 8. Cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "None",
    });

    return res.status(201).json({ user: newUser, token });
  } catch (error) {
  console.error("SIGNUP ERROR:", error);
  return res.status(500).json({
    message: "Internal server error during signup",
    error: error.message,
    full: error   // <-- SHOW FULL ERROR
  });
}

};

export const Login = async (req, res) => {
  try {
    let { email, password } = req.body;
     email = req.body.email.toLowerCase();

    // 1. Find user by email
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    const user = users[0];

    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    // 2. Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 3. Generate token
    const token = genToken(user.id);

    // 4. Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // sameSite: "None",
      // secure: true,
    });

    return res.status(200).json({ user, token });
  } catch (error) {
  console.error("LOGIN ERROR:", error);
  return res.status(500).json({
    message: "Internal server error during login",
    error: error.message,
    full: error   // <-- SHOW REAL ERROR
  });
}

};
