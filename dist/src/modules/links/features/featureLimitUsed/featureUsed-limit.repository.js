export class FeatureLimitUsedRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    count(args, tx = this.db) {
        return tx.linkClicks.count(args);
    }
    async lock(subscriptionId, featureKeys, tx = this.db) {
        await tx.$queryRaw `
            SELECT *
            FROM feature_limit_usages
            WHERE subscription_id = ${subscriptionId}
            AND feature_key = ANY(${featureKeys}::"FeatureKey"[])
            FOR UPDATE
        `;
    }
    getById(id, tx = this.db) {
        return tx?.featureUsages.findUnique({
            where: { id }
        });
    }
    getByPlanId(subscriptionId, tx = this.db) {
        return tx.featureUsages.findMany({
            where: {
                subscriptionId
            }
        });
    }
    create(data, tx = this.db) {
        return tx.featureUsages.create({
            data
        });
    }
    createMany(data, tx = this.db) {
        return tx.featureUsages.createMany({
            data
        });
    }
    updateByFeature(subscriptionId, featureKey, currentUsed, tx = this.db) {
        return tx.featureUsages.update({
            where: {
                subscriptionId_featureKey: {
                    subscriptionId,
                    featureKey
                }
            },
            data: { currentUsed }
        });
    }
    countLastMonth(userId, tx = this.db) {
        return tx.linkClicks.count({
            where: {
                link: { userId },
                isBot: false,
                clickedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
        });
    }
}
//# sourceMappingURL=featureUsed-limit.repository.js.map