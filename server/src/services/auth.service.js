import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import generateTokenAndSetAsCookie from "../utils/tokenGenerator.js";

/**
 * @route POST /signup
 * @description Signup a new user
 * @access public route
 * @param req fullName, username, password
 * @param res user data
 * @returns {Promise<*>} user data
 */
export const signup = async (req, res) => {
    try {
        const {fullName, username, password, confirmPassword, gender} = req.body;

        const validationError = validateSignUpRequest(
            {fullName, username, password, confirmPassword});
        if (validationError) {
            return res.status(validationError.status).json({error: validationError.error});
        }

        const user = await User.findOne({username});

        if (user) {
            return res.status(400).json({error: "Username already exists"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const maleProfilePic = `https://avatar.iran.liara.run/public/boy?username=${username}`;
        const femaleProfilePic = `https://avatar.iran.liara.run/public/girl?username=${username}`;
        const diversProfilePic = `https://avatar.iran.liara.run/public/random?username=${username}`;

        const userGender = gender?.trim() ? gender : undefined;

        const newUser = new User({
            fullName,
            username,
            password: hashedPassword,
            gender: userGender,
            profilePic: gender === "male" ? maleProfilePic :
                gender === "female" ? femaleProfilePic
                    : diversProfilePic,
        });

        if (newUser) {
            await newUser.save();
            // Generate token and set cookie for new user
            generateTokenAndSetAsCookie(newUser._id, res);
            
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                username: newUser.username,
                profilePic: newUser.profilePic
            });
        } else {
            res.status(400).json({error: "Invalid user data"});
        }
    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
};

/**
 * @route POST /login
 * @param req username, password
 * @param res user data
 * @returns {Promise<*>} user data
 */
export const login = async (req, res) => {
    try {
        const {username, password} = req.body;
        const user = await User.findOne({username});
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

        if (!user || !isPasswordCorrect) {
            return res.status(400).json({error: "Invalid username or password"});
        }

        // Generate JWT token and set as HTTP-only cookie
        generateTokenAndSetAsCookie(user._id, res);

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            username: user.username,
            profilePic: user.profilePic,
        });
    } catch (error) {
        console.log("Error while trying to login:", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
};

/**
 * @route POST /logout
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
export const logout = async (req, res) => {
    try {
        // Clear the JWT cookie
        res.cookie("jwt", "", {
            maxAge: 0,
            httpOnly: true,
            sameSite: "strict"
        });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * @route GET /me
 * @description Get user data from JWT token
 * @access private route
 * @param req user object from protectedRoute middleware
 * @param res user data
 * @returns {Promise<*>} user data
 */
export const getMe = async (req, res) => {
    try {
        // User data is already attached to req by the protectedRoute middleware
        const user = req.user;

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            username: user.username,
            profilePic: user.profilePic,
        });
    } catch (error) {
        console.log("Error in getMe controller:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * Validates the data for signup users.
 */
const validateSignUpRequest = ({fullName, username, password, confirmPassword}) => {
    if (!fullName || fullName.trim() === "") {
        return {status: 400, error: "Full name cannot be empty."};
    }
    if (!username || username.trim() === "") {
        return {status: 400, error: "Username cannot be empty."};
    }
    if (!password || password.trim() === "") {
        return {status: 400, error: "Password cannot be empty."};
    }
    if (password.length < 6) {
        return {status: 400, error: "Password must be at least 6 characters long."};
    }
    if (password !== confirmPassword) {
        return {status: 400, error: "Passwords don't match."};
    }
    return null;
};