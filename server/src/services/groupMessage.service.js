import GroupMessage from "../models/groupMessageModel.js";
import GroupChat from "../models/groupChatModel.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

/**
 * Send a message to a group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const sendGroupMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { message, tempId } = req.body;
        const userId = req.user._id;

        // Validate message
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Check if the group exists
        const groupChat = await GroupChat.findById(groupId);
        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Check if the user is a member of the group
        if (!groupChat.members.includes(userId)) {
            return res.status(403).json({ error: "You are not a member of this group" });
        }

        // Create and save the message
        const newMessage = new GroupMessage({
            senderId: userId,
            groupId,
            message,
            readBy: [userId] // Sender has implicitly read the message
        });

        await newMessage.save();

        // Populate sender info for the message
        const populatedMessage = await GroupMessage.findById(newMessage._id)
            .populate("senderId", "username fullName profilePic");

        // Add tempId to the message object for client tracking
        const messageToSend = populatedMessage.toObject();
        if (tempId) {
            messageToSend.tempId = tempId;
        }

        // Emit the message to all online group members
        groupChat.members.forEach(memberId => {
            if (memberId.toString() !== userId.toString()) { // Don't send to self
                const memberSocketId = getReceiverSocketId(memberId.toString());
                if (memberSocketId) {
                    io.to(memberSocketId).emit("newGroupMessage", messageToSend);
                }
            }
        });

        res.status(201).json(messageToSend);
    } catch (error) {
        console.error("Error sending group message:", error);
        res.status(500).json({ error: "Failed to send group message" });
    }
};

/**
 * Get messages for a group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if the group exists
        const groupChat = await GroupChat.findById(groupId);
        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Check if the user is a member of the group
        if (!groupChat.members.includes(userId)) {
            return res.status(403).json({ error: "You are not a member of this group" });
        }

        // Get all messages for the group
        const messages = await GroupMessage.find({ groupId })
            .populate("senderId", "username fullName profilePic")
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching group messages:", error);
        res.status(500).json({ error: "Failed to fetch group messages" });
    }
};

/**
 * Mark a group message as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markGroupMessageAsRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        // Find the message
        const message = await GroupMessage.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        // Check if the user is in the group
        const groupChat = await GroupChat.findById(message.groupId);
        if (!groupChat || !groupChat.members.includes(userId)) {
            return res.status(403).json({ error: "You are not authorized to mark this message as read" });
        }

        // Check if the user has already read the message
        if (message.readBy.includes(userId)) {
            return res.status(200).json({ message: "Message already marked as read" });
        }

        // Add user to readBy array
        message.readBy.push(userId);
        await message.save();

        // Notify message sender that the message has been read
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
            io.to(senderSocketId).emit("groupMessageRead", {
                messageId: message._id,
                groupId: message.groupId,
                readerId: userId
            });
        }

        res.status(200).json({ message: "Message marked as read" });
    } catch (error) {
        console.error("Error marking message as read:", error);
        res.status(500).json({ error: "Failed to mark message as read" });
    }
};

/**
 * Get unread messages count for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getGroupUnreadCount = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if the group exists
        const groupChat = await GroupChat.findById(groupId);
        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Check if the user is a member of the group
        if (!groupChat.members.includes(userId)) {
            return res.status(403).json({ error: "You are not a member of this group" });
        }

        // Count messages that the user hasn't read
        const unreadCount = await GroupMessage.countDocuments({
            groupId,
            readBy: { $ne: userId },
            senderId: { $ne: userId } // Don't count own messages
        });

        res.status(200).json({ unreadCount });
    } catch (error) {
        console.error("Error getting unread count:", error);
        res.status(500).json({ error: "Failed to get unread count" });
    }
};

/**
 * Get unread message counts for all user's groups
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllGroupsUnreadCounts = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all groups the user is a member of
        const userGroups = await GroupChat.find({ members: userId });
        const groupIds = userGroups.map(group => group._id);

        // Initialize unread counts object
        const unreadCounts = {};
        
        // For each group, get the unread count
        for (const groupId of groupIds) {
            const unreadCount = await GroupMessage.countDocuments({
                groupId,
                readBy: { $ne: userId },
                senderId: { $ne: userId } // Don't count own messages
            });
            
            unreadCounts[groupId.toString()] = unreadCount;
        }

        res.status(200).json(unreadCounts);
    } catch (error) {
        console.error("Error getting all group unread counts:", error);
        res.status(500).json({ error: "Failed to get unread counts" });
    }
};

/**
 * Mark all messages in a group as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAllGroupMessagesAsRead = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if the group exists
        const groupChat = await GroupChat.findById(groupId);
        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Check if the user is a member of the group
        if (!groupChat.members.includes(userId)) {
            return res.status(403).json({ error: "You are not a member of this group" });
        }

        // Find all unread messages in the group
        const unreadMessages = await GroupMessage.find({
            groupId,
            readBy: { $ne: userId },
            senderId: { $ne: userId } // Only mark others' messages as read
        });

        // Mark each message as read
        for (const message of unreadMessages) {
            message.readBy.push(userId);
            await message.save();

            // Notify the sender that their message has been read
            const senderSocketId = getReceiverSocketId(message.senderId.toString());
            if (senderSocketId) {
                io.to(senderSocketId).emit("groupMessageRead", {
                    messageId: message._id,
                    groupId,
                    readerId: userId
                });
            }
        }

        res.status(200).json({ 
            message: `${unreadMessages.length} messages marked as read`,
            count: unreadMessages.length
        });
    } catch (error) {
        console.error("Error marking all messages as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
    }
}; 