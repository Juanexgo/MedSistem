import { PrismaClient, UserRole, EmployeeStatus, ShiftType, PermissionAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MediFlow database...');

  // Clean existing data
  await prisma.$transaction([
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.session.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.routeHistory.deleteMany(),
    prisma.transferStatusHistory.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.securityIncident.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.shiftHandoff.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.oxygenTankHistory.deleteMany(),
    prisma.oxygenTank.deleteMany(),
    prisma.transferRequest.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.hospitalZone.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create permissions
  const permissionData = Object.values(PermissionAction).map((action) => ({ action }));
  await prisma.permission.createMany({ data: permissionData });
  const permissions = await prisma.permission.findMany();
  console.log(`  ✓ ${permissions.length} permissions created`);

  // Create roles
  const adminRole = await prisma.role.create({
    data: { name: 'Administrator', description: 'Full system access', isSystem: true },
  });
  const headNurseRole = await prisma.role.create({
    data: { name: 'Head Nurse', description: 'Nursing supervisor access', isSystem: true },
  });
  const transporterRole = await prisma.role.create({
    data: { name: 'Transporter', description: 'Transport staff access', isSystem: true },
  });
  const auditorRole = await prisma.role.create({
    data: { name: 'Auditor', description: 'Audit and reports access', isSystem: true },
  });
  const doctorRole = await prisma.role.create({
    data: { name: 'Doctor', description: 'Medical staff access', isSystem: true },
  });
  const nursingRole = await prisma.role.create({
    data: { name: 'Nursing', description: 'Floor nursing staff access', isSystem: true },
  });
  const supervisorRole = await prisma.role.create({
    data: { name: 'Supervisor', description: 'Operations supervisor access', isSystem: true },
  });

  // Assign all permissions to admin
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
  });

  // Head nurse permissions
  const headNursePermissions = [
    PermissionAction.CREATE_TRANSFER, PermissionAction.ASSIGN_TRANSFER,
    PermissionAction.REASSIGN_TRANSFER, PermissionAction.CANCEL_TRANSFER,
    PermissionAction.VIEW_PATIENT_DATA, PermissionAction.VIEW_TRANSFERS,
    PermissionAction.EDIT_TRANSFER, PermissionAction.VIEW_DASHBOARD,
    PermissionAction.CREATE_COMMENT, PermissionAction.VIEW_COMMENTS,
    PermissionAction.MANAGE_SHIFTS, PermissionAction.MANAGE_HANDOFF,
    PermissionAction.MANAGE_OXYGEN, PermissionAction.MANAGE_ZONES,
  ];
  await prisma.rolePermission.createMany({
    data: headNursePermissions.map((action) => {
      const perm = permissions.find((p) => p.action === action)!;
      return { roleId: headNurseRole.id, permissionId: perm.id };
    }),
  });

  // Transporter permissions
  const transporterPermissions = [
    PermissionAction.VIEW_TRANSFERS, PermissionAction.VIEW_DASHBOARD,
    PermissionAction.VIEW_COMMENTS, PermissionAction.CREATE_COMMENT,
  ];
  await prisma.rolePermission.createMany({
    data: transporterPermissions.map((action) => {
      const perm = permissions.find((p) => p.action === action)!;
      return { roleId: transporterRole.id, permissionId: perm.id };
    }),
  });

  // Auditor permissions
  const auditorPermissions = [
    PermissionAction.VIEW_AUDIT, PermissionAction.EXPORT_REPORTS,
    PermissionAction.VIEW_SECURITY, PermissionAction.VIEW_SECURITY_INCIDENTS,
    PermissionAction.VIEW_DASHBOARD,
    PermissionAction.VIEW_TRANSFERS, PermissionAction.VIEW_COMMENTS,
  ];
  await prisma.rolePermission.createMany({
    data: auditorPermissions.map((action) => {
      const perm = permissions.find((p) => p.action === action)!;
      return { roleId: auditorRole.id, permissionId: perm.id };
    }),
  });

  // Doctor permissions
  const doctorPermissions = [
    PermissionAction.VIEW_TRANSFERS, PermissionAction.VIEW_PATIENT_DATA,
    PermissionAction.CREATE_TRANSFER, PermissionAction.VIEW_DASHBOARD,
    PermissionAction.CREATE_COMMENT, PermissionAction.VIEW_COMMENTS,
  ];
  await prisma.rolePermission.createMany({
    data: doctorPermissions.map((action) => {
      const perm = permissions.find((p) => p.action === action)!;
      return { roleId: doctorRole.id, permissionId: perm.id };
    }),
  });

  // Nursing permissions (floor nurse — patient care, comments, view transfers)
  const nursingPermissions = [
    PermissionAction.VIEW_TRANSFERS, PermissionAction.CREATE_TRANSFER,
    PermissionAction.VIEW_PATIENT_DATA, PermissionAction.VIEW_DASHBOARD,
    PermissionAction.CREATE_COMMENT, PermissionAction.VIEW_COMMENTS,
  ];
  await prisma.rolePermission.createMany({
    data: nursingPermissions.map((action) => {
      const perm = permissions.find((p) => p.action === action)!;
      return { roleId: nursingRole.id, permissionId: perm.id };
    }),
  });

  // Supervisor permissions (operations oversight — assign, manage, close shifts)
  const supervisorPermissions = [
    PermissionAction.VIEW_TRANSFERS, PermissionAction.ASSIGN_TRANSFER,
    PermissionAction.REASSIGN_TRANSFER, PermissionAction.CANCEL_TRANSFER,
    PermissionAction.EDIT_TRANSFER, PermissionAction.CLOSE_SHIFT,
    PermissionAction.MANAGE_SHIFTS, PermissionAction.MANAGE_HANDOFF,
    PermissionAction.MANAGE_OXYGEN, PermissionAction.MANAGE_ZONES,
    PermissionAction.VIEW_PATIENT_DATA, PermissionAction.VIEW_DASHBOARD,
    PermissionAction.CREATE_COMMENT, PermissionAction.VIEW_COMMENTS,
    PermissionAction.VIEW_SECURITY_INCIDENTS,
  ];
  await prisma.rolePermission.createMany({
    data: supervisorPermissions.map((action) => {
      const perm = permissions.find((p) => p.action === action)!;
      return { roleId: supervisorRole.id, permissionId: perm.id };
    }),
  });

  console.log('  ✓ Roles and permissions created');

  // Create users
  const passwordHash = await bcrypt.hash('MediFlow2024!', 12);

  const users = await Promise.all([
    prisma.user.create({
      data: { email: 'admin@mediflow.com', passwordHash, firstName: 'System', lastName: 'Admin', role: UserRole.ADMIN, roleId: adminRole.id, department: 'IT' },
    }),
    prisma.user.create({
      data: { email: 'headnurse@mediflow.com', passwordHash, firstName: 'Maria', lastName: 'Garcia', role: UserRole.HEAD_NURSE, roleId: headNurseRole.id, department: 'Nursing' },
    }),
    prisma.user.create({
      data: { email: 'transporter@mediflow.com', passwordHash, firstName: 'Carlos', lastName: 'Lopez', role: UserRole.TRANSPORTER, roleId: transporterRole.id, employeeStatus: EmployeeStatus.AVAILABLE, department: 'Transport' },
    }),
    prisma.user.create({
      data: { email: 'transporter2@mediflow.com', passwordHash, firstName: 'Ana', lastName: 'Martinez', role: UserRole.TRANSPORTER, roleId: transporterRole.id, employeeStatus: EmployeeStatus.AVAILABLE, department: 'Transport' },
    }),
    prisma.user.create({
      data: { email: 'auditor@mediflow.com', passwordHash, firstName: 'Roberto', lastName: 'Sanchez', role: UserRole.AUDITOR, roleId: auditorRole.id, department: 'Quality' },
    }),
    prisma.user.create({
      data: { email: 'doctor@mediflow.com', passwordHash, firstName: 'James', lastName: 'Wilson', role: UserRole.DOCTOR, roleId: doctorRole.id, department: 'Emergency' },
    }),
    prisma.user.create({
      data: { email: 'nursing@mediflow.com', passwordHash, firstName: 'Laura', lastName: 'Hernandez', role: UserRole.NURSING, roleId: nursingRole.id, department: 'Nursing' },
    }),
    prisma.user.create({
      data: { email: 'supervisor@mediflow.com', passwordHash, firstName: 'Diego', lastName: 'Ramirez', role: UserRole.SUPERVISOR, roleId: supervisorRole.id, department: 'Operations' },
    }),
  ]);
  console.log(`  ✓ ${users.length} users created`);

  // Create hospital zones
  await prisma.hospitalZone.createMany({
    data: [
      { name: 'Emergency', code: 'ER', color: '#ef4444', order: 1 },
      { name: 'Hospitalization', code: 'HOSP', color: '#3b82f6', order: 2 },
      { name: 'X-Ray', code: 'XR', color: '#f59e0b', order: 3 },
      { name: 'CT Scan', code: 'CT', color: '#8b5cf6', order: 4 },
      { name: 'Laboratory', code: 'LAB', color: '#10b981', order: 5 },
      { name: 'Operating Rooms', code: 'OR', color: '#ec4899', order: 6 },
      { name: 'Elevators', code: 'ELEV', color: '#6366f1', order: 7 },
      { name: 'Outpatient Area', code: 'OUT', color: '#14b8a6', order: 8 },
    ],
  });
  console.log('  ✓ Hospital zones created');

  // Demo content (fake patients, transfers, comments, etc.) is only seeded
  // when SEED_DEMO=true. For a production-clean state run `npm run db:seed:fresh`
  // which sets SEED_DEMO=false (or unset).
  const includeDemo = process.env.SEED_DEMO === 'true';
  if (!includeDemo) {
    console.log('\n✅ Infrastructure seeded (no demo content)');
    console.log('\n📋 Demo Accounts:');
    console.log('   admin@mediflow.com (Admin)');
    console.log('   headnurse@mediflow.com (Head Nurse)');
    console.log('   transporter@mediflow.com (Transporter)');
    console.log('   transporter2@mediflow.com (Transporter)');
    console.log('   auditor@mediflow.com (Auditor)');
    console.log('   doctor@mediflow.com (Doctor)');
    console.log('   nursing@mediflow.com (Nursing)');
    console.log('   supervisor@mediflow.com (Supervisor)');
    console.log('   🔑 Password: MediFlow2024!\n');
    console.log('💡 Run `SEED_DEMO=true npm run db:seed` (or `npm run db:seed:demo`) to include sample patients, transfers, and audit logs for testing.\n');
    return;
  }

  // Create oxygen tanks
  await prisma.oxygenTank.createMany({
    data: [
      { code: 'OXY-001', level: 85, status: 'FULL', psi: 2000, capacity: 2500, location: 'Emergency Station A', isAvailable: true },
      { code: 'OXY-002', level: 45, status: 'MEDIUM', psi: 1200, capacity: 2500, location: 'Hospitalization Floor 3', isAvailable: true },
      { code: 'OXY-003', level: 15, status: 'LOW', psi: 400, capacity: 2500, location: 'ER Station B', isAvailable: true },
      { code: 'OXY-004', level: 92, status: 'FULL', psi: 2200, capacity: 2500, location: 'CT Scan Area', isAvailable: true },
      { code: 'OXY-005', level: 5, status: 'CRITICAL', psi: 100, capacity: 2500, location: 'Operating Room 2', isAvailable: false },
    ],
  });
  console.log('  ✓ Oxygen tanks created');

  // Create sample patients
  const patients = await Promise.all([
    prisma.patient.create({ data: { fullName: 'John Doe', bedNumber: '101-A', floor: '3', medicalRecordNumber: 'MRN-2024-001' } }),
    prisma.patient.create({ data: { fullName: 'Jane Smith', bedNumber: '205-B', floor: '2', medicalRecordNumber: 'MRN-2024-002' } }),
    prisma.patient.create({ data: { fullName: 'Robert Johnson', bedNumber: '310-C', floor: '3', medicalRecordNumber: 'MRN-2024-003' } }),
    prisma.patient.create({ data: { fullName: 'Emily Davis', bedNumber: '115-A', floor: '1', medicalRecordNumber: 'MRN-2024-004' } }),
    prisma.patient.create({ data: { fullName: 'Michael Brown', bedNumber: '450-D', floor: '4', medicalRecordNumber: 'MRN-2024-005' } }),
  ]);
  console.log(`  ✓ ${patients.length} patients created`);

  // Create sample transfers
  const transporter1 = users[2];
  const headNurse = users[1];
  const doctor = users[5];

  await prisma.transferRequest.create({
    data: {
      patientId: patients[0].id, bedNumber: '101-A', floor: '3', origin: 'Hospitalization Floor 3', destination: 'X-Ray',
      priority: 'URGENT', transportType: 'STRETCHER', requestedStudy: 'Chest X-Ray',
      authorizingUserId: doctor.id, assignedTransporterId: transporter1.id,
      status: 'IN_TRANSFER', assignedAt: new Date(), startedAt: new Date(Date.now() - 600000),
      statusHistory: {
        create: [
          { status: 'REQUESTED', changedByUserId: doctor.id, comment: 'Urgent chest X-Ray needed' },
          { status: 'ASSIGNED', changedByUserId: headNurse.id, comment: 'Assigned to Carlos' },
          { status: 'ON_THE_WAY', changedByUserId: transporter1.id, comment: 'En route to patient' },
          { status: 'PATIENT_PICKED_UP', changedByUserId: transporter1.id, comment: 'Patient picked up' },
          { status: 'IN_TRANSFER', changedByUserId: transporter1.id, comment: 'In transit to X-Ray' },
        ],
      },
    },
  });

  await prisma.transferRequest.create({
    data: {
      patientId: patients[1].id, bedNumber: '205-B', floor: '2', origin: 'Hospitalization Floor 2', destination: 'CT Scan',
      priority: 'HIGH', transportType: 'WHEELCHAIR', requestedStudy: 'Abdominal CT',
      requiresOxygen: true, oxygenLiters: 3, requiresDoctorCompanion: true, doctorCompanionName: 'Dr. Wilson',
      authorizingUserId: doctor.id, assignedTransporterId: users[3].id,
      status: 'ASSIGNED', assignedAt: new Date(),
      statusHistory: {
        create: [
          { status: 'REQUESTED', changedByUserId: doctor.id, comment: 'CT with oxygen support' },
          { status: 'ASSIGNED', changedByUserId: headNurse.id, comment: 'Assigned to Ana' },
        ],
      },
    },
  });

  await prisma.transferRequest.create({
    data: {
      patientId: patients[2].id, bedNumber: '310-C', floor: '3', origin: 'Hospitalization Floor 3', destination: 'Laboratory',
      priority: 'NORMAL', transportType: 'WALKING', requestedStudy: 'Blood work',
      authorizingUserId: doctor.id,
      status: 'REQUESTED',
      statusHistory: {
        create: [{ status: 'REQUESTED', changedByUserId: doctor.id, comment: 'Routine blood work' }],
      },
    },
  });

  console.log('  ✓ Sample transfers created');

  // Create a current shift
  await prisma.shift.create({
    data: {
      shiftCode: 'MOR-20260512-A91X', type: ShiftType.MORNING, userId: transporter1.id, isActive: true,
    },
  });

  console.log('  ✓ Seed shift created');

  // Sample comments for communication center
  const transfers = await prisma.transferRequest.findMany({ take: 3 });

  await prisma.comment.createMany({
    data: [
      {
        content: 'Patient not ready for transport - currently in bathroom. Will update when available.',
        type: 'PATIENT_NOT_READY', severity: 'WARNING', status: 'OPEN', isImportant: true,
        userId: transporter1.id, transferRequestId: transfers[0]?.id,
      },
      {
        content: 'CT scan machine is busy. Estimated wait time 20 minutes.',
        type: 'DELAY', severity: 'WARNING', status: 'IN_PROGRESS',
        userId: headNurse.id, transferRequestId: transfers[1]?.id,
      },
      {
        content: 'Elevator bank A is saturated with heavy traffic. Use elevator bank B for all transfers.',
        type: 'ELEVATOR_SATURATED', severity: 'INFO', status: 'OPEN',
        userId: users[0].id,
      },
      {
        content: 'Dr. Garcia is unavailable for companion duty on transfer #102. Rescheduling needed.',
        type: 'DOCTOR_ABSENT', severity: 'CRITICAL', status: 'OPEN', isImportant: true,
        userId: headNurse.id, transferRequestId: transfers[1]?.id,
      },
      {
        content: 'All transfers proceeding normally this morning.',
        type: 'GENERAL', severity: 'INFO', status: 'RESOLVED', resolvedAt: new Date(), resolvedById: users[0].id,
        userId: users[0].id,
      },
    ],
  });
  console.log('  ✓ Sample comments created');

  // Sample notifications
  await prisma.notification.createMany({
    data: [
      { userId: users[0].id, type: 'COMMENT_IMPORTANT', title: 'Important comment', message: 'Patient not ready - John Doe transfer delayed', data: { source: 'seed' }, isRead: false },
      { userId: headNurse.id, type: 'COMMENT_IMPORTANT', title: 'Important comment', message: 'Doctor absent for CT transfer', data: { source: 'seed' }, isRead: true, readAt: new Date() },
      { userId: transporter1.id, type: 'ASSIGNMENT_CREATED', title: 'New Assignment', message: 'Assigned to transfer John Doe to X-Ray', data: { source: 'seed' }, isRead: false },
      { userId: users[0].id, type: 'SYSTEM_ALERT', title: 'System Update', message: 'MediFlow v2.0 scheduled maintenance tonight at 2AM', data: { source: 'seed' }, isRead: false },
      { userId: users[3].id, type: 'TRANSFER_UPDATE', title: 'Transfer Update', message: 'Jane Smith transfer is now IN_TRANSFER', data: { source: 'seed' }, isRead: false },
    ],
  });
  console.log('  ✓ Sample notifications created');

  // Sample audit logs
  await prisma.auditLog.createMany({
    data: [
      { userId: users[0].id, action: 'LOGIN', entity: 'User', entityId: users[0].id, comment: 'User logged in', ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      { userId: headNurse.id, action: 'LOGIN', entity: 'User', entityId: headNurse.id, comment: 'User logged in', ipAddress: '192.168.1.2', userAgent: 'Mozilla/5.0' },
      { userId: users[0].id, action: 'CREATE', entity: 'TransferRequest', entityId: transfers[0]?.id, comment: 'Transfer created for John Doe', ipAddress: '192.168.1.1' },
      { userId: headNurse.id, action: 'ASSIGN', entity: 'Assignment', entityId: transfers[0]?.id, comment: 'Carlos Lopez assigned to transfer', ipAddress: '192.168.1.2' },
    ],
  });
  console.log('  ✓ Sample audit logs created');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('   admin@mediflow.com (Admin)');
  console.log('   headnurse@mediflow.com (Head Nurse)');
  console.log('   transporter@mediflow.com (Transporter)');
  console.log('   transporter2@mediflow.com (Transporter)');
  console.log('   auditor@mediflow.com (Auditor)');
  console.log('   doctor@mediflow.com (Doctor)');
  console.log('   nursing@mediflow.com (Nursing)');
  console.log('   supervisor@mediflow.com (Supervisor)');
  console.log('   🔑 Password: MediFlow2024!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
