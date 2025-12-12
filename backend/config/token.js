import jwt from "jsonwebtoken";

export const genToken = (id) => {
  try {
    // FIXED: Use 'userId' to match what authenticateUser expects
    const token = jwt.sign(
      { userId: id }, // Changed from {id} to {userId}
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return token;
  } catch (error) {
    // console.log(`Error in token generation: ${error.message}`);
    throw error; // Re-throw so caller knows it failed
  }
};