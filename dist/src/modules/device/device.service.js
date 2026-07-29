import { prisma } from "../../config/prisma";
import { DeviceRepository } from "./device.repository";
const deviceRepository = new DeviceRepository(prisma);
export async function create(device, userId, tx) {
    const created = await deviceRepository.create({
        ...device,
        user: { connect: { id: userId } }
    });
    return created.id;
}
export async function upsertDevice(userId, device, tx) {
    const existing = await deviceRepository.findByUserAndFingerprint(userId, device.deviceFingerprint, tx);
    if (existing) {
        const updated = await deviceRepository.update(existing.id, {
            lastSeenAt: new Date(),
            loginCount: { increment: 1 },
            ipAddress: undefined
        }, tx);
        return updated.id;
    }
    return await create(device, userId);
}
//# sourceMappingURL=device.service.js.map