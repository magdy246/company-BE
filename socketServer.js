import { Server } from "socket.io";
import { eventEmitter } from "./src/utils/index.js";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
    });

    socket.on('joinCompany', (companyId) => {
        socket.join(`company-${companyId}`);
        console.log(`HR ${socket.id} joined company room: company-${companyId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

eventEmitter.on("newApplication", (data) => {
    io.to(`company-${data.companyId}`).emit("newApplication", {
        message: `New application submitted for job ${data.jobId}`,
        applicationId: data.applicationId,
        userId: data.userId,
        timestamp: data.timestamp
    });
    console.log(`Emitted newApplication event to company-${data.companyId}`);
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
    console.log(`Socket.IO server running on port ${port}`);
});

export { io };