import { Prisma, UserDevices } from "../../../generated/prisma/client";
import { DbClient } from "../../config/prisma";
import { DeviceFingerprint} from "../../types/index";
export class DeviceRepository {
    constructor(private readonly db: DbClient) { }

    async findByUserAndFingerprint(
        userId: string,
        fingerprint: DeviceFingerprint
        , tx: DbClient = this.db): Promise<UserDevices | null> {
        return tx.userDevices.findUnique({
            where: {
                userId_deviceFingerprint: {
                    userId,
                    deviceFingerprint: fingerprint,
                },
            },
        });
    }

    async create(data: Prisma.UserDevicesCreateInput, tx: DbClient = this.db): Promise<UserDevices> {
        return tx.userDevices.create({
            data,
        });
    }

    async update(
        id: string,
        data: Prisma.UserDevicesUpdateInput,
        tx: DbClient = this.db): Promise<UserDevices> {
        return tx.userDevices.update({
            where: { id },
            data,
        });
    }

    async upsert(
        userId: string,
        fingerprint: string,
        data: Prisma.UserDevicesCreateInput
        , tx: DbClient = this.db): Promise<UserDevices> {
        return tx.userDevices.upsert({
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

    async delete(id: string, tx: DbClient = this.db): Promise<UserDevices> {
        return tx.userDevices.delete({
            where: { id },
        });
    }
}