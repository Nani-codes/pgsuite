import { Platform } from 'react-native';
import type {
  ApiResponse,
  Property,
  Room,
  Tenant,
  Invoice,
  Payment,
  Receipt,
  Complaint,
  AppNotification,
  DashboardData,
  AgingBucket,
  ReconciliationReport,
  LateFeePolicy,
  Booking,
  Lead,
  DuesPackage,
  ShowcaseProperty,
  UserRole,
  CreatePropertyPayload,
} from '../types';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.1.6:3000');

const BASE_URL = `${API_URL}/v1`;

console.log('[API DEBUG] API_URL =', API_URL, '| BASE_URL =', BASE_URL);

const REQUEST_TIMEOUT = 15_000;

interface ApiOptions {
  method?: string;
  body?: unknown;
  userId?: string;
  userRole?: UserRole;
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
          user?: { id: string; name: string; role: UserRole };
        };
      }>('/auth/verify-otp', { method: 'POST', body: { phone, otp } }),
    register: (phone: string, name: string, email?: string) =>
      request<{
        success: boolean;
        data: {
          accessToken: string;
          user: { id: string; name: string; role: UserRole };
        };
      }>('/auth/register', { method: 'POST', body: { phone, name, email } }),
    completeOnboarding: (data: { phone: string; name: string; email?: string; intent: 'owner' | 'explorer' }) =>
      request<{
        success: boolean;
        data: {
          accessToken: string;
          user: { id: string; name: string; role: UserRole };
        };
      }>('/auth/complete-onboarding', { method: 'POST', body: data }),
    me: () =>
      request<ApiResponse<{ id: string; name: string; phone: string; email?: string; role: string }>>('/auth/me'),
  },

  properties: {
    list: (userId: string) =>
      request<ApiResponse<Property[]>>('/properties', { userId, userRole: 'owner' }),
    get: (id: string, userId: string) =>
      request<ApiResponse<Property>>(`/properties/${id}`, { userId, userRole: 'owner' }),
    create: (userId: string, data: CreatePropertyPayload) =>
      request<ApiResponse<Property>>('/properties', { method: 'POST', body: data, userId, userRole: 'owner' }),
    getVacancy: (id: string, userId: string) =>
      request<ApiResponse<{ total: number; occupied: number; vacant: number }>>(`/properties/${id}/vacancy`, { userId, userRole: 'owner' }),
    getRooms: (id: string, userId: string) =>
      request<ApiResponse<Room[]>>(`/properties/${id}/rooms`, { userId, userRole: 'owner' }),
    createRoom: (propertyId: string, userId: string, data: { roomNumber: string; roomType: string; rentAmount: number }) =>
      request<ApiResponse<Room>>(`/properties/${propertyId}/rooms`, { method: 'POST', body: data, userId, userRole: 'owner' }),
    listPublic: (params?: {
      q?: string;
      city?: string;
      state?: string;
      pincode?: string;
      availableFor?: 'boys' | 'girls' | 'any';
      hasImages?: boolean;
      hasAbout?: boolean;
      lat?: number;
      lng?: number;
      radiusKm?: number;
      sort?: 'updated' | 'distance';
      limit?: number;
      offset?: number;
    }) => {
      const search = new URLSearchParams();
      if (params?.q) search.append('q', params.q);
      if (params?.city) search.append('city', params.city);
      if (params?.state) search.append('state', params.state);
      if (params?.pincode) search.append('pincode', params.pincode);
      if (params?.availableFor) search.append('availableFor', params.availableFor);
      if (typeof params?.hasImages === 'boolean') search.append('hasImages', String(params.hasImages));
      if (typeof params?.hasAbout === 'boolean') search.append('hasAbout', String(params.hasAbout));
      if (typeof params?.lat === 'number') search.append('lat', String(params.lat));
      if (typeof params?.lng === 'number') search.append('lng', String(params.lng));
      if (typeof params?.radiusKm === 'number') search.append('radiusKm', String(params.radiusKm));
      if (params?.sort) search.append('sort', params.sort);
      if (typeof params?.limit === 'number') search.append('limit', String(params.limit));
      if (typeof params?.offset === 'number') search.append('offset', String(params.offset));
      const qs = search.toString();
      return request<ApiResponse<{ items: ShowcaseProperty[]; total: number; limit: number; offset: number }>>(
        `/properties/public${qs ? `?${qs}` : ''}`,
      );
    },
    getPublic: (id: string) =>
      request<ApiResponse<ShowcaseProperty>>(`/properties/public/${id}`),
  },

  tenants: {
    list: (userId: string, status?: string) =>
      request<ApiResponse<Tenant[]>>(`/tenants${status ? `?status=${status}` : ''}`, { userId, userRole: 'owner' }),
    get: (id: string, userId: string) =>
      request<ApiResponse<Tenant>>(`/tenants/${id}`, { userId, userRole: 'owner' }),
    getProfile: (userId: string) =>
      request<ApiResponse<Tenant>>(`/tenants/me`, { userId, userRole: 'tenant' }),
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Tenant>>('/tenants', { method: 'POST', body: data, userId, userRole: 'owner' }),
    update: (id: string, userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Tenant>>(`/tenants/${id}`, { method: 'PUT', body: data, userId, userRole: 'owner' }),
    checkout: (id: string, userId: string) =>
      request<ApiResponse<Tenant>>(`/tenants/${id}/checkout`, { method: 'POST', userId, userRole: 'owner' }),
  },

  billing: {
    listInvoices: (userId: string, role: 'owner' | 'tenant' = 'owner') =>
      request<ApiResponse<Invoice[]>>('/billing/invoices', { userId, userRole: role }),
    getInvoice: (id: string, userId: string, role: 'owner' | 'tenant' = 'owner') =>
      request<ApiResponse<Invoice>>(`/billing/invoices/${id}`, { userId, userRole: role }),
    getTenantInvoices: (tenantId: string, userId: string) =>
      request<ApiResponse<Invoice[]>>(`/billing/invoices/tenant/${tenantId}`, { userId, userRole: 'owner' }),
    getTenants: (userId: string) =>
      request<ApiResponse<Tenant[]>>('/billing/tenants', { userId, userRole: 'owner' }),
    createPayment: (userId: string, data: { invoiceId: string; amount: number; method: string; referenceNo?: string; collectedBy?: string }) =>
      request<ApiResponse<Payment>>('/billing/payments', { method: 'POST', body: data, userId, userRole: 'owner' }),
    createTenantPayment: (userId: string, data: { invoiceId: string; amount: number; method: string }) =>
      request<ApiResponse<Payment>>('/billing/payments/tenant', { method: 'POST', body: data, userId, userRole: 'tenant' }),
    // Razorpay flow
    createOrder: (data: { invoiceId: string }) =>
      request<ApiResponse<{ orderId: string; amount: number; amountInPaise: number; currency: string; keyId: string; invoiceNumber: string }>>(
        '/billing/payments/tenant/create-order', { method: 'POST', body: data },
      ),
    verifyPayment: (data: { invoiceId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
      request<ApiResponse<Payment>>('/billing/payments/tenant/verify', { method: 'POST', body: data }),
    createInvoice: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Invoice>>('/billing/invoices', { method: 'POST', body: data, userId, userRole: 'owner' }),
    getReceipt: (receiptId: string, userId: string) =>
      request<ApiResponse<Receipt>>(`/billing/receipts/${receiptId}`, { userId }),
    getPaymentReceipt: (paymentId: string, userId: string) =>
      request<ApiResponse<Receipt>>(`/billing/payments/${paymentId}/receipt`, { userId }),
    // PDF receipt URL helper
    getReceiptPdfUrl: (receiptId: string) => `${BASE_URL}/billing/receipts/${receiptId}/pdf`,
    getPaymentReceiptPdfUrl: (paymentId: string) => `${BASE_URL}/billing/payments/${paymentId}/receipt/pdf`,
    getAgingReport: (userId: string) =>
      request<ApiResponse<AgingBucket[]>>('/billing/reports/aging', { userId, userRole: 'owner' }),
    getReconciliationReport: (userId: string, startDate: string, endDate: string) =>
      request<ApiResponse<ReconciliationReport>>(`/billing/reports/reconciliation?startDate=${startDate}&endDate=${endDate}`, { userId, userRole: 'owner' }),
    sendReminder: (userId: string, data: { tenantId: string; invoiceId?: string }) =>
      request<ApiResponse<AppNotification>>('/billing/reminders', { method: 'POST', body: data, userId, userRole: 'owner' }),
    setLateFeePolicy: (userId: string, data: { leaseId: string; graceDays: number; feeType: string; feeAmount: number; maxFee?: number }) =>
      request<ApiResponse<LateFeePolicy>>('/billing/late-fee-policies', { method: 'POST', body: data, userId, userRole: 'owner' }),
  },

  complaints: {
    list: (userId: string, role: 'owner' | 'tenant') =>
      request<ApiResponse<Complaint[]>>('/complaints', { userId, userRole: role }),
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Complaint>>('/complaints', { method: 'POST', body: data, userId, userRole: 'tenant' }),
    updateStatus: (id: string, userId: string, status: string) =>
      request<ApiResponse<Complaint>>(`/complaints/${id}/status`, { method: 'PATCH', body: { status }, userId, userRole: 'owner' }),
  },

  notifications: {
    list: (userId: string) =>
      request<ApiResponse<AppNotification[]>>('/notifications', { userId, userRole: 'tenant' }),
    create: (userId: string, data: { tenantId: string; type: string; message: string }) =>
      request<ApiResponse<AppNotification>>('/notifications', { method: 'POST', body: data, userId, userRole: 'owner' }),
    registerToken: (token: string) =>
      request<{ success: boolean; message: string }>('/notifications/register-token', { method: 'POST', body: { token } }),
  },

  analytics: {
    dashboard: (userId: string) =>
      request<ApiResponse<DashboardData>>('/analytics/dashboard', { userId, userRole: 'owner' }),
    property: (propertyId: string, userId: string) =>
      request<ApiResponse<unknown>>(`/analytics/property/${propertyId}`, { userId, userRole: 'owner' }),
  },

  expenses: {
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<unknown>>('/expenses', { method: 'POST', body: data, userId, userRole: 'owner' }),
    list: (userId: string) =>
      request<ApiResponse<unknown[]>>('/expenses', { userId, userRole: 'owner' }),
  },

  owner: {
    getProfile: (userId: string) =>
      request<ApiResponse<{ id: string; name: string; phone: string; email?: string; plan: string; _count: { properties: number; tenants: number } }>>('/owners/me', { userId, userRole: 'owner' }),
    updateProfile: (userId: string, data: { name?: string; email?: string }) =>
      request<ApiResponse<unknown>>('/owners/me', { method: 'PUT', body: data, userId, userRole: 'owner' }),
  },

  notices: {
    list: (userId: string) =>
      request<ApiResponse<unknown[]>>('/notices', { userId, userRole: 'owner' }),
    create: (userId: string, data: { title: string; body: string; propertyId?: string }) =>
      request<ApiResponse<unknown>>('/notices', { method: 'POST', body: data, userId, userRole: 'owner' }),
    delete: (id: string, userId: string) =>
      request<ApiResponse<unknown>>(`/notices/${id}`, { method: 'DELETE', userId, userRole: 'owner' }),
  },

  // ─── New Phase 1 Endpoints ──────────────────────────────────────────

  bookings: {
    list: (userId: string, status?: string) =>
      request<ApiResponse<Booking[]>>(`/bookings${status ? `?status=${status}` : ''}`, { userId, userRole: 'owner' }),
    get: (id: string, userId: string) =>
      request<ApiResponse<Booking>>(`/bookings/${id}`, { userId, userRole: 'owner' }),
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Booking>>('/bookings', { method: 'POST', body: data, userId, userRole: 'owner' }),
    update: (id: string, userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Booking>>(`/bookings/${id}`, { method: 'PATCH', body: data, userId, userRole: 'owner' }),
    convert: (id: string, userId: string, billingDay: number) =>
      request<ApiResponse<{ tenant: Tenant; lease: unknown }>>(`/bookings/${id}/convert`, { method: 'POST', body: { billingDay }, userId, userRole: 'owner' }),
    cancel: (id: string, userId: string) =>
      request<ApiResponse<unknown>>(`/bookings/${id}`, { method: 'DELETE', userId, userRole: 'owner' }),
  },

  leads: {
    list: (userId: string, status?: string) =>
      request<ApiResponse<Lead[]>>(`/leads${status ? `?status=${status}` : ''}`, { userId, userRole: 'owner' }),
    get: (id: string, userId: string) =>
      request<ApiResponse<Lead>>(`/leads/${id}`, { userId, userRole: 'owner' }),
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Lead>>('/leads', { method: 'POST', body: data, userId, userRole: 'owner' }),
    update: (id: string, userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Lead>>(`/leads/${id}`, { method: 'PATCH', body: data, userId, userRole: 'owner' }),
    convert: (id: string, userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<Booking>>(`/leads/${id}/convert`, { method: 'POST', body: data, userId, userRole: 'owner' }),
    archive: (id: string, userId: string) =>
      request<ApiResponse<unknown>>(`/leads/${id}`, { method: 'DELETE', userId, userRole: 'owner' }),
  },

  duesPackages: {
    list: (userId: string) =>
      request<ApiResponse<DuesPackage[]>>('/dues-packages', { userId, userRole: 'owner' }),
    get: (id: string, userId: string) =>
      request<ApiResponse<DuesPackage>>(`/dues-packages/${id}`, { userId, userRole: 'owner' }),
    create: (userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<DuesPackage>>('/dues-packages', { method: 'POST', body: data, userId, userRole: 'owner' }),
    update: (id: string, userId: string, data: Record<string, unknown>) =>
      request<ApiResponse<DuesPackage>>(`/dues-packages/${id}`, { method: 'PATCH', body: data, userId, userRole: 'owner' }),
    assign: (id: string, userId: string, leaseId: string) =>
      request<ApiResponse<unknown>>(`/dues-packages/${id}/assign`, { method: 'POST', body: { leaseId }, userId, userRole: 'owner' }),
    deactivate: (id: string, userId: string) =>
      request<ApiResponse<unknown>>(`/dues-packages/${id}`, { method: 'DELETE', userId, userRole: 'owner' }),
  },
};
