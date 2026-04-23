-- Create prospects table for onboarding users without owner/tenant assignment
CREATE TABLE "prospects" (
  "id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "email" VARCHAR(255),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prospects_phone_key" ON "prospects"("phone");

-- Extend properties for marketplace shape support
ALTER TABLE "properties"
  ALTER COLUMN "owner_id" DROP NOT NULL,
  ADD COLUMN "source_property_id" VARCHAR(100),
  ADD COLUMN "source_pg_id" VARCHAR(100),
  ADD COLUMN "source_eazypg_id" VARCHAR(100),
  ADD COLUMN "source_pg_number" INTEGER,
  ADD COLUMN "state" VARCHAR(100),
  ADD COLUMN "pincode" VARCHAR(20),
  ADD COLUMN "available_for" VARCHAR(100),
  ADD COLUMN "about" TEXT,
  ADD COLUMN "common_amenities_summary" TEXT,
  ADD COLUMN "service_amenities_summary" TEXT,
  ADD COLUMN "food_amenities_summary" TEXT,
  ADD COLUMN "image_urls" JSONB DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX "properties_source_property_id_key" ON "properties"("source_property_id");
