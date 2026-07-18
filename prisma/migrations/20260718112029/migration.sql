/*
  Warnings:

  - You are about to drop the `feature_limit_used` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "feature_limit_used" DROP CONSTRAINT "feature_limit_used_subscription_id_fkey";

-- DropTable
DROP TABLE "feature_limit_used";

-- CreateTable
CREATE TABLE "feature_limit_usages" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "featureKey" "FeatureKey" NOT NULL,
    "current_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "feature_limit_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feature_limit_usages_subscription_id_idx" ON "feature_limit_usages"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_limit_usages_subscription_id_featureKey_key" ON "feature_limit_usages"("subscription_id", "featureKey");

-- AddForeignKey
ALTER TABLE "feature_limit_usages" ADD CONSTRAINT "feature_limit_usages_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
