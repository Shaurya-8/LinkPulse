import { config } from "../../config";
import { OtpPurpose } from "../../types";
// ─────────────────────────────────────────────
// Email Templates
// ─────────────────────────────────────────────

// function baseTemplate(title: string, content: string): string {
//     return `
//         <!DOCTYPE html>
//         <html lang="en">
//             <head>
//                 <meta charset="UTF-8" />
//                 <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//                 <title>${title}</title>
//                 <style>
//                     * { margin: 0; padding: 0; box-sizing: border-box; }
//                     body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; }
//                     .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
//                     .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center; }
//                     .header h1 { color: #fff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
//                     .header p { color: rgba(255,255,255,.8); font-size: 14px; margin-top: 6px; }
//                     .body { padding: 40px; }
//                     .body h2 { font-size: 20px; color: #111827; margin-bottom: 12px; }
//                     .body p { font-size: 15px; color: #4b5563; line-height: 1.6; margin-bottom: 16px; }
//                     .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 8px 0 24px; }
//                     .code-box { background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
//                     .code-box span { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #6366f1; font-family: monospace; }
//                     .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
//                     .footer { background: #f9fafb; padding: 24px 40px; text-align: center; }
//                     .footer p { font-size: 13px; color: #9ca3af; line-height: 1.6; }
//                     .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; }
//                 </style>
//             </head>
//         <body>
//         <div class="wrapper">
//             <div class="header">
//                 <h1>🔗 LinkSnap</h1>
//                 <p>Professional URL Shortener</p>
//             </div>
//             <div class="body">${content}</div>
//             <div class="footer">
//                 <p>You received this email because an account was registered with your address.<br/>
//                 If you did not sign up, please ignore this email.</p>
//                 <p style="margin-top: 8px;">© ${new Date().getFullYear()} LinkSnap. All rights reserved.</p>
//             </div>
//         </div>
//         </body>
//         </html>`;
// }

interface OtpEmailTemplateOptions {
    otp: string;
    purpose: string;
    expiresIn: number;
    recipientName?: string;
}

export function baseTemplate({
    title,
    heading,
    content,
}: {
    title: string;
    heading: string;
    content: string;
}): string {
    return `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${title}</title>
                    <style>
                        *{
                            margin:0;
                            padding:0;
                            box-sizing:border-box;
                        }
                        body{
                            background:#f3f4f6;
                            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
                            color:#374151;
                            padding:32px 16px;
                        }

                        .container{
                            max-width:600px;
                            margin:auto;
                            background:#ffffff;
                            border-radius:12px;
                            overflow:hidden;
                            box-shadow:0 5px 20px rgba(0,0,0,.08);
                        }

                        .header{
                            background:#2563eb;
                            padding:32px;
                            text-align:center;
                        }

                        .header h1{
                            color:white;
                            font-size:28px;
                        }

                        .header p{
                            color:#dbeafe;
                            margin-top:8px;
                        }

                        .content{
                            padding:40px;
                        }

                        .content h2{
                            color:#111827;
                            margin-bottom:16px;
                        }

                        .content p{
                            font-size:15px;
                            line-height:1.7;
                            margin-bottom:16px;
                        }

                        .button{
                            display:inline-block;
                            padding:14px 28px;
                            background:#2563eb;
                            color:white !important;
                            text-decoration:none;
                            border-radius:8px;
                            font-weight:600;
                        }

                        .footer{
                            padding:24px;
                            text-align:center;
                            background:#f9fafb;
                            border-top:1px solid #e5e7eb;
                        }

                        .footer p{
                            font-size:13px;
                            color:#6b7280;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔗 LinkSnap</h1>
                            <p>Simple • Secure • Fast</p>
                        </div>
                        <div class="content">
                            <h2>${heading}</h2>
                            ${content}
                        </div>
                        <div class="footer">
                            <p>
                                This email was sent automatically.
                                Please do not reply to this message.
                            </p>
                            <p style="margin-top:10px">
                                © ${new Date().getFullYear()} LinkSnap. All rights reserved.
                            </p>
                        </div>
                    </div>
                </body>
            </html>`;
}
interface OtpTemplateOptions {
    otp: string;
    purpose: OtpPurpose;
    expiresIn: number;
}



interface OtpEmailTemplateOptions {
    otp: string;
    purpose: string;
    expiresIn: number;
    recipientName?: string;
}

export function otpTemplate({
    otp,
    purpose,
    expiresIn,
    recipientName,
}: OtpEmailTemplateOptions) {
    return {
        subject: `${config.app.name} Verification Code`,
        text: `Hello${recipientName ? ` ${recipientName}` : ""},
                A One-Time Password (OTP) has been generated to ${purpose}.
                OTP:${otp}
                This code will expire in ${expiresIn} minutes.
                If you did not initiate this request, you can safely ignore this email. For your security, never share this code with anyone.
                Thanks,
                ${config.app.name}`,
        html: baseTemplate({
            title: "Verification Code",
            heading: "Your One-Time Password",
            content: `${recipientName
                ? `<p>Hello <strong>${recipientName}</strong>,</p>`
                : ""
                }
                <p>
                    A One-Time Password (OTP) has been generated to
                    <strong>${purpose}</strong>.
                </p>
                <p>
                    Enter the code below to continue.
                </p>
                <div style="
                        margin:32px 0;
                        padding:24px;
                        border:2px dashed #2563eb;
                        border-radius:10px;
                        background:#f8fafc;
                        text-align:center;
                    ">

                    <p style="
                            font-size:36px;
                            letter-spacing:10px;
                            font-weight:bold;
                            color:#2563eb;
                            font-family:monospace;
                            "
                    >
                        ${otp}
                    </p>

                    <p style="margin-top:14px;">
                        This code expires in
                        <strong>${expiresIn} minutes</strong>.
                    </p>

                </div>

                <div
                    style="
                        background:#FEF3C7;
                        border-left:4px solid #F59E0B;
                        padding:16px;
                        border-radius:6px;
                    "
                >

                    <strong>Security Notice</strong>

                    <ul style="margin:12px 0 0 18px;">
                        <li>This OTP can be used only once.</li>
                        <li>Never share it with anyone, including ${config.app.name} support.</li>
                        <li>If you didn't request this OTP, no further action is required. Your account remains secure.</li>
                    </ul>

                </div>
                `,
        }),
    };
}

const emailTemplates = {
    [OtpPurpose.EMAIL_VERIFICATION]: (otp: string, purpose: string, expiresIn: number) => { return otpTemplate({ otp, purpose, expiresIn }) },
    [OtpPurpose.PASSWORD_RESET]: (otp: string, purpose: string, expiresIn: number) => otpTemplate({ otp, purpose, expiresIn })
};

export interface EmailTemplate {
    subject: string;
    text: string
    html: string;
};

export function otpTemplateFactory({ otp, purpose, expiresIn }: OtpTemplateOptions): EmailTemplate {
    const EMAIL_PORPUSE_MAP = {
        [OtpPurpose.EMAIL_VERIFICATION]: "verfiy",
        [OtpPurpose.PASSWORD_RESET]: "to reset password"
    }
    return emailTemplates[purpose](otp, EMAIL_PORPUSE_MAP[purpose], expiresIn);
}
