-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('PATIENT_NOT_READY', 'MISSING_OXYGEN_TANK', 'DOCTOR_ABSENT', 'ELEVATOR_SATURATED', 'DELAY', 'GENERAL', 'INCIDENT');

-- CreateEnum
CREATE TYPE "CommentSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('BRUTE_FORCE_ATTEMPT', 'SUSPICIOUS_TOKEN_REUSE', 'ACCESS_DENIED', 'FAILED_LOGIN', 'UNAUTHORIZED_ACCESS', 'DATA_ACCESS_ANOMALY', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'RESOLVE';
ALTER TYPE "AuditAction" ADD VALUE 'MARK_IMPORTANT';
ALTER TYPE "AuditAction" ADD VALUE 'READ';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COMMENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'SECURITY_INCIDENT';
ALTER TYPE "NotificationType" ADD VALUE 'OPERATIONS_LOG';

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "severity" "CommentSeverity" NOT NULL DEFAULT 'INFO',
ADD COLUMN     "status" "CommentStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "type" "CommentType" NOT NULL DEFAULT 'GENERAL';

