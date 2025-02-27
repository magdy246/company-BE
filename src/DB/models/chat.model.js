import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
        validate: {
            validator: async function(value) {
                const user = await mongoose.model("Users").findById(value);
                if (!user) return false;
                const company = await mongoose.model("Company").findOne({ $or: [{ CreatedBy: value }, { HRs: value }] });
                return !!company;
            },
            message: "Sender must be an HR or company owner"
        }
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    messages: [{
        message: {
            type: String,
            required: true,
            trim: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

const ChatModel = mongoose.models.Chat || mongoose.model("Chat", chatSchema);

export default ChatModel;