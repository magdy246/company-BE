import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import bootstrap from './src/app.controller.js';
import path from "path";
import dotenv from "dotenv";
import { eventEmitter } from "./src/utils/index.js";

dotenv.config({ path: path.resolve("config/.env") });

const app = express();
bootstrap(app, express);

const httpServer = createServer(app);
export const io = new Server(httpServer, {
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

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
