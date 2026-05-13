export enum UserRole {
  ADMIN = 'ADMIN',
  HEAD_NURSE = 'HEAD_NURSE',
  NURSING = 'NURSING',
  TRANSPORTER = 'TRANSPORTER',
  SUPERVISOR = 'SUPERVISOR',
  AUDITOR = 'AUDITOR',
  DOCTOR = 'DOCTOR',
}

export enum EmployeeStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  IN_TRANSFER = 'IN_TRANSFER',
  BREAK = 'BREAK',
  OFF_SHIFT = 'OFF_SHIFT',
}

export enum TransferPriority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  SCHEDULED = 'SCHEDULED',
}

export enum TransportType {
  STRETCHER = 'STRETCHER',
  WHEELCHAIR = 'WHEELCHAIR',
  WALKING = 'WALKING',
}

export enum TransferStatus {
  REQUESTED = 'REQUESTED',
  ASSIGNED = 'ASSIGNED',
  ON_THE_WAY = 'ON_THE_WAY',
  PATIENT_PICKED_UP = 'PATIENT_PICKED_UP',
  IN_TRANSFER = 'IN_TRANSFER',
  ARRIVED = 'ARRIVED',
  IN_STUDY = 'IN_STUDY',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OxygenTankStatus {
  FULL = 'FULL',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  CRITICAL = 'CRITICAL',
}

export enum ShiftType {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeStatus: EmployeeStatus;
  isActive: boolean;
  department?: string;
  phone?: string;
  permissions: string[];
}

export interface Patient {
  id: string;
  fullName: string;
  bedNumber: string;
  floor: string;
  medicalRecordNumber?: string;
  notes?: string;
}

export interface TransferRequest {
  id: string;
  trackingToken: string;
  patient: Patient;
  bedNumber: string;
  floor: string;
  origin: string;
  destination: string;
  priority: TransferPriority;
  transportType: TransportType;
  status: TransferStatus;
  requestedStudy?: string;
  notes?: string;
  requiresOxygen: boolean;
  requiresDoctorCompanion: boolean;
  doctorCompanionName?: string;
  authorizingUser: { id: string; firstName: string; lastName: string };
  assignedTransporter?: { id: string; firstName: string; lastName: string };
  assignedTank?: { id: string; code: string; level: number; status: OxygenTankStatus };
  requestedAt: string;
  elapsedMinutes?: number;
}

export interface Shift {
  id: string;
  shiftCode: string;
  type: ShiftType;
  userId: string;
  user?: { id: string; firstName: string; lastName: string; role: string };
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  handoff?: ShiftHandoff;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftHandoff {
  id: string;
  shiftId: string;
  shift?: Shift;
  completedServices?: string;
  pendingServices?: string;
  patientsInTransfer?: string;
  incompleteStudies?: string;
  incidents?: string;
  lowOxygenTanks?: string;
  observations?: string;
  handedOffById: string;
  handedOffBy?: { id: string; firstName: string; lastName: string };
  receivedById: string;
  receivedBy?: { id: string; firstName: string; lastName: string };
  handoffAt: string;
}

export interface DashboardMetrics {
  totalToday: number;
  urgentToday: number;
  activeTransports: number;
  completedToday: number;
  cancelledToday: number;
  delayedTransports: number;
  slaCompliance: number;
  averageResponseTime: number;
  averageCompletionTime: number;
  activeEmployees: number;
  availableTransporters: number;
  busyTransporters: number;
  lowTanks: number;
  criticalTanks: number;
  pendingShifts: number;
  pendingHandoffs: number;
  incidentsToday: number;
  importantComments: number;
  unassignedUrgent: number;
  currentShiftType?: string;
}

export interface TransporterAvailability {
  available: number;
  busy: number;
  inTransfer: number;
  onBreak: number;
  offShift: number;
  total: number;
}

export interface ZoneSaturation {
  zone: string;
  activeCount: number;
  color?: string;
}

export interface OxygenSummary {
  full: number;
  medium: number;
  low: number;
  critical: number;
  total: number;
  lowTanks: Array<{ id: string; code: string; level: number; status: string; location: string }>;
}

export interface DashboardTransferRow {
  id: string;
  trackingToken: string;
  patientName: string;
  bedNumber: string;
  floor: string;
  origin: string;
  destination: string;
  priority: string;
  status: string;
  transportType: string;
  assignedTransporterName?: string;
  elapsedMinutes?: number;
  requestedAt: string;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  transporterAvailability: TransporterAvailability;
  zoneSaturation: ZoneSaturation[];
  oxygenSummary: OxygenSummary;
  activeTransfers: DashboardTransferRow[];
  unassignedUrgentTransfers: DashboardTransferRow[];
  recentActivity: TimelineEvent[];
  priorityBreakdown: Array<{ priority: string; count: number }>;
  hourlyBreakdown: Array<{ hour: number; count: number }>;
  pendingHandoffList?: any[];
  currentShiftInfo?: any[];
}

export interface DashboardFilters {
  timeRange?: 'today' | 'shift' | '7days' | '30days';
  zone?: string;
  priority?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export enum NotificationType {
  URGENT_UNASSIGNED = 'URGENT_UNASSIGNED',
  PATIENT_WAITING = 'PATIENT_WAITING',
  CRITICAL_OXYGEN = 'CRITICAL_OXYGEN',
  DELAYED_SERVICE = 'DELAYED_SERVICE',
  PENDING_HANDOFF = 'PENDING_HANDOFF',
  COMMENT_IMPORTANT = 'COMMENT_IMPORTANT',
  TRANSFER_UPDATE = 'TRANSFER_UPDATE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  ASSIGNMENT_CREATED = 'ASSIGNMENT_CREATED',
  TRANSPORTER_STATUS = 'TRANSPORTER_STATUS',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
}

export enum SocketEvent {
  SHIFT_STARTED = 'shift.started',
  SHIFT_ENDED = 'shift.ended',
  SHIFT_HANDOFF_CREATED = 'shift.handoff_created',
  SHIFT_HANDOFF_PENDING = 'shift.handoff_pending',
  TRANSFER_CREATED = 'transfer.created',
  TRANSFER_UPDATED = 'transfer.updated',
  TRANSFER_CANCELLED = 'transfer.cancelled',
  TRANSFER_STATUS_CHANGED = 'transfer.status_changed',
  ASSIGNMENT_CREATED = 'assignment.created',
  ASSIGNMENT_REASSIGNED = 'assignment.reassigned',
  ASSIGNMENT_UNASSIGNED = 'assignment.unassigned',
  TRANSPORTER_STATUS_CHANGED = 'transporter.status_changed',
  TRANSPORTER_AVAILABLE = 'transporter.available',
  TRANSPORTER_BUSY = 'transporter.busy',
  DASHBOARD_METRICS_UPDATED = 'dashboard.metrics_updated',
  DASHBOARD_ALERT_CREATED = 'dashboard.alert_created',
  COMMENT_CREATED = 'comment.created',
  COMMENT_IMPORTANT = 'comment.important',
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_READ = 'notification.read',
  SECURITY_INCIDENT_CREATED = 'security.incident_created',
  SOCKET_CONNECTED = 'socket.connected',
  SOCKET_DISCONNECTED = 'socket.disconnected',
  SOCKET_ERROR = 'socket.error',
  DASHBOARD_UPDATED = 'dashboard.updated',
  OXYGEN_TANK_LOW = 'oxygen.tank_low',
  OXYGEN_TANK_CRITICAL = 'oxygen.tank_critical',
  OPERATIONS_LOG_UPDATED = 'operations_log.updated',
}

export interface SocketPayload<T = any> {
  event: SocketEvent;
  data: T;
  timestamp: string;
  userId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface AuthTokens {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TimelineEvent {
  type: 'created' | 'status_change' | 'assignment' | 'comment' | 'oxygen';
  title: string;
  description: string;
  timestamp: string;
  actor: { id: string; firstName: string; lastName: string; role?: string };
  metadata?: Record<string, any>;
}

export enum CommentType {
  PATIENT_NOT_READY = 'PATIENT_NOT_READY',
  MISSING_OXYGEN_TANK = 'MISSING_OXYGEN_TANK',
  DOCTOR_ABSENT = 'DOCTOR_ABSENT',
  ELEVATOR_SATURATED = 'ELEVATOR_SATURATED',
  DELAY = 'DELAY',
  GENERAL = 'GENERAL',
  INCIDENT = 'INCIDENT',
}

export enum CommentSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum CommentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentType {
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  SUSPICIOUS_TOKEN_REUSE = 'SUSPICIOUS_TOKEN_REUSE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  FAILED_LOGIN = 'FAILED_LOGIN',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_ACCESS_ANOMALY = 'DATA_ACCESS_ANOMALY',
  OTHER = 'OTHER',
}

export interface Comment {
  id: string;
  content: string;
  isImportant: boolean;
  type: CommentType;
  severity: CommentSeverity;
  status: CommentStatus;
  userId: string;
  user?: { id: string; firstName: string; lastName: string; role: string };
  transferRequestId?: string;
  transferRequest?: { id: string; trackingToken: string; patient?: { fullName: string } };
  resolvedAt?: string;
  resolvedById?: string;
  escalatedAt?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityIncident {
  id: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string; email: string; role: string };
  type: string;
  severity: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  resolvedAt?: string;
  resolvedById?: string;
  resolution?: string;
  createdAt: string;
}

export interface OperationsLogEntry {
  id: string;
  type: 'status_change' | 'assignment' | 'comment' | 'oxygen' | 'shift' | 'handoff' | 'security';
  entityType: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: { id: string; firstName: string; lastName: string; role: string };
  severity: string;
  entityId?: string;
  trackingToken?: string;
  metadata?: Record<string, any>;
}

export const ADDITIONAL_SOCKET_EVENTS = {
  COMMENT_CREATED: 'comment.created',
  COMMENT_IMPORTANT: 'comment.important',
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  SECURITY_INCIDENT_CREATED: 'security.incident_created',
  OXYGEN_TANK_LOW: 'oxygen.tank_low',
  OXYGEN_TANK_CRITICAL: 'oxygen.tank_critical',
  TRANSFER_STATUS_CHANGED: 'transfer.status_changed',
  ASSIGNMENT_CREATED: 'assignment.created',
  DASHBOARD_UPDATED: 'dashboard.updated',
} as const;
