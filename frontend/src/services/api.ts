import axios from 'axios';
import {
  IUser,
  ICitizenReportItem,
  IDepartment,
  IIssueCategory,
  IIncident,
  IDashboardStats,
  IIncidentMapCollection,
  IFieldWorker,
  IVerificationItem,
  IWorkOrder,
  INotification,
  UrgencyLevel,
  IncidentStatus,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authentication APIs
export const authApi = {
  sendOtp: async (
    phone: string,
    purpose: 'citizen_login' | 'staff_login' | 'staff_register' = 'citizen_login'
  ) => {
    const res = await api.post<{ success: boolean; message: string; cooldownSeconds: number }>(
      '/auth/send-otp',
      { phone, purpose }
    );
    return res.data;
  },

  verifyOtp: async (data: {
    phone: string;
    otp: string;
    name?: string;
    email?: string;
    purpose?: 'citizen_login' | 'staff_login' | 'staff_register';
    role?: 'officer' | 'field_worker';
    departmentName?: string;
    ward?: string;
  }) => {
    const res = await api.post<{ success: boolean; user: IUser; token: string }>(
      '/auth/verify-otp',
      data
    );
    return res.data;
  },

  getMe: async () => {
    const res = await api.get<{ success: boolean; user: IUser }>('/auth/me');
    return res.data.user;
  },

  logout: async () => {
    const res = await api.post<{ success: boolean; message: string }>('/auth/logout');
    return res.data;
  },
};

// Citizen Report APIs
export const reportApi = {
  submitReport: async (formData: FormData) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      complaintId: string;
      incidentId: string;
      isDuplicate: boolean;
      discrepancyWarning?: string | null;
      report: any;
    }>('/reports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  getMyReports: async () => {
    const res = await api.get<{ success: boolean; count: number; reports: ICitizenReportItem[] }>(
      '/reports/my'
    );
    return res.data.reports;
  },

  getReport: async (complaintId: string) => {
    const res = await api.get<{ success: boolean; report: any }>(`/reports/${complaintId}`);
    return res.data.report;
  },

  downloadPdfUrl: (complaintId: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    return `${baseUrl}/reports/${complaintId}/pdf`;
  },
};

// Speech & Voice APIs
export const voiceApi = {
  processVoice: async (audioBlob: Blob, languageCode = 'unknown') => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('languageCode', languageCode);

    const res = await api.post<{
      success: boolean;
      data: {
        nativeTranscript: string;
        englishTranslation: string;
        detectedLanguage: string;
      };
    }>('/voice/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  translateText: async (text: string, sourceLanguageCode = 'auto') => {
    const res = await api.post<{
      success: boolean;
      data: { translatedText: string; sourceLanguageCode: string };
    }>('/voice/translate-text', { text, sourceLanguageCode });
    return res.data.data;
  },
};

// Central Taxonomy APIs
export const taxonomyApi = {
  getDepartments: async () => {
    const res = await api.get<{ success: boolean; count: number; departments: IDepartment[] }>(
      '/departments'
    );
    return res.data.departments;
  },

  getCategories: async () => {
    const res = await api.get<{ success: boolean; count: number; categories: IIssueCategory[] }>(
      '/issue-categories'
    );
    return res.data.categories;
  },
};

// Municipal Operations APIs
export const municipalApi = {
  getDashboard: async () => {
    const res = await api.get<{ success: boolean } & IDashboardStats>('/municipal/dashboard');
    return res.data;
  },

  getIncidentMap: async () => {
    const res = await api.get<{ success: boolean; geojson: IIncidentMapCollection }>(
      '/municipal/incidents/map'
    );
    return res.data.geojson;
  },

  getIncidents: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: UrgencyLevel;
    department?: string;
    isOverdue?: boolean;
    search?: string;
    duplicateReview?: boolean;
    isDuplicate?: boolean;
  }) => {
    const res = await api.get<{
      success: boolean;
      incidents: IIncident[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>('/municipal/incidents', { params });
    return res.data;
  },

  getIncidentById: async (incidentId: string) => {
    const res = await api.get<{
      success: boolean;
      incident: IIncident;
      linkedReports: any[];
      workOrders: IWorkOrder[];
      auditLogs: any[];
    }>(`/municipal/incidents/${incidentId}`);
    return res.data;
  },

  updateStatus: async (incidentId: string, status: IncidentStatus, reason?: string) => {
    const res = await api.patch<{ success: boolean; message: string; incident: IIncident }>(
      `/municipal/incidents/${incidentId}/status`,
      { status, reason }
    );
    return res.data;
  },

  assignWorkers: async (incidentId: string, workerIds: string[], scheduledAt?: string) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      workOrder: IWorkOrder;
    }>(`/municipal/incidents/${incidentId}/assign`, { workerIds, scheduledAt });
    return res.data;
  },

  reviewDuplicate: async (
    incidentId: string,
    decision: 'confirm_merge' | 'dismiss',
    targetIncidentId?: string,
    notes?: string
  ) => {
    const res = await api.post<{
      success: boolean;
      incident: IIncident;
      targetIncident?: IIncident;
      message: string;
    }>(`/municipal/incidents/${incidentId}/duplicate-review`, {
      decision,
      targetIncidentId,
      notes,
    });
    return res.data;
  },

  getFieldWorkers: async (department?: string) => {
    const res = await api.get<{ success: boolean; count: number; workers: IFieldWorker[] }>(
      '/municipal/field-workers',
      { params: { department } }
    );
    return res.data.workers;
  },

  getVerificationQueue: async () => {
    const res = await api.get<{ success: boolean; count: number; queue: IVerificationItem[] }>(
      '/municipal/verifications'
    );
    return res.data.queue;
  },

  verifyResolution: async (workOrderId: string) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      workOrder: IWorkOrder;
    }>(`/municipal/work-orders/${workOrderId}/verify`);
    return res.data;
  },

  rejectResolution: async (workOrderId: string, reason: string) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      workOrder: IWorkOrder;
    }>(`/municipal/work-orders/${workOrderId}/reject`, { reason });
    return res.data;
  },
};

// Field Worker APIs
export const workerApi = {
  getWorkOrders: async (status?: string) => {
    const res = await api.get<{ success: boolean; count: number; workOrders: IWorkOrder[] }>(
      '/worker/work-orders',
      { params: { status } }
    );
    return res.data.workOrders;
  },

  getWorkOrderById: async (workOrderId: string) => {
    const res = await api.get<{
      success: boolean;
      workOrder: IWorkOrder;
      linkedReports: any[];
    }>(`/worker/work-orders/${workOrderId}`);
    return res.data;
  },

  startWork: async (workOrderId: string) => {
    const res = await api.patch<{
      success: boolean;
      message: string;
      workOrder: IWorkOrder;
    }>(`/worker/work-orders/${workOrderId}/start`);
    return res.data;
  },

  submitResolution: async (workOrderId: string, formData: FormData) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      workOrder: IWorkOrder;
    }>(`/worker/work-orders/${workOrderId}/submit-resolution`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};

// Notification APIs
export const notificationApi = {
  getNotifications: async () => {
    const res = await api.get<{
      success: boolean;
      count: number;
      notifications: INotification[];
    }>('/notifications');
    return res.data.notifications;
  },

  markAsRead: async (notificationId: string) => {
    const res = await api.patch<{ success: boolean }>(`/notifications/${notificationId}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.patch<{ success: boolean; message: string }>('/notifications/read-all');
    return res.data;
  },
};

export default api;
