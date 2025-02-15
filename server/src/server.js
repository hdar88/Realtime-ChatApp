import path from 'path';
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

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

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.use(express.static(path.join(__dirname, "/client")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "index.html"));
});

server.listen(SERVER_PORT, () => {
    connectToMongoDB().then(r => console.log(r));
    console.log(`Server Running on port ${SERVER_PORT}`);
});

export default app;