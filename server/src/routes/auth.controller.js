import express from "express";
import {login, logout, signup} from "../services/auth.service.js";

/**
 * Router to handle auth routes
 * @type {Router} authRouter
 * @const auth Router
 * @property {function} post - POST request for signup
 * @property {function} post - POST request for login
 * @property {function} post - POST request for logout
 */
const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

export default router;