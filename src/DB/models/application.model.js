import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Jobs",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true 
    },
    userCV: {
        secure_url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "viewed", "in consideration", "rejected"],
        default: "pending"
    }
}, {
    timestamps: true
});

const ApplicationModel = mongoose.models.Application || mongoose.model("Application", applicationSchema);

export default ApplicationModel;