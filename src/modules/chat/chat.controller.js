import express from 'express';
import * as chatController from './chat.socket.js';
import { createChatSchema, replyChatSchema } from './chat.validation.js';
import { authentication } from '../../middleware/auth.js';
import { validation } from '../../middleware/validation.js';

const chatRouter = express.Router();

chatRouter.post('/start',
    authentication,
    validation(createChatSchema),
    chatController.startChat
);

chatRouter.post('/reply',
    authentication,
    validation(replyChatSchema),
    chatController.sendMessage
);

chatRouter.get('/history/:userId',
    authentication,
    chatController.getChat
);

export default chatRouter;