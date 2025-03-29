import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";
import { io } from "../socket/socket.js";
import { getReceiverSocketId } from "../socket/socket.js";

/**
 * Controller to send a message to another user.
 * @param req request
 * @param res response
 * @returns {Promise<*>} response
 */
export const sendMessage = async (req, res) => {
    try {
        const {message} = req.body;
        const {id: receiverId} = req.params;
        const senderId = req.user._id;
        const tempId = req.body.tempId; // Extract tempId if provided

        let chat = await Chat.findOne({
            participants: {$all: [senderId, receiverId]},
        });

        if (!chat) {
            chat = await Chat.create({
                participants: [senderId, receiverId],
            });
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            message,
        });

        if (newMessage) {
            chat.messages.push(newMessage._id);
        }

        // Save both chat and message
        await Promise.all([chat.save(), newMessage.save()]);
        
        // Log the saved message for debugging
        console.log("Message saved with ID:", newMessage._id);
        
        // If there was a tempId, notify both sender and receiver about the real ID
        if (tempId) {
            // Get the sender socket ID and notify them about the ID update
            const senderSocketId = getReceiverSocketId(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messageIdUpdate", {
                    tempId: tempId,
                    realId: newMessage._id.toString()
                });
            }
            
            // Get the receiver socket ID and notify them about the ID update
            const receiverSocketId = getReceiverSocketId(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("messageIdUpdate", {
                    tempId: tempId,
                    realId: newMessage._id.toString()
                });
            }
        }
        
        // Return the complete message with all fields
        const savedMessage = await Message.findById(newMessage._id);
        res.status(201).json(savedMessage);
    } catch (error) {
        console.log("Error while trying to send a message: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
};

/**
 * Controller to get messages between two users.
 * @param req request
 * @param res response
 * @returns {Promise<*>} response
 */
export const getMessages = async (req, res) => {
    try {
        const {id: userToChatId} = req.params;
        const senderId = req.user._id;

        const chat = await Chat.findOne({
            participants: {$all: [senderId, userToChatId]},
        }).populate("messages");

        if (!chat) return res.status(200).json([]);

        const messages = chat.messages;

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error occuring while trying to get messages: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
};

/**
 * Controller to mark a message as read
 * @param req request
 * @param res response
 * @returns {Promise<*>} response
 */
export const markMessageAsRead = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        
        // Find and update the message
        const message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        
        // Check if the current user is the recipient of the message
        if (message.receiverId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Not authorized to mark this message as read" });
        }
        
        // Update the message read status
        message.isRead = true;
        message.readAt = new Date();
        
        await message.save();
        
        res.status(200).json({ success: true, message: "Message marked as read" });
    } catch (error) {
        console.log("Error marking message as read: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};