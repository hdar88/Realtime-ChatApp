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

/**
 * Updates user profile information
 * @param req request
 * @param res response
 * @returns {Promise<void>} void
 */
export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { fullName, username, gender, profilePic } = req.body;
        
        // Check if any data was provided
        if (!fullName && !username && !gender && !profilePic) {
            return res.status(400).json({ error: "No profile data provided for update" });
        }
        
        // Create update object with only provided fields
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (gender) updateData.gender = gender;
        if (profilePic) updateData.profilePic = profilePic;
        
        // If username is being updated, check if it's already taken
        if (username) {
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ error: "Username already taken" });
            }
            updateData.username = username;
        }
        
        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            updateData,
            { new: true, runValidators: true }
        ).select("-password");
        
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating user profile:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Gets the current user's profile information
 * @param req request
 * @param res response
 * @returns {Promise<void>} void
 */
export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId).select("-password");
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching current user:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};