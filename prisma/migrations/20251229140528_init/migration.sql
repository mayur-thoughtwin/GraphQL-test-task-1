/*
  Warnings:

  - You are about to drop the column `attendance` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Employee` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "attendance",
DROP COLUMN "role",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "age" DROP NOT NULL,
ALTER COLUMN "class" DROP NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSubject" (
    "employeeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "EmployeeSubject_pkey" PRIMARY KEY ("employeeId","subjectId")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "EmployeeSubject_employeeId_idx" ON "EmployeeSubject"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeSubject_subjectId_idx" ON "EmployeeSubject"("subjectId");

-- CreateIndex
CREATE INDEX "Attendance_employeeId_date_idx" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_age_idx" ON "Employee"("age");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSubject" ADD CONSTRAINT "EmployeeSubject_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSubject" ADD CONSTRAINT "EmployeeSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
