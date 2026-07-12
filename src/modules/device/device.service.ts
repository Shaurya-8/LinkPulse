import { prisma } from "../../config/prisma"
import { DeviceInfo, UserId } from "../../types";
import { DeviceRepository } from "./device.repository";

const deviceRepository = new DeviceRepository(prisma);

export async function create(device: DeviceInfo, userId: UserId): Promise<string> {
    const created = await deviceRepository.create({
        ...device,
        user: { connect: { id: userId } }
    });
    return created.id;
}

export async function upsertDevice(userId: UserId, device: DeviceInfo): Promise<string> {
    const existing = await deviceRepository.findByUserAndFingerprint(userId, device.deviceFingerprint);

    if (existing) {
        const updated = await deviceRepository.update(existing.id, {
            lastSeenAt: new Date(),
            loginCount: { increment: 1 },
            ipAddress: undefined
        })
        return updated.id;
    }
    return await create(device, userId);
}
