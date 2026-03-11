import { Platform } from 'react-native';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.1.5:3000');

const BASE_URL = `${API_URL}/v1`;

interface ApiOptions {
  method?: string;
  body?: unknown;
  userId?: string;
  userRole?: 'owner' | 'tenant';
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, userId, userRole } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (userId) headers['x-user-id'] = userId;
  if (userRole) headers['x-user-role'] = userRole;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Request failed');
  return json;
}

export const api = {
  auth: {
    sendOtp: (phone: string) =>
      request<{ success: boolean; message: string }>('/auth/send-otp', {
        method: 'POST',
        body: { phone },
      }),
    verifyOtp: (phone: string, otp: string) =>
      request<{
        success: boolean;
        data: {
          accessToken: string;
          user: { id: string; name: string; role: 'owner' | 'tenant' };
        };
      }>('/auth/verify-otp', { method: 'POST', body: { phone, otp } }),
  },

  properties: {
    list: (userId: string) =>
      request<{ success: boolean; data: any[] }>('/properties', {
        userId,
        userRole: 'owner',
      }),
    get: (id: string, userId: string) =>
      request<{ success: boolean; data: any }>(`/properties/${id}`, {
        userId,
        userRole: 'owner',
      }),
    create: (userId: string, data: any) =>
      request<{ success: boolean; data: any }>('/properties', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
    getVacancy: (id: string, userId: string) =>
      request<{ success: boolean; data: any }>(`/properties/${id}/vacancy`, {
        userId,
        userRole: 'owner',
      }),
    getRooms: (id: string, userId: string) =>
      request<{ success: boolean; data: any[] }>(`/properties/${id}/rooms`, {
        userId,
        userRole: 'owner',
      }),
    createRoom: (propertyId: string, userId: string, data: any) =>
      request<{ success: boolean; data: any }>(
        `/properties/${propertyId}/rooms`,
        { method: 'POST', body: data, userId, userRole: 'owner' },
      ),
  },

  tenants: {
    list: (userId: string) =>
      request<{ success: boolean; data: any[] }>('/tenants', {
        userId,
        userRole: 'owner',
      }),
    get: (id: string, userId: string) =>
      request<{ success: boolean; data: any }>(`/tenants/${id}`, {
        userId,
        userRole: 'owner',
      }),
    create: (userId: string, data: any) =>
      request<{ success: boolean; data: any }>('/tenants', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
  },

  billing: {
    listInvoices: (userId: string) =>
      request<{ success: boolean; data: any[] }>('/billing/invoices', {
        userId,
        userRole: 'owner',
      }),
  },

  complaints: {
    list: (userId: string, role: 'owner' | 'tenant') =>
      request<{ success: boolean; data: any[] }>('/complaints', {
        userId,
        userRole: role,
      }),
    create: (userId: string, data: any) =>
      request<{ success: boolean; data: any }>('/complaints', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'tenant',
      }),
  },

  notifications: {
    list: (userId: string) =>
      request<{ success: boolean; data: any[] }>('/notifications', {
        userId,
        userRole: 'tenant',
      }),
  },

  analytics: {
    dashboard: (userId: string) =>
      request<{ success: boolean; data: any }>('/analytics/dashboard', {
        userId,
        userRole: 'owner',
      }),
  },
};
