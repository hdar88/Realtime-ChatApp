import path from 'path';
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.controller.js";
import messageRoutes from "./routes/messages.controller.js";
import userRoutes from "./routes/users.controller.js";

import connectToMongoDB from "./db/mongoDbConnector.js";
import {app, server} from "./socket/socket.js";

dotenv.config();

const __dirname = path.resolve();
const SERVER_PORT = process.env.SERVER_PORT || 8000;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow any origin that starts with localhost
        if (origin.startsWith('http://localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.use(express.static(path.join(__dirname, "../client")));

server.listen(SERVER_PORT, () => {
    connectToMongoDB().then(r => console.log(r));
    console.log(`Server Running on port ${SERVER_PORT}`);
});export default app;

