import mongoose from "mongoose";

/**
 * User schema for MongoDB
 * @type {mongoose.Schema} userSchema
 * @const userSchema
 * @property {string} fullName - User's full name.
 * @property {string} username - User's username.
 * @property {string} password - User's password.
 * @property {String} gender - User's gender
 * @property {string} profilePic - User's profile picture.
 * @property {Date} createdAt - User's creation date.
 * @property {Date} updatedAt - User's last update date.
 */
const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        gender: {
            type: String,
            required: false,
            enum: ["male", "female", "divers"],
            default: "divers",
        },
        profilePic: {
            type: String,
            default: "",
        },
        createdAt: {
            type: Date,
            default: new Date(),
        },
    },
    {timestamps: true}
);

const User = mongoose.model("User", userSchema);

export default User;