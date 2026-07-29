import { prisma } from "../../config/prisma";
import { logger } from "../../common/utils/logger";
async function audit(action, options) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                userId: options.userId,
                ipAddress: options.ipAddress,
                userAgent: options.userAgent,
                metadata: options.metaData,
                success: options.success ?? true,
                errorMsg: options.errorMsg,
            },
        });
    }
    catch (err) {
        logger.error("Failed to write audit log", { action, err });
    }
}
//# sourceMappingURL=audit.service.js.map