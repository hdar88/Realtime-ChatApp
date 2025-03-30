import express from "express";
import {getMessages, sendMessage, markMessageAsRead} from "../services/message.service.js";
import protectedRoute from "../middleware/authMiddleware.js";

/**
 * Router to handle message routes
 * @type {Router} messageRouter
 */
const router = express.Router();

router.get("/:id", protectedRoute, getMessages);
router.post("/send/:id", protectedRoute, sendMessage);
router.post("/read/:id", protectedRoute, markMessageAsRead);

export default router;