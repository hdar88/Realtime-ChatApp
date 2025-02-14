import path from 'path';
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/messages.js";
import userRoutes from "./routes/users.js";

import connectToMongoDB from "./db/mongoDbConnector.js";
import {app, server} from "./socket/socket.js";

dotenv.config();

const __dirname = path.resolve();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.use(express.static(path.join(__dirname, "/frontend/dist")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

server.listen(PORT, () => {
    connectToMongoDB().then(r => console.log(r));
    console.log(`Server Running on port ${PORT}`);
});

export default app;