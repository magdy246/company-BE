import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000
    },
    industry: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    address: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 200
    },
    numberOfEmployees: {
        type: String,
        required: true,
        enum: [
            "1-10",
            "11-20",
            "21-50",
            "51-100",
            "101-500",
            "501-1000",
            "1001+"
        ],
        default: "1-10"
    },
    companyEmail: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
        trim: true
    },
    CreatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    Logo: {
        secure_url: {
            type: String,
            default: null
        },
        public_id: {
            type: String,
            default: null
        }
    },
    coverPic: {
        secure_url: {
            type: String,
            default: null
        },
        public_id: {
            type: String,
            default: null
        }
    },
    HRs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    }],
    bannedAt: {
        type: Date,
        default: null
    },
    deletedAt: {
        type: Date,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    legalAttachment: {
        secure_url: {
            type: String,
            default: null
        },
        public_id: {
            type: String,
            default: null
        }
    },
    approvedByAdmin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

companySchema.virtual('jobs', {
    ref: "Jobs",
    localField: "_id",
    foreignField: "companyId"
});

const CompanyModel = mongoose.models.Company || mongoose.model("Company", companySchema);

export default CompanyModel;