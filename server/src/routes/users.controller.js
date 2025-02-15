import express from "express";
import protectedRoute from "../middleware/authMiddleware.js";
import {fetchUserList} from "../services/user.service.js";

/**
 * Router to handle user routes for sidebar users list.
 * @type {Router}
 */
const router = express.Router();

router.get("/", protectedRoute, fetchUserList);

export default router;