import User from "../models/userModel.js";

/**
 * Fetches all users except the logged-in user.
 * @param req request
 * @param res response
 * @returns {Promise<void>} void
 */
export const fetchUserList = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const filteredUsers = await User.find({_id: {$ne: loggedInUserId}}).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error while trying to fetch all users: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
};