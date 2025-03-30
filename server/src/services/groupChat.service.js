import GroupChat from "../models/groupChatModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import User from "../models/userModel.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

/**
 * Create a new group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createGroupChat = async (req, res) => {
    try {
        const { name, description, members, groupPic } = req.body;
        const userId = req.user._id;

        if (!name) {
            return res.status(400).json({ error: "Group name is required" });
        }

        // Ensure members is an array and is not empty
        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ error: "Please add at least one member to the group" });
        }

        // Add the creator to members and admins arrays
        const allMembers = [...new Set([...members, userId.toString()])];

        const newGroupChat = new GroupChat({
            name,
            description,
            members: allMembers,
            admins: [userId], // Creator is always an admin
            creator: userId,
            groupPic: groupPic || "" // Save group picture if provided
        });

        await newGroupChat.save();

        // Populate the group chat with user info
        const populatedGroupChat = await GroupChat.findById(newGroupChat._id)
            .populate("members", "username fullName profilePic")
            .populate("admins", "username fullName profilePic")
            .populate("creator", "username fullName profilePic");

        // Notify all group members about the new group
        allMembers.forEach(memberId => {
            const memberSocketId = getReceiverSocketId(memberId);
            if (memberSocketId) {
                io.to(memberSocketId).emit("newGroupChat", populatedGroupChat);
            }
        });

        res.status(201).json(populatedGroupChat);
    } catch (error) {
        console.error("Error creating group chat:", error);
        res.status(500).json({ error: "Failed to create group chat" });
    }
};

/**
 * Get all group chats for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserGroupChats = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all group chats where the user is a member
        const groupChats = await GroupChat.find({ members: userId })
            .populate("members", "username fullName profilePic")
            .populate("admins", "username fullName profilePic")
            .populate("creator", "username fullName profilePic")
            .sort({ updatedAt: -1 });

        res.status(200).json(groupChats);
    } catch (error) {
        console.error("Error fetching user group chats:", error);
        res.status(500).json({ error: "Failed to fetch group chats" });
    }
};

/**
 * Get a specific group chat by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getGroupChatById = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Find the group chat
        const groupChat = await GroupChat.findById(groupId)
            .populate("members", "username fullName profilePic")
            .populate("admins", "username fullName profilePic")
            .populate("creator", "username fullName profilePic");

        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Check if the user is a member of the group
        if (!groupChat.members.some(member => member._id.toString() === userId.toString())) {
            return res.status(403).json({ error: "You are not a member of this group" });
        }

        res.status(200).json(groupChat);
    } catch (error) {
        console.error("Error fetching group chat:", error);
        res.status(500).json({ error: "Failed to fetch group chat" });
    }
};

/**
 * Update a group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateGroupChat = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, groupPic } = req.body;
        const userId = req.user._id;

        // Find the group chat
        const groupChat = await GroupChat.findById(groupId);

        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Check if the user is an admin
        if (!groupChat.admins.includes(userId)) {
            return res.status(403).json({ error: "Only admins can update the group" });
        }

        // Update the group chat
        if (name) groupChat.name = name;
        if (description !== undefined) groupChat.description = description;
        if (groupPic) groupChat.groupPic = groupPic;

        await groupChat.save();

        // Populate the updated group chat
        const updatedGroupChat = await GroupChat.findById(groupId)
            .populate("members", "username fullName profilePic")
            .populate("admins", "username fullName profilePic")
            .populate("creator", "username fullName profilePic");

        // Notify all group members about the update
        updatedGroupChat.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupChatUpdated", updatedGroupChat);
            }
        });

        res.status(200).json(updatedGroupChat);
    } catch (error) {
        console.error("Error updating group chat:", error);
        res.status(500).json({ error: "Failed to update group chat" });
    }
};

/**
 * Add members to a group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { members } = req.body;
        const userId = req.user._id;

        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ error: "Please provide members to add" });
        }

        // Find the group chat
        const groupChat = await GroupChat.findById(groupId);

        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Check if the user is an admin
        if (!groupChat.admins.includes(userId)) {
            return res.status(403).json({ error: "Only admins can add members" });
        }

        // Add new members (avoid duplicates)
        const allMembers = [...new Set([...groupChat.members.map(id => id.toString()), ...members])];
        groupChat.members = allMembers;

        await groupChat.save();

        // Populate the updated group chat
        const updatedGroupChat = await GroupChat.findById(groupId)
            .populate("members", "username fullName profilePic")
            .populate("admins", "username fullName profilePic")
            .populate("creator", "username fullName profilePic");

        // Notify all group members about the update
        updatedGroupChat.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupChatUpdated", updatedGroupChat);
            }
        });

        // Notify new members about being added to the group
        members.forEach(memberId => {
            const memberSocketId = getReceiverSocketId(memberId);
            if (memberSocketId) {
                io.to(memberSocketId).emit("addedToGroup", updatedGroupChat);
            }
        });

        res.status(200).json(updatedGroupChat);
    } catch (error) {
        console.error("Error adding members:", error);
        res.status(500).json({ error: "Failed to add members" });
    }
};

/**
 * Remove a member from a group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const removeMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const userId = req.user._id;

        // Find the group chat
        const groupChat = await GroupChat.findById(groupId);

        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Users can remove themselves, otherwise only admins can remove members
        if (memberId !== userId.toString() && !groupChat.admins.includes(userId)) {
            return res.status(403).json({ error: "Only admins can remove members" });
        }

        // The creator cannot be removed
        if (memberId === groupChat.creator.toString()) {
            return res.status(403).json({ error: "The group creator cannot be removed" });
        }

        // Remove the member
        groupChat.members = groupChat.members.filter(id => id.toString() !== memberId);
        
        // If the member was an admin, remove from admins too
        groupChat.admins = groupChat.admins.filter(id => id.toString() !== memberId);

        await groupChat.save();

        // Populate the updated group chat
        const updatedGroupChat = await GroupChat.findById(groupId)
            .populate("members", "username fullName profilePic")
            .populate("admins", "username fullName profilePic")
            .populate("creator", "username fullName profilePic");

        // Notify all group members about the update
        updatedGroupChat.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupChatUpdated", updatedGroupChat);
            }
        });

        // Notify the removed member
        const removedMemberSocketId = getReceiverSocketId(memberId);
        if (removedMemberSocketId) {
            io.to(removedMemberSocketId).emit("removedFromGroup", {
                groupId: groupChat._id,
                groupName: groupChat.name
            });
        }

        res.status(200).json(updatedGroupChat);
    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ error: "Failed to remove member" });
    }
};

/**
 * Make a user an admin of a group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const makeAdmin = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const userId = req.user._id;

        // Find the group chat
        const groupChat = await GroupChat.findById(groupId);

        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Check if the user is an admin
        if (!groupChat.admins.includes(userId)) {
            return res.status(403).json({ error: "Only admins can promote members to admin" });
        }

        // Check if the member is part of the group
        if (!groupChat.members.includes(memberId)) {
            return res.status(400).json({ error: "This user is not a member of the group" });
        }

        // Check if the member is already an admin
        if (groupChat.admins.includes(memberId)) {
            return res.status(400).json({ error: "This user is already an admin" });
        }

        // Add the member to admins
        groupChat.admins.push(memberId);
        await groupChat.save();

        // Populate the updated group chat
        const updatedGroupChat = await GroupChat.findById(groupId)
            .populate("members", "username fullName profilePic")
            .populate("admins", "username fullName profilePic")
            .populate("creator", "username fullName profilePic");

        // Notify all group members about the update
        updatedGroupChat.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupChatUpdated", updatedGroupChat);
            }
        });

        // Notify the new admin
        const newAdminSocketId = getReceiverSocketId(memberId);
        if (newAdminSocketId) {
            io.to(newAdminSocketId).emit("madeGroupAdmin", {
                groupId: groupChat._id,
                groupName: groupChat.name
            });
        }

        res.status(200).json(updatedGroupChat);
    } catch (error) {
        console.error("Error making admin:", error);
        res.status(500).json({ error: "Failed to make admin" });
    }
};

/**
 * Remove admin privileges from a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const removeAdmin = async (req, res) => {
    try {
        const { groupId, adminId } = req.params;
        const userId = req.user._id;

        // Find the group chat
        const groupChat = await GroupChat.findById(groupId);

        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Only the creator can demote admins
        if (groupChat.creator.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Only the group creator can demote admins" });
        }

        // The creator cannot be demoted
        if (adminId === groupChat.creator.toString()) {
            return res.status(403).json({ error: "The group creator cannot be demoted" });
        }

        // Remove the admin
        groupChat.admins = groupChat.admins.filter(id => id.toString() !== adminId);
        await groupChat.save();

        // Populate the updated group chat
        const updatedGroupChat = await GroupChat.findById(groupId)
            .populate("members", "username fullName profilePic")
            .populate("admins", "username fullName profilePic")
            .populate("creator", "username fullName profilePic");

        // Notify all group members about the update
        updatedGroupChat.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupChatUpdated", updatedGroupChat);
            }
        });

        // Notify the demoted admin
        const demotedAdminSocketId = getReceiverSocketId(adminId);
        if (demotedAdminSocketId) {
            io.to(demotedAdminSocketId).emit("removedAsGroupAdmin", {
                groupId: groupChat._id,
                groupName: groupChat.name
            });
        }

        res.status(200).json(updatedGroupChat);
    } catch (error) {
        console.error("Error removing admin:", error);
        res.status(500).json({ error: "Failed to remove admin" });
    }
};

/**
 * Delete a group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteGroupChat = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Find the group chat
        const groupChat = await GroupChat.findById(groupId);

        if (!groupChat) {
            return res.status(404).json({ error: "Group chat not found" });
        }

        // Only the creator can delete the group
        if (groupChat.creator.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Only the group creator can delete the group" });
        }

        // Get members before deletion for notification
        const members = [...groupChat.members];

        // Delete all messages in the group
        await GroupMessage.deleteMany({ groupId });

        // Delete the group
        await GroupChat.findByIdAndDelete(groupId);

        // Notify all group members about the deletion
        members.forEach(memberId => {
            const memberSocketId = getReceiverSocketId(memberId.toString());
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupChatDeleted", {
                    groupId,
                    groupName: groupChat.name
                });
            }
        });

        res.status(200).json({ message: "Group chat deleted successfully" });
    } catch (error) {
        console.error("Error deleting group chat:", error);
        res.status(500).json({ error: "Failed to delete group chat" });
    }
}; 