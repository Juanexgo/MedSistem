-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HEAD_NURSE', 'NURSING', 'TRANSPORTER', 'SUPERVISOR', 'AUDITOR', 'DOCTOR');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('CREATE_TRANSFER', 'ASSIGN_TRANSFER', 'REASSIGN_TRANSFER', 'CANCEL_TRANSFER', 'CLOSE_SHIFT', 'VIEW_AUDIT', 'EXPORT_REPORTS', 'MANAGE_OXYGEN', 'VIEW_PATIENT_DATA', 'MANAGE_USERS', 'MANAGE_ROLES', 'VIEW_TRANSFERS', 'EDIT_TRANSFER', 'MANAGE_ZONES', 'VIEW_DASHBOARD', 'MANAGE_SHIFTS', 'VIEW_COMMENTS', 'CREATE_COMMENT', 'MANAGE_HANDOFF', 'VIEW_SECURITY', 'MANAGE_SETTINGS');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('AVAILABLE', 'BUSY', 'IN_TRANSFER', 'BREAK', 'OFF_SHIFT');

-- CreateEnum
CREATE TYPE "TransferPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('STRETCHER', 'WHEELCHAIR', 'WALKING');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'ASSIGNED', 'ON_THE_WAY', 'PATIENT_PICKED_UP', 'IN_TRANSFER', 'ARRIVED', 'IN_STUDY', 'RETURN_REQUESTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OxygenTankStatus" AS ENUM ('FULL', 'MEDIUM', 'LOW', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('URGENT_UNASSIGNED', 'PATIENT_WAITING', 'CRITICAL_OXYGEN', 'DELAYED_SERVICE', 'PENDING_HANDOFF', 'COMMENT_IMPORTANT', 'TRANSFER_UPDATE', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'ASSIGN', 'REASSIGN', 'CANCEL', 'COMPLETE', 'VIEW', 'EXPORT', 'HANDOFF', 'CLOSE_SHIFT', 'ALERT_TRIGGERED');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "roleId" UUID,
    "employeeStatus" "EmployeeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "medicalRecordNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_requests" (
    "id" UUID NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "qrCodeDataUrl" TEXT,
    "patientId" UUID NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "priority" "TransferPriority" NOT NULL,
    "transportType" "TransportType" NOT NULL,
    "requestedStudy" TEXT,
    "notes" TEXT,
    "requiresOxygen" BOOLEAN NOT NULL DEFAULT false,
    "oxygenLiters" INTEGER,
    "assignedTankId" UUID,
    "tankLevel" INTEGER,
    "manometer" INTEGER,
    "requiresDoctorCompanion" BOOLEAN NOT NULL DEFAULT false,
    "doctorCompanionName" TEXT,
    "authorizingUserId" UUID NOT NULL,
    "assignedTransporterId" UUID,
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_status_history" (
    "id" UUID NOT NULL,
    "transferRequestId" UUID NOT NULL,
    "status" "TransferStatus" NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "transferRequestId" UUID NOT NULL,
    "transporterId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_history" (
    "id" UUID NOT NULL,
    "transferRequestId" UUID NOT NULL,
    "transporterId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "zone" TEXT,
    "action" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oxygen_tanks" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "status" "OxygenTankStatus" NOT NULL,
    "psi" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "oxygen_tanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oxygen_tank_history" (
    "id" UUID NOT NULL,
    "tankId" UUID NOT NULL,
    "previousLevel" INTEGER NOT NULL,
    "newLevel" INTEGER NOT NULL,
    "previousStatus" "OxygenTankStatus" NOT NULL,
    "newStatus" "OxygenTankStatus" NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "transferRequestId" UUID,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oxygen_tank_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "type" "ShiftType" NOT NULL,
    "userId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_handoffs" (
    "id" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "completedServices" TEXT,
    "pendingServices" TEXT,
    "patientsInTransfer" TEXT,
    "incompleteStudies" TEXT,
    "incidents" TEXT,
    "lowOxygenTanks" TEXT,
    "observations" TEXT,
    "handedOffById" UUID NOT NULL,
    "receivedById" UUID NOT NULL,
    "handoffAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "userId" UUID NOT NULL,
    "transferRequestId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_zones" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_action_key" ON "permissions"("action");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_requests_trackingToken_key" ON "transfer_requests"("trackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "oxygen_tanks_code_key" ON "oxygen_tanks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_shiftCode_key" ON "shifts"("shiftCode");

-- CreateIndex
CREATE UNIQUE INDEX "shift_handoffs_shiftId_key" ON "shift_handoffs"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_zones_name_key" ON "hospital_zones"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_zones_code_key" ON "hospital_zones"("code");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_assignedTankId_fkey" FOREIGN KEY ("assignedTankId") REFERENCES "oxygen_tanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_authorizingUserId_fkey" FOREIGN KEY ("authorizingUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_assignedTransporterId_fkey" FOREIGN KEY ("assignedTransporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_status_history" ADD CONSTRAINT "transfer_status_history_transferRequestId_fkey" FOREIGN KEY ("transferRequestId") REFERENCES "transfer_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_status_history" ADD CONSTRAINT "transfer_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_transferRequestId_fkey" FOREIGN KEY ("transferRequestId") REFERENCES "transfer_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_history" ADD CONSTRAINT "route_history_transferRequestId_fkey" FOREIGN KEY ("transferRequestId") REFERENCES "transfer_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_history" ADD CONSTRAINT "route_history_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oxygen_tank_history" ADD CONSTRAINT "oxygen_tank_history_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "oxygen_tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oxygen_tank_history" ADD CONSTRAINT "oxygen_tank_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handoffs" ADD CONSTRAINT "shift_handoffs_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handoffs" ADD CONSTRAINT "shift_handoffs_handedOffById_fkey" FOREIGN KEY ("handedOffById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handoffs" ADD CONSTRAINT "shift_handoffs_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_transferRequestId_fkey" FOREIGN KEY ("transferRequestId") REFERENCES "transfer_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
