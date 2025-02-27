import { io } from '../../../index.js';
import { asyncHandler } from '../../utils/index.js';
import * as chatService from './chat.service.js';

export const startChat = asyncHandler(async (req, res, next) => {
    const { receiverId, message } = req.body;
    const senderId = req.user?._id;

    if (!senderId) {
        return next(new Error('User not authenticated', { cause: 401 }));
    }

    const chat = await chatService.initiateChat(senderId, receiverId, message);
    
    io.to(receiverId.toString()).emit('new_chat', {
        chatId: chat._id,
        message,
        senderId
    });

    return res.status(201).json({
        msg: 'Chat initiated successfully',
        chat
    });
});

export const sendMessage = asyncHandler(async (req, res, next) => {
    const { chatId, message } = req.body;
    const senderId = req.user?._id;

    if (!senderId) {
        return next(new Error('User not authenticated', { cause: 401 }));
    }

    const chat = await chatService.replyToChat(chatId, senderId, message);
    
    const recipientId = chat.senderId.toString() === senderId.toString() 
        ? chat.receiverId 
        : chat.senderId;

    io.to(recipientId.toString()).emit('new_message', {
        chatId,
        message,
        senderId,
        createdAt: new Date()
    });

    return res.status(200).json({
        msg: 'Message sent successfully',
        chat
    });
});

export const getChat = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
        return next(new Error('User not authenticated', { cause: 401 }));
    }

    const chat = await chatService.getChatHistory(currentUserId, userId);
    
    return res.status(200).json({
        msg: 'Chat history retrieved successfully',
        chat
    });
});