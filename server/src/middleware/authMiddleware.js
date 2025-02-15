import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

/**
 * Middleware to protect routes. Checks if the user is authenticated.
 * @param req request
 * @param res response
 * @param next callback
 * @returns {Promise<*>} response
 */
const protectedRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).json({error: "Unauthorized - No Token Provided"});
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (!decoded) {
            return res.status(401).json({error: "Unauthorized - Invalid Token"});
        }

        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(404).json({error: "User not found"});
        }

        req.user = user;

        next();
    } catch (error) {
        console.log("Error while trying to verify token: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
};

export default protectedRoute;