import express from "express";
import {login, logout, signup, getMe} from "../services/auth.service.js";
import protectedRoute from "../middleware/authMiddleware.js";

/**
 * Router to handle auth routes
 * @type {Router} authRouter
 * @const auth Router
 * @property {function} post - POST request for signup
 * @property {function} post - POST request for login
 * @property {function} post - POST request for logout
 * @property {function} get - GET request for getting user data
 */
const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.get("/me", protectedRoute, getMe);

export default router;