import {Server} from "socket.io";
import http from "http";
import express from "express";
import { incrementUnreadCount } from "../services/unread.service.js";

const app = express();

/**
 * Create a server instance and pass the express app as a listener to the server which will allow the server to listen
 * for incoming requests.
 *
 * @type {Server<typeof IncomingMessage, typeof ServerResponse>}
 */
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

const userSocketMap = {};

// Helper function to emit online users to all clients
const emitOnlineUsers = () => {
    const onlineUsers = Object.keys(userSocketMap);
    console.log('Emitting online users:', onlineUsers);
    io.emit("getOnlineUsers", onlineUsers);
};

io.on("connection", (socket) => {
    console.log("a user connected", socket.id);
    // Try multiple sources for user ID
    let userId = null;
    
    if (socket.handshake.auth && socket.handshake.auth.userId) {
        userId = socket.handshake.auth.userId;
        console.log("Found userId in handshake.auth:", userId);
    } else if (socket.handshake.query && socket.handshake.query.userId) {
        userId = socket.handshake.query.userId;
        console.log("Found userId in handshake.query:", userId);
    } else if (socket.auth && socket.auth.userId) {
        userId = socket.auth.userId;
        console.log("Found userId in socket.auth:", userId);
    }
    
    // If we have a valid userId, map it to the socket
    if (userId && userId !== 'undefined') {
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} mapped to socket ${socket.id}`);
        
        // Emit updated online users list to all clients
        emitOnlineUsers();
    } else {
        console.log("Warning: Socket connected without userId");
    }
    
    // Set a mechanism for the client to set userId later if needed
    socket.on("setUserId", (data) => {
        if (data && data.userId) {
            console.log(`Setting userId for socket ${socket.id} to ${data.userId}`);
            userSocketMap[data.userId] = socket.id;
            
            // Emit updated online users list to all clients
            emitOnlineUsers();
        }
    });
    
    // Handle new message events from clients
    socket.on("newMessage", async (messageData) => {
        console.log("New message received:", messageData);
        const { receiverId, senderId, tempId } = messageData;
        
        // Update the unread message count in the database
        await incrementUnreadCount(receiverId, senderId);
        
        // Create a copy of the message data that we'll send to the receiver
        const messageToSend = { ...messageData };
        
        // If the message doesn't have a real _id but has a tempId, use tempId as temporary _id
        // This ensures receiver always has some ID to work with
        if (!messageToSend._id && tempId) {
            messageToSend._id = tempId; // Use tempId as fallback _id
            console.log("Using temporary ID for message:", tempId);
        } else if (messageToSend._id) {
            console.log("Message already has a real ID:", messageToSend._id);
        }
        
        const receiverSocketId = getReceiverSocketId(receiverId);
        
        if (receiverSocketId) {
            console.log("Emitting to receiver:", receiverId, "socket:", receiverSocketId);
            io.to(receiverSocketId).emit("newMessage", messageToSend);
        } else {
            console.log("Receiver not online. Message will only be stored in database:", receiverId);
        }
    });

    // Handle message read events
    socket.on("markAsRead", async (data) => {
        console.log("Mark as read event received:", data);
        const { messageId, senderId, readerId, isTemporary } = data;
        
        if (!messageId || !senderId || !readerId) {
            console.error("Invalid markAsRead data:", data);
            return;
        }
        
        // Get the sender's socket
        const senderSocketId = getReceiverSocketId(senderId);
        
        if (senderSocketId) {
            console.log(`Notifying sender ${senderId} that message ${messageId} was read by ${readerId}`);
            
            // Always forward the read receipt to update UI
            io.to(senderSocketId).emit("messageRead", {
                messageId,
                readerId,
                readAt: new Date()
            });
        }
    });

    socket.on("disconnect", () => {
        console.log("user disconnected", socket.id);
        
        // Find and remove the disconnected user from the map
        const userIdToRemove = Object.keys(userSocketMap).find(
            key => userSocketMap[key] === socket.id
        );
        
        if (userIdToRemove) {
            console.log(`User ${userIdToRemove} disconnected`);
            delete userSocketMap[userIdToRemove];
            
            // Emit updated online users list to all clients
            emitOnlineUsers();
        }
    });
});

export {app, io, server};