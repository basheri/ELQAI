-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REVIEWER', 'ADMIN', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('UPLOADED', 'EXTRACTED', 'ANALYZING', 'ANALYZED', 'SIGNED_OFF', 'EXPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('READY', 'READY_LIMITED_FIXES', 'NEEDS_SUBSTANTIAL_REVISION', 'NOT_READY', 'INCOMPLETE_EVIDENCE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Framework" AS ENUM ('QM', 'NELC', 'CONTENT', 'ACCESSIBILITY', 'CULTURAL_SAFETY');

-- CreateEnum
CREATE TYPE "SafetyStatus" AS ENUM ('CLEAR', 'FLAGGED', 'FAILED');

-- CreateEnum
CREATE TYPE "ComplianceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NOT_ASSESSED');

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'REVIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'UPLOADED',
    "overallReadiness" INTEGER,
    "qmLevel" "ComplianceLevel",
    "nelcLevel" "ComplianceLevel",
    "contentLevel" "ComplianceLevel",
    "accessibilityLevel" "ComplianceLevel",
    "safetyStatus" "SafetyStatus",
    "verdict" "Verdict",
    "reviewedById" TEXT,
    "signedOffAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExaminedFile" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "examinable" BOOLEAN NOT NULL,
    "reason" TEXT,

    CONSTRAINT "ExaminedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "framework" "Framework" NOT NULL,
    "criterionRef" TEXT,
    "severity" "Severity" NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "recommendationAr" TEXT NOT NULL,
    "location" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "overridden" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "framework" "Framework" NOT NULL,
    "code" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "descAr" TEXT,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Review_orgId_createdAt_idx" ON "Review"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Finding_reviewId_severity_idx" ON "Finding"("reviewId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "RubricCriterion_code_key" ON "RubricCriterion"("code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExaminedFile" ADD CONSTRAINT "ExaminedFile_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
