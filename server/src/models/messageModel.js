import mongoose from "mongoose";

/**
 * @typedef {import("mongoose").Schema} Schema
 * @type {Schema} messageSchema
 * @const messageSchema - Schema for messages
 * @property {Schema.Types.ObjectId} senderId - ID of the sender
 * @property {Schema.Types.ObjectId} receiverId - ID of the receiver
 * @property {String} message - Message content
 * @property {Date} createdAt - Date at which the message was created
 * @property {Date} updatedAt - Date at which the message was last updated
 */
const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
    },
    {timestamps: true}
);

const Message = mongoose.model("Message", messageSchema);

export default Message;