import { prisma } from "../../config/prisma"
import { DeviceInfo } from "../../types";
import { DeviceRepository } from "./device.repository";

const deviceRepository = new DeviceRepository(prisma);

export async function upsertDevice(userId: string, device: DeviceInfo): Promise<string> {
    const existing = await deviceRepository.findByUserAndFingerprint(userId, device.fingerprint);

    if (existing) {
        const updated = await deviceRepository.update(existing.id, {
            lastSeenAt: new Date(),
            loginCount: { increment: 1 },
            ipAddress: undefined
        })
        return updated.id;
    }

    const created = await deviceRepository.create({
        user: { connect: { id: userId } },
        deviceFingerprint: device.fingerprint,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        os: device.os,
        osVersion: device.osVersion,
        browser: device.browser,
        browserVersion: device.browserVersion,
        cpu: device.cpu,

    });
    return created.id;
}
