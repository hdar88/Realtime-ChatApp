import express from "express";
import protectedRoute from "../middleware/authMiddleware.js";
import {
    createGroupChat,
    getUserGroupChats,
    getGroupChatById,
    updateGroupChat,
    addMembers,
    removeMember,
    makeAdmin,
    removeAdmin,
    deleteGroupChat
} from "../services/groupChat.service.js";
import {
    sendGroupMessage,
    getGroupMessages,
    markGroupMessageAsRead,
    getGroupUnreadCount,
    getAllGroupsUnreadCounts,
    markAllGroupMessagesAsRead
} from "../services/groupMessage.service.js";

/**
 * Router to handle group chat routes
 * @type {Router} groupRouter
 */
const router = express.Router();

// Group chat routes
router.post("/", protectedRoute, createGroupChat);
router.get("/", protectedRoute, getUserGroupChats);
router.get("/:groupId", protectedRoute, getGroupChatById);
router.put("/:groupId", protectedRoute, updateGroupChat);
router.delete("/:groupId", protectedRoute, deleteGroupChat);

// Group membership management
router.post("/:groupId/members", protectedRoute, addMembers);
router.delete("/:groupId/members/:memberId", protectedRoute, removeMember);
router.post("/:groupId/admins/:memberId", protectedRoute, makeAdmin);
router.delete("/:groupId/admins/:adminId", protectedRoute, removeAdmin);

// Group messages
router.post("/:groupId/messages", protectedRoute, sendGroupMessage);
router.get("/:groupId/messages", protectedRoute, getGroupMessages);
router.post("/:groupId/messages/read/all", protectedRoute, markAllGroupMessagesAsRead);
router.post("/messages/read/:messageId", protectedRoute, markGroupMessageAsRead);

// Unread counts
router.get("/:groupId/unread", protectedRoute, getGroupUnreadCount);
router.get("/unread/all", protectedRoute, getAllGroupsUnreadCounts);

export default router; 