export class DeviceRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByUserAndFingerprint(userId, fingerprint, tx = this.db) {
        return tx.userDevices.findUnique({
            where: {
                userId_deviceFingerprint: {
                    userId,
                    deviceFingerprint: fingerprint,
                },
            },
        });
    }
    async create(data, tx = this.db) {
        return tx.userDevices.create({
            data,
        });
    }
    async update(id, data, tx = this.db) {
        return tx.userDevices.update({
            where: { id },
            data,
        });
    }
    async upsert(userId, fingerprint, data, tx = this.db) {
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
    async delete(id, tx = this.db) {
        return tx.userDevices.delete({
            where: { id },
        });
    }
}
//# sourceMappingURL=device.repository.js.map