import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve("../../config/.env") });
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.PASSWORD,
    },
});

async function main(to, sub, html) {
    const info = await transporter.sendMail({
        from: `"Maddison Foo Koch 👻" <${process.env.EMAIL_ADDRESS}>`, // sender address
        to: to ? to : "mm246344@gmail.com", // list of receivers
        subject: sub ? sub : "Hello ✔", // Subject line
        text: "Hello world?", // plain text body
        html: html ? html : "<b>Hello world?</b>", // html body
    });

    if (info.accepted.length) {
        return true;
    }
    else {
        return false;
    }
}


// emailTemplates.js
export const acceptanceEmailTemplate = (userName, jobTitle, companyName) => `
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #4CAF50;">Congratulations, ${userName}!</h2>
        <p>We are pleased to inform you that your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been accepted!</p>
        <p>Our HR team will reach out to you soon with the next steps in the hiring process. If you have any questions, feel free to reply to this email.</p>
        <p>Best regards,</p>
        <p><strong>${companyName} HR Team</strong></p>
        <hr style="border: 1px solid #ddd;">
        <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply directly unless instructed.</p>
    </body>
    </html>
`;

export const rejectionEmailTemplate = (userName, jobTitle, companyName) => `
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #F44336;">Dear ${userName},</h2>
        <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
        <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. We appreciate your interest and the effort you put into applying.</p>
        <p>We encourage you to keep an eye on our future openings and wish you the best in your job search.</p>
        <p>Best regards,</p>
        <p><strong>${companyName} HR Team</strong></p>
        <hr style="border: 1px solid #ddd;">
        <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply directly unless instructed.</p>
    </body>
    </html>
`;

export default main