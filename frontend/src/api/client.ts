import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

const API_BASE_URL = '/api';

const createClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      if (response.data && !response.data.success) {
        return Promise.reject(new Error(response.data.message || response.data.error || '请求失败'));
      }
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      const message = error.response?.data?.message || error.response?.data?.error || error.message || '网络错误';
      return Promise.reject(new Error(message));
    }
  );

  return client;
};

export const apiClient = createClient();

export const api = {
  auth: {
    login: (employeeId: string, password: string) =>
      apiClient.post('/auth/login', { employeeId, password }),
    getProfile: () => apiClient.get('/auth/profile'),
    bindQrCode: () => apiClient.post('/auth/bind-qrcode'),
    changePassword: (data: { oldPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', data),
  },

  employees: {
    getAll: (params?: { department?: string; search?: string }) =>
      apiClient.get('/employees', { params }),
    getDepartments: () => apiClient.get('/employees/departments'),
    getById: (id: string) => apiClient.get(`/employees/${id}`),
    create: (data: any) => apiClient.post('/employees', data),
    update: (id: string, data: any) => apiClient.put(`/employees/${id}`, data),
    delete: (id: string) => apiClient.delete(`/employees/${id}`),
    resetPassword: (id: string) => apiClient.post(`/employees/${id}/reset-password`),
  },

  visitors: {
    getAll: (params?: any) => apiClient.get('/visitors', { params }),
    getToday: () => apiClient.get('/visitors/today'),
    getById: (id: string) => apiClient.get(`/visitors/${id}`),
    create: (data: any) => apiClient.post('/visitors', data),
    confirm: (id: string, data: any) =>
      apiClient.put(`/visitors/${id}/confirm`, data),
    cancel: (id: string) => apiClient.put(`/visitors/${id}/cancel`),
    checkin: (id: string) => apiClient.post(`/visitors/${id}/checkin`),
    checkout: (id: string) => apiClient.post(`/visitors/${id}/checkout`),
    delete: (id: string) => apiClient.delete(`/visitors/${id}`),
  },

  access: {
    getDoors: () => apiClient.get('/access/doors'),
    addDoor: (name: string, location: string) =>
      apiClient.post('/access/doors', { name, location }),
    getRecords: (params?: any) => apiClient.get('/access/records', { params }),
    scan: (qrCode: string, doorId: string, direction: 'in' | 'out') =>
      apiClient.post('/access/scan', { qrCode, doorId, direction }),
    scanPublic: (qrCode: string, doorId: string, direction: 'in' | 'out') =>
      apiClient.post('/access/scan-public', { qrCode, doorId, direction }),
  },

  attendance: {
    getMy: (params?: any) => apiClient.get('/attendance/my', { params }),
    getMyToday: () => apiClient.get('/attendance/my/today'),
    getAll: (params?: any) => apiClient.get('/attendance', { params }),
    getStats: (params?: any) => apiClient.get('/attendance/statistics', { params }),
    getStatistics: (params?: any) => apiClient.get('/attendance/statistics', { params }),
    getMonthlyReport: (params: any) => apiClient.get('/attendance/monthly-report', { params }),
    exportExcel: (params: any) =>
      apiClient.get('/attendance/export-monthly', {
        params,
        responseType: 'blob',
      }),
    exportMonthly: (params: any) =>
      apiClient.get('/attendance/export-monthly', {
        params,
        responseType: 'blob',
      }),
    recalculate: (month: string) =>
      apiClient.post('/attendance/recalculate', { month }),
    getAbnormalToday: () => apiClient.get('/attendance/abnormal/today'),
  },

  config: {
    getHolidays: (year?: string) =>
      apiClient.get('/config/holidays', { params: { year } }),
    createHoliday: (data: any) =>
      apiClient.post('/config/holidays', data),
    addHoliday: (date: string, name: string, type: string) =>
      apiClient.post('/config/holidays', { date, name, type }),
    updateHoliday: (id: string, data: any) =>
      apiClient.put(`/config/holidays/${id}`, data),
    deleteHoliday: (id: string) => apiClient.delete(`/config/holidays/${id}`),
    getWorkRules: () => apiClient.get('/config/work-rules'),
    getMyWorkRule: () => apiClient.get('/config/work-rules/my'),
    createWorkRule: (data: any) => apiClient.post('/config/work-rules', data),
    addWorkRule: (data: any) => apiClient.post('/config/work-rules', data),
    updateWorkRule: (id: string, data: any) =>
      apiClient.put(`/config/work-rules/${id}`, data),
    deleteWorkRule: (id: string) => apiClient.delete(`/config/work-rules/${id}`),
  },

  notifications: {
    getList: (params?: any) => apiClient.get('/notifications', { params }),
    getAll: (params?: any) => apiClient.get('/notifications', { params }),
    markAsRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
    markRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
    markAllRead: () => apiClient.put('/notifications/read-all'),
    delete: (id: string) => apiClient.delete(`/notifications/${id}`),
  },
};
