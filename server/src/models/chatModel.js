import mongoose from "mongoose";

/**
 * @typedef {import("mongoose").Schema} Schema
 * @type {Schema} chatSchema
 * @const chatSchema
 * @property {Array} participants - Array of user IDs
 * @property {Array} messages - Array of message IDs
 * @property {Date} createdAt - Date at which the chat was created
 * @property {Date} updatedAt - Date at which the chat was last updated
 * @property {function} toJSON - Function to convert chat object to JSON
 * @property {function} toObject - Function to convert chat object to Object
 */
const chatSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        messages: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Message",
                default: [],
            },
        ],
    },
    {timestamps: true}
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;