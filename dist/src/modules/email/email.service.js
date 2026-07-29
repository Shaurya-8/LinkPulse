import { getTransporter } from "../../config/nodemailer";
import { config } from "../../config";
import { logger } from "../../common/utils/logger";
import { OtpPurpose } from "../../types";
export async function sendEmail(options) {
    try {
        options = { from: config.Email.emailFrom, ...options };
        const info = await getTransporter().sendMail(options);
        logger.info(`Email sent: ${info.messageId}`);
        return info;
    }
    catch (err) {
        const error = err;
        switch (error.code) {
            case "ECONNECTION":
            case "ETIMEDOUT":
                logger.error("Network error", error.message);
                break;
            case "EAUTH":
                logger.error("SMTP authentication failed", error.message);
                break;
            case "EENVELOPE":
                logger.error("Invalid recipient", {
                    message: error.message,
                    rejected: error.rejected,
                });
                break;
            default:
                logger.error("Email sending failed", error.message);
        }
        throw error;
    }
}
export async function sendOtpEmail(email, otp, purpose, expiresMinutes = config.otp.expiresMinutes) {
    const PURPOSE_TEXT_MAP = {
        [OtpPurpose.EMAIL_VERIFICATION]: 'verify your email address',
        [OtpPurpose.PASSWORD_RESET]: 'reset your password',
    };
    const purposeText = PURPOSE_TEXT_MAP[purpose];
    const html = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your OTP Code</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.5px; }
                .body { padding: 40px; }
                .body p { color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
                .otp-box { background: #f8f9ff; border: 2px dashed #e0e4ff; border-radius: 10px; padding: 20px; text-align: center; margin: 28px 0; }
                .otp-code { font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #1a1a2e; font-family: 'Courier New', monospace; margin: 0; }
                .expiry { color: #9ca3af; font-size: 13px; margin-top: 10px; }
                .footer { background: #f8f9ff; padding: 20px 40px; text-align: center; }
                .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
                .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 20px; }
                .warning p { color: #9a3412; font-size: 13px; margin: 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 ${config.app.name}</h1>
                </div>
                <div class="body">
                    <p>Hello,</p>
                    <p>Use the following One-Time Password (OTP) to ${purposeText}. This code is valid for <strong>${expiresMinutes} minutes</strong>.</p>
                    <div class="otp-box">
                        <p class="otp-code">${otp}</p>
                        <p class="expiry">Expires in ${expiresMinutes} minutes</p>
                    </div>
                        <div class="warning">
                            <p>⚠️ Never share this code with anyone. ${config.app.name} will never ask for your OTP via phone, email, or chat.</p>
                        </div>
                    </div>
                    <div class="footer">
                    <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
                    <p style="margin-top: 8px;">&copy; ${new Date().getFullYear()} ${config.app.name}. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    `.trim();
    await sendEmail({
        to: email,
        subject: `${otp} is your ${config.app.name} verification code`,
        html,
    });
}
//# sourceMappingURL=email.service.js.map