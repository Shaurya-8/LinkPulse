import { config } from ".";
import nodemailer from "nodemailer";
import { logger } from "../common/utils/logger";
let transporter = null;
export function getTransporter() {
    if (transporter)
        return transporter;
    transporter = nodemailer.createTransport({
        host: config.Email.host,
        port: config.Email.port,
        secure: config.Email.secure,
        auth: {
            user: config.Email.user,
            pass: config.Email.pass,
        },
    });
    transporter.verify((err) => {
        if (err) {
            logger.error("SMTP verification failed:", err.message);
        }
        else {
            logger.info("SMTP transporter ready.");
        }
    });
    return transporter;
}
//# sourceMappingURL=nodemailer.js.map