export class LinkRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    create(args, tx = this.db) {
        return tx.links.create(args);
    }
    findUnique(args, tx = this.db) {
        return tx.links.findUnique(args);
    }
    findFirst(args, tx = this.db) {
        return tx.links.findFirst(args);
    }
    findMany(args, tx = this.db) {
        return tx.links.findMany(args);
    }
    update(args, tx = this.db) {
        return tx.links.update(args);
    }
    delete(args, tx = this.db) {
        return tx.links.delete(args);
    }
    upsert(args, tx = this.db) {
        return tx.links.upsert(args);
    }
    count(args, tx = this.db) {
        return tx.links.count(args);
    }
    createLink(data, userId, tx = this.db) {
        return this.create({
            data: {
                ...data.dto,
                shortCode: data.shortCode,
                normalizedUrl: data.normalizedUrl,
                ...(userId && {
                    user: {
                        connect: { id: userId },
                    }
                })
            },
            include: linkInclude
        }, tx);
    }
    findByShortCode(shortCode, tx) {
        return this.findFirst({
            where: { shortCode },
            include: linkInclude
        }, tx);
    }
    GetAll(userId, tx) {
        return this.findMany({ where: { userId } }, tx);
    }
    GetAllActive(userId, tx) {
        return this.findMany({ where: { userId, isActive: true } }, tx);
    }
    expireCode(shortCode, tx) {
        return this.update({
            where: { shortCode },
            data: {
                isActive: false
            }
        }, tx);
    }
    checkCustomAliasAvailable(customAlias, tx) {
        return this.findFirst({
            where: { shortCode: customAlias }
        }, tx);
    }
    findById(id, userId, tx) {
        return this.findFirst({
            where: { id, userId },
        });
    }
    deleteLink(id, tx) {
        return this.delete({
            where: {
                id
            }
        });
    }
    countLinks(userId, tx) {
        return this.count({ where: { userId } });
    }
    countActive(userId, tx) {
        return this.count({ where: { userId, isActive: true } });
    }
}
export const linkInclude = {
    redirectRules: {
        where: { isActive: true },
        orderBy: { priority: "desc" },
    },
    abTests: {
        where: { isActive: true },
        include: {
            variants: true,
        },
    },
};
//# sourceMappingURL=links.repository.js.map