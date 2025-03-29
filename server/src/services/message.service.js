import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";

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
        
        // Increment unread message count for receive
        res.status(201).json(newMessage);
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