import nodemailer from 'nodemailer';
import EnvData from '../config/EnvData.js';

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EnvData.Email_User,
        pass: EnvData.Email_Pass,
    },
});

export const sendMail = async ({ email, title, msg }) => {
    try {
        if (!email) {
            console.log("Email is required to send mail — " + title);
            return;
        }
        if (!EnvData.Email_User || !EnvData.Email_Pass) {
            console.log("Email credentials not configured — skipping mail: " + title);
            return;
        }
        const info = await transporter.sendMail({
            from: `"HRMS" <${EnvData.Email_User}>`,
            to: email,
            subject: title,
            html: msg,
        });
        console.log("Email sent:", info.messageId);
    } catch (error) {
        console.error("Email send error:", error.message);
    }
};
