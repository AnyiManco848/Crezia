-- =====================================================================
-- MANUAL (not expressible in Prisma): extension used by gen_random_uuid()
-- defaults. Built into PG13+, kept to mirror docs/db/crezia_schema_v2.sql.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('User', 'Admin');

-- CreateEnum
CREATE TYPE "gender_type" AS ENUM ('Female', 'Male', 'Other');

-- CreateEnum
CREATE TYPE "movement_type" AS ENUM ('Income', 'Expense');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('Cash', 'Transfer', 'CreditCard', 'DebitCard', 'Other');

-- CreateEnum
CREATE TYPE "movement_source" AS ENUM ('Manual', 'EmailParsed');

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('Savings', 'Checking', 'Credit', 'Other');

-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('Active', 'Completed', 'Cancelled', 'Overdue');

-- CreateEnum
CREATE TYPE "goal_reason" AS ENUM ('Travel', 'Vehicle', 'Education', 'EmergencyFund', 'HomePurchase', 'Technology', 'DebtPayment', 'Other');

-- CreateEnum
CREATE TYPE "email_provider" AS ENUM ('Gmail', 'Outlook');

-- CreateEnum
CREATE TYPE "parse_status" AS ENUM ('Pending', 'Parsed', 'Failed', 'Ignored');

-- CreateEnum
CREATE TYPE "content_type" AS ENUM ('Article', 'Video', 'Tip', 'Infographic');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('Draft', 'Published', 'Archived');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('AntExpenseAlert', 'GoalDeadlineReminder', 'BudgetExceeded', 'System');

