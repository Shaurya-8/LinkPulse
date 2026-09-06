import {prisma} from "../../config/prisma"
import { AuditAction } from "../../../generated/prisma/enums"
import { logger } from "../../common/utils/logger"

async function audit(
    action: AuditAction,
    options: {
        userId?: string
        ipAddress?: string
        userAgent?: string
        metaData?: Record<string, unknown>
        success?: boolean
        errorMsg?: string
    }
): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                userId: options.userId,
                ipAddress: options.ipAddress,
                userAgent: options.userAgent,
                metadata: options.metaData as any,
                success: options.success ?? true,
                errorMsg: options.errorMsg,
            },
        });
    } catch (err) {
        logger.error("Failed to write audit log", { action, err })
    }
}
