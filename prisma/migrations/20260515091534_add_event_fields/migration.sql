-- AlterTable
ALTER TABLE `event` ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `categoryColor` VARCHAR(191) NULL,
    ADD COLUMN `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `recurrence` TEXT NULL,
    ADD COLUMN `recurringId` VARCHAR(191) NULL,
    ADD COLUMN `reminder` INTEGER NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'busy';
