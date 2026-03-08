-- AlterTable: add role and passwordHash to Employee
ALTER TABLE `Employee`
  ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'employee',
  ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL DEFAULT '';
