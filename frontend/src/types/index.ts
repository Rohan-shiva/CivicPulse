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
