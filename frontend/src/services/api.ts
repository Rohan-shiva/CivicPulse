import axios from 'axios';
import { IUser, ICitizenReportItem, IDepartment, IIssueCategory } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authentication APIs
export const authApi = {
  sendOtp: async (phone: string, purpose: 'citizen_login' | 'staff_login' = 'citizen_login') => {
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
    purpose?: 'citizen_login' | 'staff_login';
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

export default api;
