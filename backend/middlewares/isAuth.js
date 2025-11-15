import jwt from "jsonwebtoken";

const isAuth = async(req,res,next) => {
    try {
            let token = req.cookies.token;

            if(!token)
            {
                res.status(400).json({message: "Token is not found"});
            }

            let verifyToken = await jwt.verify(token,process.env.JWT_SECRET);

            console.log(verifyToken);
            req.userId = verifyToken.userId;
            next();
    } catch (error) {
        return res.status(500).json({message: `is Auth error ${error.message}`});
    }
}

export default isAuth;