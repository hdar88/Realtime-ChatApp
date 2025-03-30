import express from "express";
import protectedRoute from "../middleware/authMiddleware.js";
import { getUnreadMessages, resetUnreadCount } from "../services/unread.service.js";

/**
 * Router to handle unread message routes
 * @type {Router}
 */
const router = express.Router();

// Get all unread message counts for the current user
router.get("/", protectedRoute, getUnreadMessages);

// Reset unread count for a specific user
router.post("/reset/:fromUserId", protectedRoute, resetUnreadCount);

export default router; 