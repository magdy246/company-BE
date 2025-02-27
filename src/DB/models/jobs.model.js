import mongoose from "mongoose";

const jobsSchema = new mongoose.Schema({
    jobTitle: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    jobLocation: {
        type: String,
        required: true,
        enum: ["onsite", "remotely", "hybrid"],
        default: "onsite"
    },
    workingTime: {
        type: String,
        required: true,
        enum: ["part-time", "full-time"],
        default: "full-time"
    },
    seniorityLevel: {
        type: String,
        required: true,
        enum: ["fresh", "Junior", "Mid-Level", "Senior", "Team-Lead", "CTO"],
        default: "Junior"
    },
    jobDescription: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000
    },
    technicalSkills: {
        type: [String],
        required: true,
        validate: {
            validator: (array) => array.length > 0,
            message: "At least one technical skill is required"
        }
    },
    softSkills: {
        type: [String],
        required: true,
        validate: {
            validator: (array) => array.length > 0,
            message: "At least one soft skill is required"
        }
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    closed: {
        type: Boolean,
        default: false
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

jobsSchema.virtual('applications', {
    ref: "Application",
    localField: "_id",
    foreignField: "jobId"
});

const JobsModel = mongoose.models.Jobs || mongoose.model("Jobs", jobsSchema);

export default JobsModel;