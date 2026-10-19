export type UserRole = 'citizen' | 'officer' | 'field_worker' | 'admin';

export interface IUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  preferredLanguage: string;
  departmentId?: string;
  departmentName?: string;
  ward?: string;
}

export type UrgencyLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type IncidentStatus =
  | 'Open'
  | 'Assigned'
  | 'InProgress'
  | 'AwaitingVerification'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export interface ICitizenReportItem {
  id: string;
  complaintId: string;
  description: string;
  nativeTranscript?: string;
  photoUrls: string[];
  location: {
    coordinates: [number, number]; // [longitude, latitude]
    addressText?: string;
    source: 'device' | 'exif' | 'manual';
  };
  department: string;
  urgency: UrgencyLevel;
  incidentStatus: IncidentStatus;
  incidentId?: string;
  createdAt: string;
}

export interface IDepartment {
  _id: string;
  code: string;
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface IIssueCategory {
  _id: string;
  code: string;
  name: string;
  description?: string;
  defaultDepartmentCode: string;
  defaultUrgency: UrgencyLevel;
  slaHours: number;
  iconName?: string;
}

export interface IIncident {
  _id: string;
  incidentId: string;
  title: string;
  standardizedDescription: string;
  complaintType: string;
  department: string;
  canonicalLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  addressText?: string;
  effectivePriority: UrgencyLevel;
  priorityRank: number;
  aiSuggestedUrgency: UrgencyLevel;
  priorityExplanation: string;
  status: IncidentStatus;
  reportCount: number;
  distinctReporterCount: number;
  assignedDepartment: string;
  currentWorkOrderId?: string | IWorkOrder;
  firstReportedAt: string;
  lastReportedAt: string;
  slaDeadline: string;
  duplicateReviewState: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IWorkOrder {
  _id: string;
  workOrderId: string;
  incidentId: string | IIncident;
  assignedDepartment: string;
  assignedTeam?: string;
  assignedWorkerIds: Array<{ _id: string; name: string; phone: string } | string>;
  status: 'Assigned' | 'InProgress' | 'AwaitingVerification' | 'Verified' | 'Rejected';
  assignedAt: string;
  scheduledAt?: string;
  deadline: string;
  actionTaken?: string;
  resolutionNotes?: string;
  resolutionEvidencePhotoUrls: string[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewingOfficerId?: { _id: string; name: string } | string;
  reviewDecision?: 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAuditLog {
  _id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: { _id: string; name: string; role: string };
  actorRole: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  timestamp: string;
}

export interface IDashboardStats {
  totalOpen: number;
  priorityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  slaOverdue: number;
  awaitingVerification: number;
  resolvedToday: number;
  recentActivity: IAuditLog[];
}

export interface IIncidentMapFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    incidentId: string;
    title: string;
    priority: UrgencyLevel;
    status: IncidentStatus;
    address: string;
    reportCount: number;
    slaDeadline: string;
    color: string;
  };
}

export interface IIncidentMapCollection {
  type: 'FeatureCollection';
  features: IIncidentMapFeature[];
}

export interface IFieldWorker {
  _id: string;
  name: string;
  phone: string;
  departmentName?: string;
  ward?: string;
}

export interface IVerificationItem {
  incident: IIncident;
  workOrders: IWorkOrder[];
}

export interface INotification {
  _id: string;
  userId: string;
  complaintId?: string;
  incidentId?: string;
  type: 'STATUS_CHANGE' | 'WORK_ASSIGNED' | 'VERIFICATION_REQUIRED' | 'RESOLVED' | 'SYSTEM';
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}
