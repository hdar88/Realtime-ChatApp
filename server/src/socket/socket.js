import {Server} from "socket.io";
import http from "http";
import express from "express";
import {incrementUnreadCount} from "../services/unread.service.js";
import GroupChat from "../models/groupChatModel.js";

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
        const {receiverId, senderId, tempId} = messageData;

        // Update the unread message count in the database
        await incrementUnreadCount(receiverId, senderId);

        // Create a copy of the message data that we'll send to the receiver
        const messageToSend = {...messageData};

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

    // Handle new group message events
    socket.on("newGroupMessage", async (messageData) => {
        console.log("New group message received:", messageData);
        const { groupId, senderId, tempId } = messageData;
        
        // Skip if this is a message that already has a MongoDB ID (already saved)
        // This prevents duplicate messages from being sent
        if (messageData._id && messageData._id.toString().length === 24) {
            console.log("Skipping already saved message:", messageData._id);
            return;
        }

        try {
            // Find the group to get all members
            const groupChat = await GroupChat.findById(groupId);
            if (!groupChat) {
                console.error("Group not found:", groupId);
                return;
            }

            // Create a copy of the message data to send
            const messageToSend = {...messageData};

            // If the message doesn't have a real _id but has a tempId, use tempId as temporary _id
            if (!messageToSend._id && tempId) {
                messageToSend._id = tempId;
                console.log("Using temporary ID for group message:", tempId);
            }

            // Send to all group members except the sender
            groupChat.members.forEach(memberId => {
                if (memberId.toString() !== senderId) { // Don't send to self
                    const memberSocketId = getReceiverSocketId(memberId.toString());
                    if (memberSocketId) {
                        console.log(`Emitting group message to member ${memberId}, socket: ${memberSocketId}`);
                        io.to(memberSocketId).emit("newGroupMessage", messageToSend);
                    }
                }
            });
        } catch (error) {
            console.error("Error processing group message:", error);
        }
    });

    // Handle group message read events
    socket.on("markGroupMessageAsRead", data => {
        console.log("Group message read event received:", data);
        const { messageId, groupId, readerId, senderId } = data;

        if (!messageId || !readerId || !senderId) {
            console.error("Invalid markGroupMessageAsRead data:", data);
            return;
        }

        // Notify the sender that their message was read
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
            console.log(`Notifying sender ${senderId} that group message ${messageId} was read by ${readerId}`);
            io.to(senderSocketId).emit("groupMessageRead", {
                messageId,
                groupId,
                readerId,
                readAt: new Date()
            });
        }
    });

    // Handle message read events
    socket.on("markAsRead", async (data) => {
        console.log("Mark as read event received:", data);
        const {messageId, senderId, readerId, isTemporary} = data;

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

    socket.on("joinGroup", ({ groupId, userId }) => {
        console.log(`User ${userId} joining group ${groupId}`);
        socket.join(`group:${groupId}`);
    });

    socket.on("leaveGroup", ({ groupId, userId }) => {
        console.log(`User ${userId} leaving group ${groupId}`);
        socket.leave(`group:${groupId}`);
    });

    socket.on("typing", ({senderId, receiverId, isTyping}) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("typing", {senderId, isTyping});
        }
    });

    socket.on("typingInGroup", ({senderId, groupId, isTyping}) => {
        console.log(`User ${senderId} is ${isTyping ? 'typing' : 'not typing'} in group ${groupId}`);
        socket.to(`group:${groupId}`).emit("typingInGroup", {senderId, groupId, isTyping});
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