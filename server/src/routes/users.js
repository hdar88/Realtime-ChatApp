import express from "express";
import protectRoute from "../middleware/authMiddleware.js";
import {fetchUserList} from "../controller/userController.js";

/**
 * Router to handle user routes for sidebar users list.
 * @type {Router}
 */
const router = express.Router();

router.get("/", protectRoute, fetchUserList);

export default router;