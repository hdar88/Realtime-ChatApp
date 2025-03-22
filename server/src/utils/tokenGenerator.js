import jwt from "jsonwebtoken";

/**
 * Generate a JWT token and set it as a cookie.
 * @param userId user id
 * @param res response
 */
const generateTokenAndSetAsCookie = (userId, res) => {
    try {
        const token = jwt.sign({userId}, "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", {
            expiresIn: "1d",
        });

        res.cookie("jwt", token, {
            maxAge: 15 * 24 * 60 * 60 * 1000, // MS
            httpOnly: true, // prevent XSS attacks cross-site scripting attacks
            sameSite: "strict", // CSRF attacks cross-site request forgery attacks
            secure: process.env.NODE_ENV !== "development",
        });
    } catch (error) {
        console.log("Error generating token: ", error.message);
        res.status(500).json({error: "Failed to generate token"});
    }
};

export default generateTokenAndSetAsCookie;