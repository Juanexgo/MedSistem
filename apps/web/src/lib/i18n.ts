/**
 * Diccionario central de traducciones (español).
 * Estados, roles y enums del backend → etiquetas mostradas al usuario.
 */

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  HEAD_NURSE: 'Jefa de Enfermería',
  NURSING: 'Enfermería',
  TRANSPORTER: 'Camillero',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
  DOCTOR: 'Médico',
};

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  BUSY: 'Ocupado',
  IN_TRANSFER: 'En traslado',
  BREAK: 'En descanso',
  OFF_SHIFT: 'Fuera de turno',
};

export const TRANSFER_PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  NORMAL: 'Normal',
  SCHEDULED: 'Programada',
};

export const TRANSPORT_TYPE_LABELS: Record<string, string> = {
  STRETCHER: 'Camilla',
  WHEELCHAIR: 'Silla de ruedas',
  WALKING: 'Caminando',
};

export const TRANSFER_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Solicitado',
  ASSIGNED: 'Asignado',
  ON_THE_WAY: 'En camino',
  PATIENT_PICKED_UP: 'Paciente recogido',
  IN_TRANSFER: 'En traslado',
  ARRIVED: 'Llegó',
  IN_STUDY: 'En estudio',
  RETURN_REQUESTED: 'Regreso solicitado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export const OXYGEN_STATUS_LABELS: Record<string, string> = {
  FULL: 'Lleno',
  MEDIUM: 'Medio',
  LOW: 'Bajo',
  CRITICAL: 'Crítico',
};

export const SHIFT_TYPE_LABELS: Record<string, string> = {
  MORNING: 'Matutino',
  EVENING: 'Vespertino',
  NIGHT: 'Nocturno',
};

export const COMMENT_TYPE_LABELS: Record<string, string> = {
  PATIENT_NOT_READY: 'Paciente no listo',
  MISSING_OXYGEN_TANK: 'Falta tanque de oxígeno',
  DOCTOR_ABSENT: 'Médico ausente',
  ELEVATOR_SATURATED: 'Elevador saturado',
  DELAY: 'Retraso',
  GENERAL: 'General',
  INCIDENT: 'Incidente',
};

export const COMMENT_SEVERITY_LABELS: Record<string, string> = {
  INFO: 'Informativa',
  WARNING: 'Advertencia',
  CRITICAL: 'Crítica',
};

export const COMMENT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

export const INCIDENT_SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  URGENT_UNASSIGNED: 'Urgente sin asignar',
  PATIENT_WAITING: 'Paciente en espera',
  CRITICAL_OXYGEN: 'Oxígeno crítico',
  DELAYED_SERVICE: 'Servicio retrasado',
  PENDING_HANDOFF: 'Entrega pendiente',
  COMMENT_IMPORTANT: 'Comentario importante',
  TRANSFER_UPDATE: 'Actualización de traslado',
  ASSIGNMENT_CREATED: 'Asignación creada',
  COMMENT_CREATED: 'Nuevo comentario',
  SECURITY_INCIDENT: 'Incidente de seguridad',
  OPERATIONS_LOG: 'Bitácora de operaciones',
  SYSTEM_ALERT: 'Alerta del sistema',
};

export const ZONE_LABELS: Record<string, string> = {
  Emergency: 'Urgencias',
  Hospitalization: 'Hospitalización',
  'X-Ray': 'Rayos X',
  'CT Scan': 'Tomografía',
  Laboratory: 'Laboratorio',
  'Operating Rooms': 'Quirófanos',
  Elevators: 'Elevadores',
  'Outpatient Area': 'Consulta Externa',
};

export const PERMISSION_LABELS: Record<string, string> = {
  CREATE_TRANSFER: 'Crear traslado',
  ASSIGN_TRANSFER: 'Asignar traslado',
  REASSIGN_TRANSFER: 'Reasignar traslado',
  CANCEL_TRANSFER: 'Cancelar traslado',
  EDIT_TRANSFER: 'Editar traslado',
  CLOSE_SHIFT: 'Cerrar turno',
  VIEW_AUDIT: 'Ver auditoría',
  EXPORT_REPORTS: 'Exportar reportes',
  MANAGE_OXYGEN: 'Gestionar oxígeno',
  VIEW_PATIENT_DATA: 'Ver datos de pacientes',
  MANAGE_USERS: 'Gestionar usuarios',
  MANAGE_ROLES: 'Gestionar roles',
  VIEW_TRANSFERS: 'Ver traslados',
  MANAGE_ZONES: 'Gestionar zonas',
  VIEW_DASHBOARD: 'Ver dashboard',
  MANAGE_SHIFTS: 'Gestionar turnos',
  VIEW_COMMENTS: 'Ver comentarios',
  CREATE_COMMENT: 'Crear comentario',
  MANAGE_HANDOFF: 'Gestionar entregas',
  VIEW_SECURITY: 'Ver seguridad',
  VIEW_SECURITY_INCIDENTS: 'Ver incidentes de seguridad',
  MANAGE_SECURITY_INCIDENTS: 'Gestionar incidentes de seguridad',
  RESTORE_USER: 'Restaurar usuario',
  MANAGE_SETTINGS: 'Gestionar configuración',
};

/** Helpers para traducir con fallback al original si no está en el diccionario. */
export const t = {
  role: (k?: string | null) => (k ? ROLE_LABELS[k] ?? k : ''),
  employeeStatus: (k?: string | null) => (k ? EMPLOYEE_STATUS_LABELS[k] ?? k : ''),
  priority: (k?: string | null) => (k ? TRANSFER_PRIORITY_LABELS[k] ?? k : ''),
  transportType: (k?: string | null) => (k ? TRANSPORT_TYPE_LABELS[k] ?? k : ''),
  transferStatus: (k?: string | null) => (k ? TRANSFER_STATUS_LABELS[k] ?? k : ''),
  oxygenStatus: (k?: string | null) => (k ? OXYGEN_STATUS_LABELS[k] ?? k : ''),
  shiftType: (k?: string | null) => (k ? SHIFT_TYPE_LABELS[k] ?? k : ''),
  commentType: (k?: string | null) => (k ? COMMENT_TYPE_LABELS[k] ?? k : ''),
  commentSeverity: (k?: string | null) => (k ? COMMENT_SEVERITY_LABELS[k] ?? k : ''),
  commentStatus: (k?: string | null) => (k ? COMMENT_STATUS_LABELS[k] ?? k : ''),
  incidentSeverity: (k?: string | null) => (k ? INCIDENT_SEVERITY_LABELS[k] ?? k : ''),
  notificationType: (k?: string | null) => (k ? NOTIFICATION_TYPE_LABELS[k] ?? k : ''),
  zone: (k?: string | null) => (k ? ZONE_LABELS[k] ?? k : ''),
  permission: (k?: string | null) => (k ? PERMISSION_LABELS[k] ?? k : ''),
};

export const ROLE_OPTIONS = Object.keys(ROLE_LABELS);
export const EMPLOYEE_STATUS_OPTIONS = Object.keys(EMPLOYEE_STATUS_LABELS);
