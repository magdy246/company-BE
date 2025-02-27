import joi from "joi";
import { enumGender } from "../../DB/models/users.model.js";
import { roles } from "../../middleware/auth.js";

export const signupSchema = joi.object({
    firstName: joi.string().min(2).max(50).required(),
    lastName: joi.string().min(2).max(50).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).required(),
    mobileNumber: joi.string().required(),
    gender: joi.string().valid(...Object.values(enumGender)).required(),
    DOB: joi.date().less('now').max(new Date(new Date().setFullYear(new Date().getFullYear() - 18))).required(),
    attachment: joi.array().items(joi.any()).optional(),
    attachments: joi.array().items(joi.any()).optional()
});

export const addAdminSchema = joi.object({
    firstName: joi.string().min(2).max(50).required(),
    lastName: joi.string().min(2).max(50).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).required(),
    mobileNumber: joi.string().required(),
    gender: joi.string().valid(...Object.values(enumGender)).required(),
    DOB: joi.date().less('now').max(new Date(new Date().setFullYear(new Date().getFullYear() - 18))).required(),
    attachment: joi.array().items(joi.any()).optional(),
    attachments: joi.array().items(joi.any()).optional(),
    role: joi.string().valid(...Object.values(roles)),
});

export const confirmOTPSchema = joi.object({
    email: joi.string().email().required(),
    otp: joi.string().length(6).required()
});

export const signinSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
});

export const googleAuthSchema = joi.object({
    googleToken: joi.string().required()
});

export const requestPasswordResetSchema = joi.object({
    email: joi.string().email().required()
});


export const resetPasswordSchema = joi.object({
    email: joi.string().email().required(),
    otp: joi.string().length(6).required(),
    newPassword: joi.string().min(8).required()
});

export const refreshTokenSchema = joi.object({
    refreshToken: joi.string().required()
});

export const getUserSchema = joi.object({
    email: joi.string().email().required(),
});

export const getUserProfileSchema = joi.object({
    userId: joi.string().hex().length(24).required()
}).required();

export const updateAccountSchema = joi.object({
    mobileNumber: joi.string().optional(),
    DOB: joi.date().less('now').optional(),
    firstName: joi.string().min(2).max(50).optional(),
    lastName: joi.string().min(2).max(50).optional(),
    gender: joi.string().valid(...Object.values(enumGender)).optional()
}).or('mobileNumber', 'DOB', 'firstName', 'lastName', 'gender');

export const updatePasswordSchema = joi.object({
    currentPassword: joi.string().required(),
    newPassword: joi.string().min(8).required()
}).required();

export const deleteCoverPicSchema = joi.object({
    publicId: joi.string().required()
}).required();

export const banUnbanUserSchema = joi.object({
    userId: joi.string().hex().length(24).required()
}).required();