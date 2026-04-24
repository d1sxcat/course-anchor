/*
  Warnings:

  - Changed the type of `action` on the `Permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `entity` on the `Permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `access` on the `Permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Action" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "Entity" AS ENUM ('NOTE', 'USER');

-- CreateEnum
CREATE TYPE "Access" AS ENUM ('OWN', 'ANY');

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "action",
ADD COLUMN     "action" "Action" NOT NULL,
DROP COLUMN "entity",
ADD COLUMN     "entity" "Entity" NOT NULL,
DROP COLUMN "access",
ADD COLUMN     "access" "Access" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_entity_access_key" ON "Permission"("action", "entity", "access");
