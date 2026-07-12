import { Prisma, UserDevice } from "../../../generated/prisma/client";
import { DbClient } from "../../config/prisma";
import { DeviceFingerprint } from "../../types";
export class DeviceRepository {
    constructor(private readonly db: DbClient) { }

    async findByUserAndFingerprint(
        userId: string,
        fingerprint: string
    ): Promise<UserDevice | null> {
        return this.db.userDevice.findUnique({
            where: {
                userId_deviceFingerprint: {
                    userId,
                    deviceFingerprint: fingerprint,
                },
            },
        });
    }

    async findByFingerprint(deviceFingerprint: DeviceFingerprint) {
        return this.db.userDevice.findUnique({ where: { deviceFingerprint } })
    }

    async create(data: Prisma.UserDeviceCreateInput): Promise<UserDevice> {
        return this.db.userDevice.create({
            data,
        });
    }

    async update(
        id: string,
        data: Prisma.UserDeviceUpdateInput
    ): Promise<UserDevice> {
        return this.db.userDevice.update({
            where: { id },
            data,
        });
    }

    async upsert(
        userId: string,
        fingerprint: string,
        data: Prisma.UserDeviceCreateInput
    ): Promise<UserDevice> {
        return this.db.userDevice.upsert({
            where: {
                userId_deviceFingerprint: {
                    userId,
                    deviceFingerprint: fingerprint,
                },
            },
            update: {
                lastSeenAt: new Date(),
                loginCount: {
                    increment: 1,
                },
            },
            create: data,
        });
    }

    async delete(id: string): Promise<UserDevice> {
        return this.db.userDevice.delete({
            where: { id },
        });
    }
}