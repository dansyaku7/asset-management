-- DropForeignKey
ALTER TABLE `Maintenance` DROP FOREIGN KEY `Maintenance_assetId_fkey`;

-- DropIndex
DROP INDEX `Maintenance_assetId_fkey` ON `Maintenance`;

-- AlterTable
ALTER TABLE `Asset` ADD COLUMN `calibrationDate` DATETIME(3) NULL,
    ADD COLUMN `calibrationPeriod` INTEGER NULL,
    ADD COLUMN `distributor` VARCHAR(191) NULL,
    ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `productionYear` INTEGER NULL,
    MODIFY `status` ENUM('BAIK', 'RUSAK', 'PERBAIKAN', 'DIPINJAM', 'KALIBRASI_EXPIRED') NOT NULL DEFAULT 'BAIK';

-- AddForeignKey
ALTER TABLE `Maintenance` ADD CONSTRAINT `Maintenance_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
