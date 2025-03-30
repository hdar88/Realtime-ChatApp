import Unread from "../models/unreadModel.js";

/**
 * Get unread messages count for a user
 * @param req request
 * @param res response
 * @returns {Promise<*>} response
 */
export const getUnreadMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find all unread message records for this user
        const unreadMessages = await Unread.find({ userId });
        
        // Format the response
        const formattedUnread = {};
        unreadMessages.forEach(unread => {
            formattedUnread[unread.fromUserId.toString()] = unread.count;
        });
        
        res.status(200).json(formattedUnread);
    } catch (error) {
        console.log("Error getting unread messages: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Increment unread message count
 * @param {string} userId - User ID who will receive the message
 * @param {string} fromUserId - User ID who sent the message
 * @returns {Promise<void>}
 */
export const incrementUnreadCount = async (userId, fromUserId) => {
    try {
        // Find and update the unread count, creating a new record if it doesn't exist
        await Unread.findOneAndUpdate(
            { userId, fromUserId },
            { $inc: { count: 1 } },
            { upsert: true, new: true }
        );
        
        console.log(`Incremented unread count for user ${userId} from ${fromUserId}`);
    } catch (error) {
        console.log("Error incrementing unread count: ", error.message);
    }
};

/**
 * Reset unread message count
 * @param req request
 * @param res response
 * @returns {Promise<*>} response
 */
export const resetUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { fromUserId } = req.params;
        
        // Find and update the unread count to 0
        await Unread.findOneAndUpdate(
            { userId, fromUserId },
            { count: 0 },
            { upsert: true }
        );
        
        res.status(200).json({ message: "Unread count reset successfully" });
    } catch (error) {
        console.log("Error resetting unread count: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}; 