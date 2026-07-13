/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Interaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Interaction_externalId_key" ON "Interaction"("externalId");
