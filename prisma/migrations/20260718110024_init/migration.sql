-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('REGISTER', 'LOGIN_SUCCESS', 'LOGIN_FAIL', 'LOGOUT', 'LOGOUT_ALL', 'TOKEN_REFRESHED', 'TOKEN_REVOKED', 'EMAIL_VERIFIED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS', 'DEVICE_TRUSTED', 'DEVICE_REMOVED', 'SESSION_EXPIRED', 'RATE_LIMIT_HIT');

-- CreateEnum
CREATE TYPE "FeatureKey" AS ENUM ('CREATE_LINK', 'CUSTOM_ALIAS', 'PASSWORD_PROTECTION', 'LINK_EXPIRATION', 'ONE_TIME_LINKS', 'QR_CODE', 'CUSTOM_DOMAIN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL', 'PAUSED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "Countries" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" VARCHAR(2) NOT NULL,

    CONSTRAINT "Countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cities" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "Cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" TEXT,
    "last_login_at" TIMESTAMPTZ,
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" UUID,
    "ipAddress" VARCHAR(45),
    "refresh_token" CHAR(64) NOT NULL,
    "access_jti" UUID NOT NULL,
    "user_agent" VARCHAR(512),
    "cityId" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_fingerprint" CHAR(64) NOT NULL,
    "ipAddress" TEXT,
    "device_name" VARCHAR(200),
    "device_type" "DeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "os" VARCHAR(100),
    "os_version" VARCHAR(50),
    "browser" VARCHAR(100),
    "browser_version" VARCHAR(20),
    "cpu" VARCHAR(50),
    "user_agent" VARCHAR(512),
    "is_trusted" BOOLEAN NOT NULL DEFAULT false,
    "is_push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "push_token" VARCHAR(512),
    "login_count" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "session_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "country" VARCHAR(2),
    "metadata" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_code" VARCHAR(100),
    "error_msg" VARCHAR(512),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" UUID NOT NULL,
    "short_code" TEXT NOT NULL,
    "custom_alias" TEXT,
    "long_url" TEXT NOT NULL,
    "normalized_url" TEXT NOT NULL,
    "is_one_time" BOOLEAN NOT NULL DEFAULT false,
    "title" VARCHAR(256),
    "description" VARCHAR(512),
    "faviconUrl" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "password_hash" TEXT,
    "click_limit" INTEGER NOT NULL DEFAULT 0,
    "user_id" UUID NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_clicks" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "referer" TEXT,
    "city_id" UUID,
    "device_type" "DeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "browser" VARCHAR(100),
    "os" VARCHAR(100),
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBot" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "link_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" "PlanType" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "billing_period" "BillingPeriod" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "plan_price_id" UUID,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_limits" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "featureKey" "FeatureKey" NOT NULL,
    "limitValue" INTEGER NOT NULL,

    CONSTRAINT "feature_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_limit_used" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "featureKey" "FeatureKey" NOT NULL,
    "current_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "feature_limit_used_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Countries_code_key" ON "Countries"("code");

-- CreateIndex
CREATE INDEX "Cities_country_id_city_idx" ON "Cities"("country_id", "city");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_last_login_at_idx" ON "users"("last_login_at");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_access_jti_key" ON "sessions"("access_jti");

-- CreateIndex
CREATE INDEX "sessions_user_id_is_active_expires_at_idx" ON "sessions"("user_id", "is_active", "expires_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_is_active_idx" ON "sessions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_last_used_at_idx" ON "sessions"("last_used_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_hash_used_at_expires_at_idx" ON "password_reset_tokens"("token_hash", "used_at", "expires_at");

-- CreateIndex
CREATE INDEX "user_devices_last_seen_at_idx" ON "user_devices"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_fingerprint_key" ON "user_devices"("user_id", "device_fingerprint");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_ip_address_created_at_idx" ON "audit_logs"("ip_address", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_session_id_idx" ON "audit_logs"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "links_short_code_key" ON "links"("short_code");

-- CreateIndex
CREATE UNIQUE INDEX "links_custom_alias_key" ON "links"("custom_alias");

-- CreateIndex
CREATE INDEX "links_expires_at_is_active_idx" ON "links"("expires_at", "is_active");

-- CreateIndex
CREATE INDEX "links_user_id_is_active_expires_at_idx" ON "links"("user_id", "is_active", "expires_at");

-- CreateIndex
CREATE INDEX "links_expires_at_idx" ON "links"("expires_at");

-- CreateIndex
CREATE INDEX "links_user_id_idx" ON "links"("user_id");

-- CreateIndex
CREATE INDEX "links_created_at_idx" ON "links"("created_at");

-- CreateIndex
CREATE INDEX "link_clicks_clickedAt_idx" ON "link_clicks"("clickedAt");

-- CreateIndex
CREATE INDEX "link_clicks_link_id_clickedAt_idx" ON "link_clicks"("link_id", "clickedAt" DESC);

-- CreateIndex
CREATE INDEX "link_clicks_link_id_isBot_clickedAt_idx" ON "link_clicks"("link_id", "isBot", "clickedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE INDEX "plan_prices_plan_id_idx" ON "plan_prices"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_plan_id_billing_period_key" ON "plan_prices"("plan_id", "billing_period");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_expires_at_idx" ON "subscriptions"("expires_at");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_price_id_idx" ON "subscriptions"("plan_price_id");

-- CreateIndex
CREATE INDEX "feature_limits_plan_id_idx" ON "feature_limits"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_limits_plan_id_featureKey_key" ON "feature_limits"("plan_id", "featureKey");

-- CreateIndex
CREATE INDEX "feature_limit_used_subscription_id_idx" ON "feature_limit_used"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_limit_used_subscription_id_featureKey_key" ON "feature_limit_used"("subscription_id", "featureKey");

-- AddForeignKey
ALTER TABLE "Cities" ADD CONSTRAINT "Cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "Countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "Cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "Cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_price_id_fkey" FOREIGN KEY ("plan_price_id") REFERENCES "plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_limits" ADD CONSTRAINT "feature_limits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_limit_used" ADD CONSTRAINT "feature_limit_used_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
