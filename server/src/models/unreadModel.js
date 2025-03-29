import mongoose from "mongoose";

/**
 * @typedef {import("mongoose").Schema} Schema
 * @type {Schema} unreadSchema
 * @const unreadSchema - Schema for unread messages
 * @property {Schema.Types.ObjectId} userId - ID of the user who has unread messages
 * @property {Schema.Types.ObjectId} fromUserId - ID of the user who sent the unread messages
 * @property {Number} count - Number of unread messages
 * @property {Date} updatedAt - Date at which the count was last updated
 * @property {Date} createdAt - Date at which the record was created
 */
const unreadSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    { timestamps: true }
);

// Create a compound index to ensure uniqueness of userId and fromUserId pairs
unreadSchema.index({ userId: 1, fromUserId: 1 }, { unique: true });

const Unread = mongoose.model("Unread", unreadSchema);

export default Unread; 