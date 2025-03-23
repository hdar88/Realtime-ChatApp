import jwt from "jsonwebtoken";

/**
 * Generate a JWT token and set it as a cookie.
 * @param userId user id
 * @param res response
 */
const generateTokenAndSetAsCookie = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '15d'
    });

    res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
        httpOnly: true, // prevent XSS attacks
        sameSite: "strict", // CSRF protection
        secure: process.env.NODE_ENV === "production" // Only send cookie over HTTPS in production
    });
};

export default generateTokenAndSetAsCookie;