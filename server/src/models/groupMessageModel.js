import mongoose from "mongoose";

/**
 * @typedef {import("mongoose").Schema} Schema
 * @type {Schema} groupMessageSchema
 * @const groupMessageSchema - Schema for group messages
 * @property {Schema.Types.ObjectId} senderId - ID of the sender
 * @property {Schema.Types.ObjectId} groupId - ID of the group chat
 * @property {String} message - Message content
 * @property {Array} readBy - Array of user IDs who have read the message
 * @property {Date} createdAt - Date at which the message was created
 * @property {Date} updatedAt - Date at which the message was last updated
 */
const groupMessageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "GroupChat",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    { timestamps: true }
);

const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage; 