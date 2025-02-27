import joi from 'joi';

export const createChatSchema = joi.object({
    receiverId: joi.string().hex().length(24).required(), // MongoDB ObjectId
    message: joi.string().min(1).max(1000).trim().required()
}).required();

export const replyChatSchema = joi.object({
    chatId: joi.string().hex().length(24).required(),
    message: joi.string().min(1).max(1000).trim().required()
}).required();