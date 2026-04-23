/*
  Warnings:

  - A unique constraint covering the columns `[idempotency_key]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotency_key]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('rent', 'late_fee', 'utility', 'maintenance', 'other');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'converted');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('walk_in', 'online', 'referral', 'social_media', 'other');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new_lead', 'contacted', 'interested', 'visit_scheduled', 'visit_done', 'converted', 'lost');

-- CreateEnum
CREATE TYPE "DuesFrequency" AS ENUM ('monthly', 'quarterly', 'half_yearly', 'yearly');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'rent_reminder';
ALTER TYPE "NotificationType" ADD VALUE 'overdue_notice';
ALTER TYPE "NotificationType" ADD VALUE 'late_fee_applied';

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "type" "InvoiceItemType" NOT NULL DEFAULT 'other';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "idempotency_key" VARCHAR(100);

-- AlterTable
ALTER TABLE "leases" ADD COLUMN     "dues_package_id" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "collected_by" VARCHAR(255),
ADD COLUMN     "idempotency_key" VARCHAR(100),
ADD COLUMN     "reference_no" VARCHAR(100);

-- CreateTable
CREATE TABLE "late_fee_policies" (
    "id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "grace_days" INTEGER NOT NULL DEFAULT 5,
    "feeType" VARCHAR(20) NOT NULL DEFAULT 'fixed',
    "feeAmount" DECIMAL(10,2) NOT NULL,
    "max_fee" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "late_fee_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "bed_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "expected_check_in" DATE NOT NULL,
    "rent_amount" DECIMAL(10,2) NOT NULL,
    "advance_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "advance_paid" BOOLEAN NOT NULL DEFAULT false,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "converted_tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "source" "LeadSource" NOT NULL DEFAULT 'other',
    "status" "LeadStatus" NOT NULL DEFAULT 'new_lead',
    "budget" DECIMAL(10,2),
    "preferred_room_type" VARCHAR(50),
    "follow_up_date" DATE,
    "notes" TEXT,
    "converted_booking_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dues_packages" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "frequency" "DuesFrequency" NOT NULL DEFAULT 'monthly',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "auto_generate" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dues_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dues_package_items" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "type" "InvoiceItemType" NOT NULL DEFAULT 'other',
    "description" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dues_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "late_fee_policies_lease_id_key" ON "late_fee_policies"("lease_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "bookings_owner_id_status_idx" ON "bookings"("owner_id", "status");

-- CreateIndex
CREATE INDEX "bookings_property_id_idx" ON "bookings"("property_id");

-- CreateIndex
CREATE INDEX "leads_owner_id_status_idx" ON "leads"("owner_id", "status");

-- CreateIndex
CREATE INDEX "leads_property_id_idx" ON "leads"("property_id");

-- CreateIndex
CREATE INDEX "dues_packages_owner_id_idx" ON "dues_packages"("owner_id");

-- CreateIndex
CREATE INDEX "dues_package_items_package_id_idx" ON "dues_package_items"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_idempotency_key_key" ON "invoices"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_dues_package_id_fkey" FOREIGN KEY ("dues_package_id") REFERENCES "dues_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "late_fee_policies" ADD CONSTRAINT "late_fee_policies_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dues_packages" ADD CONSTRAINT "dues_packages_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dues_packages" ADD CONSTRAINT "dues_packages_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dues_package_items" ADD CONSTRAINT "dues_package_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "dues_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
