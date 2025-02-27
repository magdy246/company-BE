import UsersModel from "../../DB/models/users.model.js";
import { google } from 'googleapis';
import { generateToken, asyncHandler, eventEmitter, Compare, Hash, VerifyToken } from "../../utils/index.js";
import path from "path";
import dotenv from "dotenv";
import cloudinary from "../../utils/cloudinary/index.js";
import mongoose from "mongoose";
import { roles } from "../../middleware/auth.js";

dotenv.config({ path: path.resolve("config/.env") });

//& Sign Up
export const signup = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, password, mobileNumber, gender, DOB } = req.body;

    // Check if email exists
    const userExist = await UsersModel.findOne({ email });
    if (userExist) {
        return next(new Error("Email already exists"));
    }

    // Handle Profile Image Upload
    let profileImage = null;
    if (req.files?.['attachment']?.length) {
        const { secure_url, public_id } = await cloudinary.uploader.upload(req.files['attachment'][0].path);
        profileImage = { secure_url, public_id };
    } else {
        return next(new Error("Please upload a profile image"));
    }

    // Handle Cover Images Upload
    let arrFiles = [];
    if (req.files?.['attachments']?.length) {
        arrFiles = await Promise.all(
            req.files['attachments'].map(async (file) => {
                const { secure_url, public_id } = await cloudinary.uploader.upload(file.path, { folder: "social-app" });
                return { secure_url, public_id };
            })
        );
    }

    // Create user (password and mobileNumber will be hashed in pre-save hook, OTP handled by event emitter)
    const newUser = await UsersModel.create({
        firstName,
        lastName,
        email,
        password,
        mobileNumber,
        gender,
        DOB,
        profilePic: profileImage,
        coverPic: arrFiles
    });

    // Emit event to send OTP email (OTP generation handled by listener)
    eventEmitter.emit("SendeningEmailConfirm", { email, id: newUser._id });

    return res.status(201).json({
        msg: "User registered successfully. Please verify your email.",
        user: newUser
    });
});

//& Sign Up
export const addAdmin = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, password, mobileNumber, gender, DOB, role } = req.body;

    // Check if email exists
    const userExist = await UsersModel.findOne({ email });
    if (userExist) {
        return next(new Error("Email already exists"));
    }

    // Handle Profile Image Upload
    let profileImage = null;
    if (req.files?.['attachment']?.length) {
        const { secure_url, public_id } = await cloudinary.uploader.upload(req.files['attachment'][0].path);
        profileImage = { secure_url, public_id };
    } else {
        return next(new Error("Please upload a profile image"));
    }

    // Handle Cover Images Upload
    let arrFiles = [];
    if (req.files?.['attachments']?.length) {
        arrFiles = await Promise.all(
            req.files['attachments'].map(async (file) => {
                const { secure_url, public_id } = await cloudinary.uploader.upload(file.path, { folder: "social-app" });
                return { secure_url, public_id };
            })
        );
    }

    // Create user (password and mobileNumber will be hashed in pre-save hook, OTP handled by event emitter)
    const newUser = await UsersModel.create({
        firstName,
        lastName,
        email,
        password,
        mobileNumber,
        gender,
        DOB,
        profilePic: profileImage,
        coverPic: arrFiles,
        role
    });

    // Emit event to send OTP email (OTP generation handled by listener)
    eventEmitter.emit("SendeningEmailConfirm", { email, id: newUser._id });

    return res.status(201).json({
        msg: "User registered successfully. Please verify your email.",
        user: newUser
    });
});

//& Confirm OTP
export const confirmOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    const user = await UsersModel.findOne({ email });
    if (!user) return next(new Error("User not found", { cause: 404 }));

    const otpEntry = user.OTP.find(o => o.type === 'confirmEmail');
    if (!otpEntry) return next(new Error("No OTP found", { cause: 400 }));

    if (new Date() > otpEntry.expiresIn) {
        return next(new Error("OTP has expired", { cause: 400 }));
    }

    const isValid = await Compare({ key: otp, hashed: otpEntry.code });
    if (!isValid) return next(new Error("Invalid OTP", { cause: 400 }));

    await UsersModel.updateOne(
        { email: email },
        {
            isConfirmed: true,
            $pull: { OTP: { type: 'confirmEmail' } }
        }
    );

    return res.status(200).json({ msg: "Email verified successfully" });
});

//& Request New OTP
export const requestNewOTP = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await UsersModel.findOne({ email });
    if (!user) return next(new Error("User not found", { cause: 404 }));

    if (user.isConfirmed) {
        return next(new Error("Email is already verified", { cause: 400 }));
    }

    // Remove any existing expired confirmEmail OTP (optional cleanup)
    await UsersModel.updateOne(
        { email, "OTP.type": "confirmEmail" },
        { $pull: { OTP: { type: "confirmEmail", expiresIn: { $lt: new Date() } } } }
    );

    // Emit event to generate and send a new OTP
    eventEmitter.emit("SendeningEmailConfirm", { email, id: user._id });

    return res.status(200).json({
        msg: "New OTP sent to your email. Please verify your email."
    });
});

