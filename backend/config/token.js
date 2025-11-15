import jwt from "jsonwebtoken";


export const genToken = async(id) => {
    try {
        const token = jwt.sign({id},process.env.JWT_SECRET,
            {expiresIn: "7d"}
        )

        return token;
    } catch (error) {
        console.log(`Error in token generation: ${error.message}`);
    }
}