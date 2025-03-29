import mongoose from "mongoose";

/**
 * @typedef {import("mongoose").Schema} Schema
 * @type {Schema} groupChatSchema
 * @const groupChatSchema - Schema for group chats
 * @property {String} name - Group chat name
 * @property {String} description - Group description
 * @property {Array} members - Array of user IDs who are members of the group
 * @property {Array} admins - Array of user IDs who are admins of the group
 * @property {Schema.Types.ObjectId} creator - ID of the user who created the group
 * @property {String} groupPic - Group picture URL
 * @property {Date} createdAt - Date at which the group was created
 * @property {Date} updatedAt - Date at which the group was last updated
 */
const groupChatSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        admins: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        groupPic: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

const GroupChat = mongoose.model("GroupChat", groupChatSchema);

export default GroupChat; 