//& Sign In (System Provider Only)
export const signin = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await UsersModel.findOne({ email, provider: 'system' });
    if (!user) return next(new Error("Invalid credentials", { cause: 401 }));
    if (!user.isConfirmed) return next(new Error("Please verify your email first", { cause: 401 }));

    const isValid = await Compare({ key: password, hashed: user.password });
    if (!isValid) return next(new Error("Invalid credentials", { cause: 401 }));

    const accessToken = await generateToken({
        payload: { id: user._id, email: user.email, role: user.role },
        SECRET: process.env.SECRET_KEY_TOKEN_USER,
        option: { expiresIn: '1h' }
    });

    const refreshToken = await generateToken({
        payload: { id: user._id, email: user.email, role: user.role },
        SECRET: process.env.SECRET_KEY_REFRESH_TOKEN_USER,
        option: { expiresIn: '7d' }
    });

    return res.status(200).json({
        msg: "Login successful",
        accessToken,
        refreshToken
    });
});

//& Google Sign Up/Login
export const googleAuth = asyncHandler(async (req, res, next) => {
    const { googleToken } = req.body;
    const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    const { email, given_name, family_name, picture } = ticket.getPayload();

    let user = await UsersModel.findOne({ email });
    if (!user) {
        user = await UsersModel.create({
            firstName: given_name,
            lastName: family_name,
            email,
            provider: 'google',
            profilePic: { secure_url: picture },
            isConfirmed: true
        });
    }

    const accessToken = await generateToken({
        payload: { id: user._id, email: user.email, role: user.role },
        SECRET: process.env.SECRET_KEY_TOKEN_USER,
        option: { expiresIn: '1h' }
    });

    const refreshToken = await generateToken({
        payload: { id: user._id, email: user.email, role: user.role },
        SECRET: process.env.SECRET_KEY_REFRESH_TOKEN_USER,
        option: { expiresIn: '7d' }
    });

    return res.status(200).json({
        msg: "Google authentication successful",
        accessToken,
        refreshToken
    });
});

//& Refresh Token
export const refreshToken = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new Error("Refresh token is required", { cause: 400 }));
    }

    // Verify the refresh token
    const decoded = await VerifyToken(refreshToken, process.env.SECRET_KEY_REFRESH_TOKEN_USER);

    const user = await UsersModel.findById(decoded.id);
    if (!user) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // Generate new access token
    const accessToken = await generateToken({
        payload: { id: user._id, email: user.email, role: user.role },
        SECRET: process.env.SECRET_KEY_TOKEN_USER, // Use access token secret
        option: { expiresIn: '1h' }
    });

    return res.status(200).json({
        msg: "Token refreshed",
        accessToken
    });

});


//& Send OTP for Forget Password
export const requestPasswordReset = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await UsersModel.findOne({ email });
    if (!user) return next(new Error("User not found", { cause: 404 }));

    // Emit event to handle OTP generation and email sending
    eventEmitter.emit("SendPasswordResetOTP", { email });

    return res.status(200).json({ msg: "Reset OTP sent to your email" });
});

//& Reset Password
export const resetPassword = asyncHandler(async (req, res, next) => {
    const { email, otp, newPassword } = req.body;

    const user = await UsersModel.findOne({ email });
    if (!user) return next(new Error("User not found", { cause: 404 }));

    const otpEntry = user.OTP.find(o => o.type === 'forgetPassword');
    if (!otpEntry) return next(new Error("No reset OTP found", { cause: 400 }));

    if (new Date() > otpEntry.expiresIn) {
        return next(new Error("OTP has expired", { cause: 400 }));
    }

    const isValid = await Compare({ key: otp, hashed: otpEntry.code });
    if (!isValid) return next(new Error("Invalid OTP", { cause: 400 }));

    const hashedPassword = await Hash({ password: newPassword, SALT_ROUNDS: Number(process.env.SALT_ROUNDS) });

    await UsersModel.updateOne(
        { email },
        {
            password: hashedPassword,
            changeCredentialTime: new Date(),
            $pull: { OTP: { type: 'forgetPassword' } }
        }
    );

    return res.status(200).json({ msg: "Password reset successfully" });
});

