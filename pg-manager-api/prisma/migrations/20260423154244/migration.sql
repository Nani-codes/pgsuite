-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_owner_id_fkey";

-- AlterTable
ALTER TABLE "owners" ADD COLUMN     "expo_push_token" VARCHAR(100);

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "expo_push_token" VARCHAR(100);

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
