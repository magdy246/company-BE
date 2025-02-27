import { EventEmitter } from "events"
import sendMail from "../../service/sendEmail.js";
import { customAlphabet } from 'nanoid'
import UsersModel from "../../DB/models/users.model.js";
import { Hash } from "../../utils/index.js";
import { html } from "../../service/template-email.js";

export const eventEmitter = new EventEmitter();

eventEmitter.on("SendeningEmailConfirm", async (data) => {
    const { email, id } = data;
    const numbers = '0123456789';
    const generateOTP = customAlphabet(numbers, 6);
    const otp = generateOTP();
    const hashOTP = await Hash({ password: otp, SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS) });
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes as per your requirements

    // Update user with OTP in the OTP array
    await UsersModel.updateOne(
        { email, _id: id },
        {
            $push: {
                OTP: {
                    code: hashOTP,
                    type: 'confirmEmail',
                    expiresIn: otpExpiresAt
                }
            }
        }
    );

    const emailSender = await sendMail(email, "Confirm Email", await html(otp));
    if (!emailSender) {
        console.error("Error sending confirmation email");
        throw new Error("Failed to send confirmation email");
    }
});
eventEmitter.on("newEmailConfirm", async (data) => {
    const { email, id } = data;
    const numbers = '0123456789';
    const generateOTP = customAlphabet(numbers, 6);
    const otp = generateOTP();
    const hashOTP = await Hash({ password: otp, SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS) });
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await UsersModel.updateOne({ tempEmail: email, _id: id }, { otpNewEmail: hashOTP, otpExpiresAt, failedAttempts: 0, banUntil: null });

    const emailSender = await sendMail(email, "Confirm New Email", await html(otp));
    if (!emailSender) {
        console.error("Error sending confirmation email");
        throw new Error("Failed to send confirmation email");
    }
});

eventEmitter.on("SendPasswordResetOTP", async (data) => {
    const { email } = data;
    const numbers = '0123456789';
    const generateOTP = customAlphabet(numbers, 6);
    const otp = generateOTP();
    const hashOTP = await Hash({ password: otp, SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS) });
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await UsersModel.updateOne(
        { email },
        {
            $push: {
                OTP: {
                    code: hashOTP,
                    type: 'forgetPassword',
                    expiresIn: otpExpiresAt
                }
            }
        }
    );

    const emailSender = await sendMail(
        email,
        "Password Reset Request",
        await html(otp)
    );

    if (!emailSender) {
        console.error("Error sending password reset email");
        throw new Error("Failed to send password reset email");
    }
});
