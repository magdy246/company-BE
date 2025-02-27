import ChatModel from '../../DB/models/chat.model.js';

export const initiateChat = async (senderId, receiverId, message) => {
    // Check if chat already exists between these users
    let chat = await ChatModel.findOne({
        $or: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId }
        ]
    });

    const newMessage = {
        message,
        senderId,
        createdAt: new Date()
    };

    if (chat) {
        chat.messages.push(newMessage);
        await chat.save();
    } else {
        chat = await ChatModel.create({
            senderId,
            receiverId,
            messages: [newMessage]
        });
    }

    return chat;
};

export const replyToChat = async (chatId, senderId, message) => {
    const chat = await ChatModel.findById(chatId);
    if (!chat) throw new Error('Chat not found', { cause: 404 });

    // Log for debugging
    console.log('chat.senderId:', chat.senderId.toString());
    console.log('chat.receiverId:', chat.receiverId.toString());
    console.log('senderId:', senderId);

    // Use equals() for ObjectId comparison
    if (!chat.senderId.equals(senderId) && !chat.receiverId.equals(senderId)) {
        throw new Error('Unauthorized to reply to this chat', { cause: 403 });
    }

    const newMessage = {
        message,
        senderId,
        createdAt: new Date()
    };

    chat.messages.push(newMessage);
    await chat.save();
    return chat;
};

export const getChatHistory = async (userId, otherUserId) => {
    const chat = await ChatModel.findOne({
        $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
        ]
    }).populate('senderId receiverId', 'name email');

    if (!chat) throw new Error('No chat history found', { cause: 404 });
    return chat;
};