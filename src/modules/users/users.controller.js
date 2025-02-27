import { Router } from "express";
import { signup, confirmOTP, signin, googleAuth, requestPasswordReset, resetPassword, refreshToken, findUserByEmail, requestNewOTP, updateAccount, getUserProfile, updatePassword, uploadProfilePic, uploadCoverPic, deleteProfilePic, deleteCoverPic, softDeleteAccount, banUnbanUser, addAdmin } from "./users.service.js";
import { validation } from "../../middleware/validation.js";
import { signupSchema, confirmOTPSchema, signinSchema, googleAuthSchema, requestPasswordResetSchema, resetPasswordSchema, refreshTokenSchema, updateAccountSchema, getUserSchema, getUserProfileSchema, updatePasswordSchema, deleteCoverPicSchema, banUnbanUserSchema, addAdminSchema } from "./users.validation.js";
import { fileTypes, multerOnline } from "../../middleware/multer.js";
import { authentication, authorization, roles } from "../../middleware/auth.js";

const usersRouter = Router();

usersRouter.post('/auth/signup',
    multerOnline([...fileTypes.image]).fields([
        { name: 'attachment', maxCount: 1 },
        { name: 'attachments', maxCount: 5 }
    ]),
    validation(signupSchema),
    signup
);

usersRouter.post('/auth/admin',
    multerOnline([...fileTypes.image]).fields([
        { name: 'attachment', maxCount: 1 },
        { name: 'attachments', maxCount: 5 }
    ]),
    validation(addAdminSchema),
    addAdmin
);

usersRouter.post('/auth/confirm-otp',
    validation(confirmOTPSchema),
    confirmOTP
);

usersRouter.post('/auth/request-new-otp',
    validation(requestPasswordResetSchema),
    requestNewOTP
);

usersRouter.post('/auth/signin',
    validation(signinSchema),
    signin
);

usersRouter.post('/auth/google-auth',
    validation(googleAuthSchema),
    googleAuth
);

usersRouter.post('/auth/forget-password',
    validation(requestPasswordResetSchema),
    requestPasswordReset
);

usersRouter.post('/auth/reset-password',
    validation(resetPasswordSchema),
    resetPassword
);

usersRouter.post('/auth/refresh-token',
    validation(refreshTokenSchema),
    refreshToken
);

usersRouter.put('/update-account',
    authentication,
    validation(updateAccountSchema),
    updateAccount
);

usersRouter.get('/get-account',
    authentication,
    validation(getUserSchema),
    findUserByEmail
);

usersRouter.get('/profile/:userId',
    authentication,
    validation(getUserProfileSchema),
    getUserProfile
);

usersRouter.put('/update-password',
    authentication,
    validation(updatePasswordSchema),
    updatePassword
);

usersRouter.post('/upload-profile-pic',
    authentication,
    multerOnline([...fileTypes.image]).single('attachment'),
    uploadProfilePic
);

usersRouter.post('/upload-cover-pic',
    authentication,
    multerOnline([...fileTypes.image]).array('attachments', 5),
    uploadCoverPic
);

usersRouter.delete('/delete-profile-pic',
    authentication,
    deleteProfilePic
);

usersRouter.delete('/delete-cover-pic',
    authentication,
    validation(deleteCoverPicSchema),
    deleteCoverPic
);

usersRouter.delete('/soft-delete-account', 
    authentication, 
    softDeleteAccount
);

usersRouter.put('/ban-unban/:userId',
    authentication,
    validation(banUnbanUserSchema),
    authorization([roles.admin]),
    banUnbanUser
);

export default usersRouter;