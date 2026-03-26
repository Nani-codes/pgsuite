import { Platform } from 'react-native';
import type {
  ApiResponse,
  Property,
  Room,
  Tenant,
  Invoice,
  Payment,
  Complaint,
  AppNotification,
  DashboardData,
} from '../types';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.1.3:3000');

const BASE_URL = `${API_URL}/v1`;

const REQUEST_TIMEOUT = 15_000;

interface ApiOptions {
  method?: string;
  body?: unknown;
  userId?: string;
  userRole?: 'owner' | 'tenant';
}

let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new ApiError(
        json.error?.message || json.message || 'Request failed',
        res.status,
      );
    }

    return json;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection.', 0);
    }
    throw new ApiError(
      (err as Error).message || 'Network error. Please try again.',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
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
          isNewUser?: boolean;
          phone?: string;
          accessToken?: string;
          user?: { id: string; name: string; role: 'owner' | 'tenant' };
        };
      }>('/auth/verify-otp', { method: 'POST', body: { phone, otp } }),
    register: (phone: string, name: string, email?: string) =>
      request<{
        success: boolean;
        data: {
          accessToken: string;
          user: { id: string; name: string; role: 'owner' };
        };
      }>('/auth/register', { method: 'POST', body: { phone, name, email } }),
    me: () =>
      request<ApiResponse<{ id: string; name: string; phone: string; email?: string; role: string }>>('/auth/me'),
  },

  properties: {
    list: (userId: string) =>
      request<ApiResponse<Property[]>>('/properties', {
        userId,
        userRole: 'owner',
      }),
    get: (id: string, userId: string) =>
      request<ApiResponse<Property>>(`/properties/${id}`, {
        userId,
        userRole: 'owner',
      }),
    create: (
      userId: string,
      data: Pick<Property, 'name' | 'address' | 'city' | 'amenities'>,
    ) =>
      request<ApiResponse<Property>>('/properties', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
    getVacancy: (id: string, userId: string) =>
      request<
        ApiResponse<{ total: number; occupied: number; vacant: number }>
      >(`/properties/${id}/vacancy`, {
        userId,
        userRole: 'owner',
      }),
    getRooms: (id: string, userId: string) =>
      request<ApiResponse<Room[]>>(`/properties/${id}/rooms`, {
        userId,
        userRole: 'owner',
      }),
    createRoom: (
      propertyId: string,
      userId: string,
      data: { roomNumber: string; roomType: string; rentAmount: number },
    ) =>
      request<ApiResponse<Room>>(`/properties/${propertyId}/rooms`, {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
  },

  tenants: {
    list: (userId: string) =>
      request<ApiResponse<Tenant[]>>('/tenants', {
        userId,
        userRole: 'owner',
      }),
    get: (id: string, userId: string) =>
      request<ApiResponse<Tenant>>(`/tenants/${id}`, {
        userId,
        userRole: 'owner',
      }),
    getProfile: (userId: string) =>
      request<ApiResponse<Tenant>>(`/tenants/me`, {
        userId,
        userRole: 'tenant',
      }),
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Tenant>>('/tenants', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
    update: (id: string, userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Tenant>>(`/tenants/${id}`, {
        method: 'PUT',
        body: data,
        userId,
        userRole: 'owner',
      }),
    checkout: (id: string, userId: string) =>
      request<ApiResponse<Tenant>>(`/tenants/${id}/checkout`, {
        method: 'POST',
        userId,
        userRole: 'owner',
      }),
  },

  billing: {
    listInvoices: (userId: string, role: 'owner' | 'tenant' = 'owner') =>
      request<ApiResponse<Invoice[]>>('/billing/invoices', {
        userId,
        userRole: role,
      }),
    getTenantInvoices: (tenantId: string, userId: string) =>
      request<ApiResponse<Invoice[]>>(
        `/billing/invoices/tenant/${tenantId}`,
        { userId, userRole: 'owner' },
      ),
    getTenants: (userId: string) =>
      request<ApiResponse<Tenant[]>>('/billing/tenants', {
        userId,
        userRole: 'owner',
      }),
    createPayment: (
      userId: string,
      data: { invoiceId: string; amount: number; method: string },
    ) =>
      request<ApiResponse<Payment>>('/billing/payments', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
    createInvoice: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Invoice>>('/billing/invoices', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
  },

  complaints: {
    list: (userId: string, role: 'owner' | 'tenant') =>
      request<ApiResponse<Complaint[]>>('/complaints', {
        userId,
        userRole: role,
      }),
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Complaint>>('/complaints', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'tenant',
      }),
    updateStatus: (id: string, userId: string, status: string) =>
      request<ApiResponse<Complaint>>(`/complaints/${id}/status`, {
        method: 'PATCH',
        body: { status },
        userId,
        userRole: 'owner',
      }),
  },

  notifications: {
    list: (userId: string) =>
      request<ApiResponse<AppNotification[]>>('/notifications', {
        userId,
        userRole: 'tenant',
      }),
    create: (userId: string, data: { tenantId: string; type: string; message: string }) =>
      request<ApiResponse<AppNotification>>('/notifications', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
  },

  analytics: {
    dashboard: (userId: string) =>
      request<ApiResponse<DashboardData>>('/analytics/dashboard', {
        userId,
        userRole: 'owner',
      }),
  },

  expenses: {
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<unknown>>('/expenses', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
    list: (userId: string) =>
      request<ApiResponse<unknown[]>>('/expenses', {
        userId,
        userRole: 'owner',
      }),
  },

  owner: {
    getProfile: (userId: string) =>
      request<ApiResponse<{ id: string; name: string; phone: string; email?: string; plan: string; _count: { properties: number; tenants: number } }>>('/owners/me', {
        userId,
        userRole: 'owner',
      }),
    updateProfile: (userId: string, data: { name?: string; email?: string }) =>
      request<ApiResponse<unknown>>('/owners/me', {
        method: 'PUT',
        body: data,
        userId,
        userRole: 'owner',
      }),
  },

  notices: {
    list: (userId: string) =>
      request<ApiResponse<unknown[]>>('/notices', {
        userId,
        userRole: 'owner',
      }),
    create: (userId: string, data: { title: string; body: string; propertyId?: string }) =>
      request<ApiResponse<unknown>>('/notices', {
        method: 'POST',
        body: data,
        userId,
        userRole: 'owner',
      }),
    delete: (id: string, userId: string) =>
      request<ApiResponse<unknown>>(`/notices/${id}`, {
        method: 'DELETE',
        userId,
        userRole: 'owner',
      }),
  },
};