//& Update User Account
export const updateAccount = asyncHandler(async (req, res, next) => {
    const { mobileNumber, DOB, firstName, lastName, gender } = req.body;
    const user = req.user; // From authentication middleware

    // Check if user is deleted or banned
    if (user.deletedAt) {
        return next(new Error("Cannot update a deleted account", { cause: 403 }));
    }
    if (user.bannedAt) {
        return next(new Error("Cannot update a banned account", { cause: 403 }));
    }

    // Prepare update object with allowed fields
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (mobileNumber) updateData.mobileNumber = mobileNumber; // Will be encrypted by pre-save hook
    if (DOB) updateData.DOB = DOB;
    if (gender) updateData.gender = gender;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
        return next(new Error("No valid fields provided for update", { cause: 400 }));
    }

    // Update the user
    const updatedUser = await UsersModel.findByIdAndUpdate(
        user._id,
        { $set: updateData },
        { new: true, runValidators: true } // Return updated document, run schema validators
    );

    if (!updatedUser) {
        return next(new Error("Failed to update user", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Account updated successfully",
        user: {
            id: updatedUser._id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            mobileNumber: updatedUser.mobileNumber, // Decrypted by post-find hook
            gender: updatedUser.gender,
            DOB: updatedUser.DOB
        }
    });
});

//& Find User by Email
export const findUserByEmail = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new Error("Email is required", { cause: 400 }));
    }

    const user = await UsersModel.findOne({ email });
    if (!user) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // mobileNumber is already decrypted by the post-find hook
    return res.status(200).json({
        msg: "User retrieved successfully",
        user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            mobileNumber: user.mobileNumber, // Decrypted value
            gender: user.gender,
            DOB: user.DOB,
            role: user.role,
            isConfirmed: user.isConfirmed
        }
    });
});

//& Get Profile Data for Another User
export const getUserProfile = asyncHandler(async (req, res, next) => {
    const { userId } = req.params; // Get userId from URL params

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new Error("Invalid user ID format", { cause: 400 }));
    }

    // Find user by ID
    const user = await UsersModel.findById(userId);
    if (!user) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // Check if user is deleted or banned (optional, depending on your requirements)
    if (user.deletedAt) {
        return next(new Error("User account is deleted", { cause: 404 }));
    }
    if (user.bannedAt) {
        return next(new Error("User account is banned", { cause: 403 }));
    }

    // Return only the requested fields
    return res.status(200).json({
        msg: "Profile data retrieved successfully",
        profile: {
            username: user.username, // Virtual field from schema
            mobileNumber: user.mobileNumber, // Decrypted by post hook
            profilePic: user.profilePic,
            coverPic: user.coverPic
        }
    });
});

//& Update Password
export const updatePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const user = req.user; // From authentication middleware

    // Check if user is deleted or banned
    if (user.deletedAt) {
        return next(new Error("Cannot update password for a deleted account", { cause: 403 }));
    }
    if (user.bannedAt) {
        return next(new Error("Cannot update password for a banned account", { cause: 403 }));
    }

    // Validate current password (optional, remove if not required)
    if (currentPassword) {
        const isValid = await Compare({ key: currentPassword, hashed: user.password });
        if (!isValid) {
            return next(new Error("Current password is incorrect", { cause: 401 }));
        }
    } else {
        return next(new Error("Current password is required", { cause: 400 }));
    }

    // Update password and changeCredentialTime
    const updatedUser = await UsersModel.findByIdAndUpdate(
        user._id,
        {
            $set: {
                password: newPassword, // Will be hashed by pre-save hook
                changeCredentialTime: new Date() // Update credential change time
            }
        },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        return next(new Error("Failed to update password", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Password updated successfully"
    });
});

//& Upload Profile Pic
export const uploadProfilePic = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (user.deletedAt) {
        return next(new Error("Cannot update a deleted account", { cause: 403 }));
    }
    if (user.bannedAt) {
        return next(new Error("Cannot update a banned account", { cause: 403 }));
    }

    if (!req.file) {
        return next(new Error("Please upload a profile image"));
    }

    const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path);
    const profileImage = { secure_url, public_id };

    // Delete existing profile pic if it exists
    if (user.profilePic?.public_id) {
        await cloudinary.uploader.destroy(user.profilePic.public_id);
    }

    const updatedUser = await UsersModel.findByIdAndUpdate(
        user._id,
        { profilePic: profileImage },
        { new: true }
    );

    return res.status(200).json({
        msg: "Profile picture uploaded successfully",
        profilePic: updatedUser.profilePic
    });
});

