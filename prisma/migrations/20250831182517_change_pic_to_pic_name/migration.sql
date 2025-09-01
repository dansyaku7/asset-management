/*
  Warnings:

  - You are about to drop the column `picId` on the `Asset` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Asset` DROP FOREIGN KEY `Asset_picId_fkey`;

-- DropIndex
DROP INDEX `Asset_picId_fkey` ON `Asset`;

-- AlterTable
ALTER TABLE `Asset` DROP COLUMN `picId`,
    ADD COLUMN `picContact` VARCHAR(191) NULL,
    ADD COLUMN `picName` VARCHAR(191) NULL;