-- CreateTable
CREATE TABLE "currency" (
    "code" CHAR(3) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "symbol" VARCHAR(5) NOT NULL,
    "decimal_places" SMALLINT NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "birth_date" DATE NOT NULL,
    "gender" "gender_type",
    "gender_other" VARCHAR(100),
    "role" "user_role" NOT NULL DEFAULT 'User',
    "preferred_currency_code" CHAR(3) NOT NULL,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_alias" VARCHAR(100),
    "account_type" "account_type" NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "bank_account_id" UUID,
    "category_id" UUID NOT NULL,
    "type" "movement_type" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "source" "movement_source" NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "reason" "goal_reason" NOT NULL,
    "reason_other" VARCHAR(255),
    "target_amount" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "goal_status" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "email_provider" NOT NULL,
    "email_address" VARCHAR(255) NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "scope" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ(6),
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "email_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parsed_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email_connection_id" UUID NOT NULL,
    "external_message_id" VARCHAR(255) NOT NULL,
    "sender_address" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500),
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "parse_status" "parse_status" NOT NULL DEFAULT 'Pending',
    "movement_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parsed_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_profile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "monthly_income" DECIMAL(14,2),
    "fixed_expenses" DECIMAL(14,2),
    "ant_expense_percentage" DECIMAL(5,2),
    "makes_unnecessary_purchases" BOOLEAN,
    "has_debts" BOOLEAN,
    "debt_amount" DECIMAL(14,2),
    "app_usefulness_rating" SMALLINT,
    "currently_saves" BOOLEAN,
    "proposed_savings_amount" DECIMAL(14,2),
    "has_financial_knowledge" BOOLEAN,
    "can_detect_ant_expenses" BOOLEAN,
    "primary_payment_method" "payment_method",
    "additional_answers" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "content_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educational_content" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content_category_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "type" "content_type" NOT NULL,
    "body" TEXT,
    "media_url" VARCHAR(500),
    "duration_minutes" SMALLINT,
    "status" "content_status" NOT NULL DEFAULT 'Draft',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "educational_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_content_interactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "is_rejected" BOOLEAN NOT NULL DEFAULT false,
    "rejected_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "user_content_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "goal_id" UUID,
    "movement_id" UUID,
    "category_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_users_currency" ON "users"("preferred_currency_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_document_id" ON "users"("document_id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_categories_user" ON "categories"("user_id");

-- CreateIndex
CREATE INDEX "idx_bank_accounts_user" ON "bank_accounts"("user_id");

-- CreateIndex
CREATE INDEX "idx_bank_accounts_currency" ON "bank_accounts"("currency_code");

-- CreateIndex
CREATE INDEX "idx_movements_user" ON "movements"("user_id");

-- CreateIndex
CREATE INDEX "idx_movements_bank_account_active" ON "movements"("bank_account_id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_movements_category" ON "movements"("category_id");

-- CreateIndex
CREATE INDEX "idx_movements_currency" ON "movements"("currency_code");

-- CreateIndex
CREATE INDEX "idx_movements_date" ON "movements"("date");

-- CreateIndex
CREATE INDEX "idx_goals_user" ON "goals"("user_id");

-- CreateIndex
CREATE INDEX "idx_goals_category" ON "goals"("category_id");

-- CreateIndex
CREATE INDEX "idx_goals_currency" ON "goals"("currency_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_goals_active_category" ON "goals"("user_id", "category_id") WHERE (deleted_at IS NULL AND status IN ('Active', 'Overdue'));

-- CreateIndex
CREATE INDEX "idx_email_connections_user" ON "email_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_email_connections_user_email" ON "email_connections"("user_id", "email_address") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_parsed_emails_connection" ON "parsed_emails"("email_connection_id");

-- CreateIndex
CREATE INDEX "idx_parsed_emails_movement" ON "parsed_emails"("movement_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_parsed_emails_connection_message" ON "parsed_emails"("email_connection_id", "external_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_profile_user_id_key" ON "financial_profile"("user_id");

-- CreateIndex
CREATE INDEX "idx_educational_content_category" ON "educational_content"("content_category_id");

-- CreateIndex
CREATE INDEX "idx_user_content_interactions_user" ON "user_content_interactions"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_content_interactions_content" ON "user_content_interactions"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_content_interactions" ON "user_content_interactions"("user_id", "content_id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_goal" ON "notifications"("goal_id");

-- CreateIndex
CREATE INDEX "idx_notifications_movement" ON "notifications"("movement_id");

-- CreateIndex
CREATE INDEX "idx_notifications_category" ON "notifications"("category_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_currency_code_fkey" FOREIGN KEY ("preferred_currency_code") REFERENCES "currency"("code") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currency"("code") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currency"("code") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currency"("code") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parsed_emails" ADD CONSTRAINT "parsed_emails_email_connection_id_fkey" FOREIGN KEY ("email_connection_id") REFERENCES "email_connections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parsed_emails" ADD CONSTRAINT "parsed_emails_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "movements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "financial_profile" ADD CONSTRAINT "financial_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "educational_content" ADD CONSTRAINT "educational_content_content_category_id_fkey" FOREIGN KEY ("content_category_id") REFERENCES "content_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "educational_content" ADD CONSTRAINT "educational_content_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "educational_content" ADD CONSTRAINT "educational_content_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "educational_content" ADD CONSTRAINT "educational_content_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_content_interactions" ADD CONSTRAINT "user_content_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_content_interactions" ADD CONSTRAINT "user_content_interactions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "educational_content"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_content_interactions" ADD CONSTRAINT "user_content_interactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_content_interactions" ADD CONSTRAINT "user_content_interactions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_content_interactions" ADD CONSTRAINT "user_content_interactions_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "movements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- =====================================================================
-- MANUAL (not expressible in Prisma): CHECK constraints from the DDL.
-- Inline column checks keep the name PostgreSQL would have given them.
-- =====================================================================
ALTER TABLE "currency"
    ADD CONSTRAINT "currency_decimal_places_check" CHECK (decimal_places >= 0);

ALTER TABLE "users"
    ADD CONSTRAINT "chk_users_adult" CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years'));

ALTER TABLE "categories"
    ADD CONSTRAINT "chk_categories_default_no_owner" CHECK (is_default = false OR user_id IS NULL);

ALTER TABLE "movements"
    ADD CONSTRAINT "movements_amount_check" CHECK (amount > 0);

ALTER TABLE "goals"
    ADD CONSTRAINT "goals_target_amount_check" CHECK (target_amount > 0),
    ADD CONSTRAINT "chk_goals_dates" CHECK (end_date >= start_date);

ALTER TABLE "financial_profile"
    ADD CONSTRAINT "financial_profile_app_usefulness_rating_check" CHECK (app_usefulness_rating BETWEEN 1 AND 10);

ALTER TABLE "educational_content"
    ADD CONSTRAINT "chk_content_published" CHECK (status <> 'Published' OR published_at IS NOT NULL);

ALTER TABLE "notifications"
    ADD CONSTRAINT "chk_notification_entity" CHECK (
        (type = 'AntExpenseAlert'      AND movement_id IS NOT NULL AND goal_id IS NULL AND category_id IS NULL) OR
        (type = 'GoalDeadlineReminder' AND goal_id IS NOT NULL AND movement_id IS NULL AND category_id IS NULL) OR
        (type = 'BudgetExceeded'       AND category_id IS NOT NULL AND movement_id IS NULL AND goal_id IS NULL) OR
        (type = 'System'               AND movement_id IS NULL AND goal_id IS NULL AND category_id IS NULL)
    );

-- =====================================================================
-- MANUAL (not expressible in Prisma): automatic updated_at on UPDATE.
-- Prisma's @updatedAt covers writes made through the client; the trigger
-- also covers writes made with raw SQL.
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_movements_updated_at BEFORE UPDATE ON movements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_email_connections_updated_at BEFORE UPDATE ON email_connections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_financial_profile_updated_at BEFORE UPDATE ON financial_profile
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_categories_updated_at BEFORE UPDATE ON content_categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_educational_content_updated_at BEFORE UPDATE ON educational_content
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_content_interactions_updated_at BEFORE UPDATE ON user_content_interactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