//& Upload Cover Pic
export const uploadCoverPic = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (user.deletedAt) {
        return next(new Error("Cannot update a deleted account", { cause: 403 }));
    }
    if (user.bannedAt) {
        return next(new Error("Cannot update a banned account", { cause: 403 }));
    }

    // Ensure files are uploaded
    if (!req.files || req.files.length === 0) {
        return next(new Error("Please upload at least one cover picture", { cause: 400 }));
    }

    try {
        const arrFiles = await Promise.all(
            req.files.map(async (file) => {
                const { secure_url, public_id } = await cloudinary.uploader.upload(file.path, { folder: "social-app" });
                return { secure_url, public_id };
            })
        );

        const updatedUser = await UsersModel.findByIdAndUpdate(
            user._id,
            { $push: { coverPic: { $each: arrFiles } } },
            { new: true }
        );

        return res.status(200).json({
            msg: "Cover pictures uploaded successfully",
            coverPic: updatedUser.coverPic
        });
    } catch (error) {
        return next(new Error("Error uploading cover pictures", { cause: 500 }));
    }
});

//& Delete Profile Pic
export const deleteProfilePic = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (user.deletedAt) {
        return next(new Error("Cannot update a deleted account", { cause: 403 }));
    }
    if (user.bannedAt) {
        return next(new Error("Cannot update a banned account", { cause: 403 }));
    }

    if (!user.profilePic?.secure_url || !user.profilePic?.public_id) {
        return next(new Error("No profile picture to delete", { cause: 400 }));
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(user.profilePic.public_id);

    // Update DB: Remove only secure_url and public_id but keep profilePic object
    const updatedUser = await UsersModel.findByIdAndUpdate(
        user._id,
        { $set: { "profilePic.secure_url": null, "profilePic.public_id": null } },
        { new: true }
    );

    return res.status(200).json({
        msg: "Profile picture deleted successfully",
        profilePic: updatedUser.profilePic
    });
});

//& Delete Cover Pic
export const deleteCoverPic = asyncHandler(async (req, res, next) => {
    const { publicId } = req.body; // Public ID of the cover pic to delete
    const user = req.user;

    if (user.deletedAt) {
        return next(new Error("Cannot update a deleted account", { cause: 403 }));
    }
    if (user.bannedAt) {
        return next(new Error("Cannot update a banned account", { cause: 403 }));
    }

    if (!publicId) {
        return next(new Error("Public ID of cover picture is required", { cause: 400 }));
    }

    const coverPic = user.coverPic.find(pic => pic.public_id === publicId);
    if (!coverPic) {
        return next(new Error("Cover picture not found", { cause: 404 }));
    }

    await cloudinary.uploader.destroy(publicId);
    const updatedUser = await UsersModel.findByIdAndUpdate(
        user._id,
        { $pull: { coverPic: { public_id: publicId } } },
        { new: true }
    );

    return res.status(200).json({
        msg: "Cover picture deleted successfully",
        coverPic: updatedUser.coverPic
    });
});

//& Soft Delete Account
export const softDeleteAccount = asyncHandler(async (req, res, next) => {
    const user = req.user; // From authentication middleware

    // Check if already deleted
    if (user.isDeleted) {
        return next(new Error("Account is already deleted", { cause: 400 }));
    }
    if (user.deletedAt) {
        return next(new Error("Account is already marked as deleted", { cause: 400 }));
    }

    // Soft delete by setting isDeleted to true and deletedAt to current date
    const updatedUser = await UsersModel.findByIdAndUpdate(
        user._id,
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date()
            }
        },
        { new: true }
    );

    if (!updatedUser) {
        return next(new Error("Failed to delete account", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Account soft deleted successfully"
    });
});

//& Ban or Unban User
export const banUnbanUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params; // User ID from URL
    const user = req.user; // From authentication middleware

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new Error("Invalid user ID format", { cause: 400 }));
    }

    // Check if the requester is an admin
    if (user.role !== roles.admin) {
        return next(new Error("Only admins can ban or unban users", { cause: 403 }));
    }

    // Find the user
    const targetUser = await UsersModel.findById(userId);
    if (!targetUser) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // Check if user is deleted
    if (targetUser.isDeleted || targetUser.deletedAt) {
        return next(new Error("Cannot ban or unban a deleted user", { cause: 403 }));
    }

    // Toggle ban status
    let updatedUser;
    if (targetUser.bannedAt) {
        // Unban: Set bannedAt to null
        updatedUser = await UsersModel.findByIdAndUpdate(
            userId,
            { $set: { bannedAt: null } },
            { new: true }
        );
        return res.status(200).json({
            msg: "User unbanned successfully",
            user: {
                id: updatedUser._id,
                email: updatedUser.email,
                bannedAt: updatedUser.bannedAt
            }
        });
    } else {
        // Ban: Set bannedAt to current date
        updatedUser = await UsersModel.findByIdAndUpdate(
            userId,
            { $set: { bannedAt: new Date() } },
            { new: true }
        );
        return res.status(200).json({
            msg: "User banned successfully",
            user: {
                id: updatedUser._id,
                email: updatedUser.email,
                bannedAt: updatedUser.bannedAt
            }
        });
    }
});