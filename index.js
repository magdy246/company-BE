import express from 'express';
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import bootstrap from './src/app.controller.js';
import { eventEmitter } from "./src/utils/index.js";

dotenv.config({ path: path.resolve("config/.env") });

const app = express();
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}!`);
});

bootstrap(app, express);

export const io = new Server(server, {
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

// Handle EventEmitter events
eventEmitter.on("newApplication", (data) => {
    io.to(`company-${data.companyId}`).emit("newApplication", {
        message: `New application submitted for job ${data.jobId}`,
        applicationId: data.applicationId,
        userId: data.userId,
        timestamp: data.timestamp
    });
    console.log(`Emitted newApplication event to company-${data.companyId}`);
});