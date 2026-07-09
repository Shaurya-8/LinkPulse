import { config } from "../../config";
import { prisma } from "../../config/prisma";

import generateShortCode, { normalizeUrl } from "./utils";
import { BadRequestError } from "../../common/errors/AppError";
import { logger } from "../../common/utils/logger";

import { Link } from "../../../generated/prisma/client";
import { DeviceId, DeviceInfo, UserId } from "../../types";
import { LinkDto } from "./link.schema"
import { CreateLinkDto } from "./link.type";

import LinkRepository from "./link.repository";

import { retry, isUniqueConstraintError } from "./utils/retryOnUniqueConflict";
import { cache, cacheKeys } from "../../config/redis";
import { DeviceRepository } from "../device/device.repository";

const linkRepository = new LinkRepository(prisma);
const deviceRepository = new DeviceRepository(prisma)

async function createUrl(data: CreateLinkDto, deviceId: DeviceId, maxAttempt?: number): Promise<Link> {
    let shortCode: string;
    return retry(
        () => {
            shortCode = data.customAlias ?? generateShortCode();
            const link = linkRepository.create({
                ...data, shortCode,
                device: { connect: { id: deviceId } }
            });
            return link;
        },
        {
            maxRetries: maxAttempt ?? config.link.maxRetry,
            shouldRetry: isUniqueConstraintError,
            onRetry: (attempt) => {
                logger.warn("Generated short code collision", {
                    shortCode,
                    attempt,
                    maxRetries: maxAttempt ?? config.link.maxRetry,
                });
            },
        }
    );

}


async function createDeviceView(deviceInfo: DeviceInfo, userId?: UserId): Promise<DeviceId> {
    let device = await deviceRepository.findByFingerprint(deviceInfo.fingerprint);

    if (!device) {
        device = await deviceRepository.create({
            ...deviceInfo,
            deviceFingerprint: deviceInfo.fingerprint,
            isTrusted: !!userId,
            loginCount: 1,
        });
    }

    return device.id as DeviceId;

}

export async function create(dto: LinkDto, deviceInfo: DeviceInfo, userId?: UserId,): Promise<string> {
    const normalizedUrl = normalizeUrl(dto.longUrl);
    if (!normalizedUrl) throw new BadRequestError('Not a valid url');
    const device = await createDeviceView(deviceInfo, userId);
    const link = await createUrl({
        ...dto,
        normalizedUrl,
        userId,
    }, device, dto.customAlias ? 1 : undefined);

    void cache.set(cacheKeys.shortLink(link.shortCode), { link }).catch(err => {
        logger.warn('URL cache failed: ', err);
    })

    return link.shortCode
}