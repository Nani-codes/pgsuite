ALTER TABLE "properties"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "properties_latitude_longitude_idx" ON "properties"("latitude", "longitude");
