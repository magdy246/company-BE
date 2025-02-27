import mongoose from "mongoose";
import { roles } from "../../middleware/auth.js";
import { Encrypt, Hash, Decrypt } from "../../utils/index.js";

export const enumGender = {
    male: "male",
    female: "female"
};

export const enumProvider = {
    google: "google",
    system: "system"
};

const usersSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 50,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 50,
        trim: true
    },
    username: {
        type: String,
        virtual: true,
        get: function () {
            return `${this.firstName} ${this.lastName}`;
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        trim: true
    },
    provider: {
        type: String,
        enum: Object.values(enumProvider),
        default: enumProvider.system
    },
    gender: {
        type: String,
        required: true,
        enum: Object.values(enumGender)
    },
    DOB: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                const today = new Date();
                const birthDate = new Date(value);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();

                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                return birthDate < today && age >= 18;
            },
            message: 'Date of birth must be in the past and user must be at least 18 years old'
        }
    },
    mobileNumber: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: Object.values(roles),
        default: roles.user
    },
    isConfirmed: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    bannedAt: {
        type: Date,
        default: null
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    changeCredentialTime: {
        type: Date,
        default: null
    },
    profilePic: {
        secure_url: String,
        public_id: String,
    },
    coverPic: [{
        secure_url: String,
        public_id: String,
    }],
    OTP: [{
        code: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['confirmEmail', 'forgetPassword'],
            required: true
        },
        expiresIn: {
            type: Date,
            required: true
        }
    }],
    isOwner: {
        type: Boolean,
        default: false
    },
    isHR: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

//& Pre-save hook (Encrypt password and mobileNumber for create/save)
usersSchema.pre('save', async function (next) {
    try {
        if (this.isModified('password')) {
            this.password = await Hash({
                password: this.password,
                SALT_ROUNDS: Number(process.env.SALT_ROUNDS)
            });
            console.log("Password hashed:", this.password);
        }
        if (this.isModified('mobileNumber')) {
            this.mobileNumber = await Encrypt({
                key: this.mobileNumber,
                SIGNTURE: process.env.SIGNTURE
            });
            console.log("Mobile encrypted during save:", this.mobileNumber);
        }
        next();
    } catch (error) {
        console.error("Pre-save hook error:", error);
        next(error);
    }
});

//& Pre-update hook (Hash password and encrypt mobileNumber for updates)
usersSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
    try {
        const update = this.getUpdate();
        console.log("Update data before processing:", update);

        if (update.$set) {
            if (update.$set.password) {
                update.$set.password = await Hash({
                    password: update.$set.password,
                    SALT_ROUNDS: Number(process.env.SALT_ROUNDS)
                });
                console.log("Password hashed during update:", update.$set.password);
            } else {
                console.log("No password field in update.$set");
            }

            // Handle mobileNumber encryption
            if (update.$set.mobileNumber) {
                update.$set.mobileNumber = await Encrypt({
                    key: update.$set.mobileNumber,
                    SIGNTURE: process.env.SIGNTURE
                });
                console.log("Mobile encrypted during update:", update.$set.mobileNumber);
            } else {
                console.log("No mobileNumber field in update.$set");
            }

            this.setUpdate(update);
        } else {
            console.log("No $set operator in update");
        }

        next();
    } catch (error) {
        console.error("Pre-update hook error:", error);
        next(error);
    }
});

//& Post-find hook (Decrypt mobileNumber after retrieval)
usersSchema.post(['find', 'findOne', 'findById', 'findOneAndUpdate'], async function (docs) {
    if (Array.isArray(docs)) {
        for (let doc of docs) {
            if (doc?.mobileNumber) {
                try {
                    doc.mobileNumber = await Decrypt({
                        key: doc.mobileNumber,
                        SIGNTURE: process.env.SIGNTURE
                    });
                    console.log("Decrypted mobileNumber:", doc.mobileNumber);
                } catch (error) {
                    console.error("Decryption failed for array doc:", error.message);
                    doc.mobileNumber = doc.mobileNumber;
                }
            } else {
                console.log("mobileNumber is missing in document (array)");
            }
        }
    } else if (docs?.mobileNumber) {
        try {
            docs.mobileNumber = await Decrypt({
                key: docs.mobileNumber,
                SIGNTURE: process.env.SIGNTURE
            });
            console.log("Decrypted mobileNumber:", docs.mobileNumber);
        } catch (error) {
            console.error("Decryption failed for single doc:", error.message);
            docs.mobileNumber = docs.mobileNumber;
        }
    } else {
        console.log("mobileNumber is missing in document (single)");
    }
});
const UsersModel = mongoose.models.Users || mongoose.model("Users", usersSchema);

export default UsersModel;