/*
  Warnings:

  - A unique constraint covering the columns `[verifyToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `verifyExpiry` DATETIME(3) NULL,
    ADD COLUMN `verifyToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_verifyToken_key` ON `User`(`verifyToken`);
