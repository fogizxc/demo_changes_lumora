import {
  AuthSession,
  MonthlyInvoice,
  Product,
  Sale,
  Shop,
  ShopAdminOverviewStats,
  SuperAdminDashboardStats,
  User,
  Employee,
  AuditLogEntry,
  ImpersonationLogEntry,
} from './types';

const BASE_URL = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('pos_erp_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('pos_erp_token', token);
  } else {
    localStorage.removeItem('pos_erp_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as any;
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth API
  auth: {
    getShopsList: () => request<{ shops: Shop[] }>('/auth/shops-list'),
    loginAdmin: (email: string, password: string) =>
      request<AuthSession>('/auth/login-admin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    loginEmployee: (shopId: string, employeeId: string, pin: string) =>
      request<AuthSession>('/auth/login-employee', {
        method: 'POST',
        body: JSON.stringify({ shopId, employeeId, pin }),
      }),
    logout: () =>
      request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      }),
    getMe: () => request<AuthSession & { authenticated: boolean }>('/auth/me'),
  },

  // Super Admin API
  superAdmin: {
    getDashboard: () => request<SuperAdminDashboardStats>('/super-admin/dashboard'),
    getShops: () => request<{ shops: (Shop & { thisMonthSales: number; commissionOwed: number; admin_email: string })[] }>('/super-admin/shops'),
    createShop: (payload: {
      name: string;
      gstNumber: string;
      vatNumber?: string;
      phone: string;
      address: string;
      shortNote?: string;
      shopType: string;
      taxState: string;
      adminEmail: string;
      adminPassword: string;
    }) =>
      request<{ success: boolean; shop: Shop; admin: User }>('/super-admin/shops', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateShopStatus: (shopId: string, status: 'ACTIVE' | 'SUSPENDED') =>
      request<{ success: boolean; shopId: string; status: string }>(`/super-admin/shops/${shopId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    impersonateShop: (shopId: string) =>
      request<AuthSession & { impersonationLogId: string }>(`/super-admin/impersonate/${shopId}`, {
        method: 'POST',
      }),
    exitImpersonation: (impersonationLogId?: string) =>
      request<{ success: boolean }>('/super-admin/exit-impersonation', {
        method: 'POST',
        body: JSON.stringify({ impersonationLogId }),
      }),
    getInvoices: (status?: string, shopId?: string) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (shopId) params.set('shopId', shopId);
      return request<{ invoices: MonthlyInvoice[] }>(`/super-admin/invoices?${params.toString()}`);
    },
    markInvoicePaid: (invoiceId: string) =>
      request<{ success: boolean; invoice: MonthlyInvoice }>(`/super-admin/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
      }),
    generateInvoices: (billingPeriod: string, shopId?: string) =>
      request<{ success: boolean; message: string; invoices: MonthlyInvoice[] }>('/super-admin/invoices/generate', {
        method: 'POST',
        body: JSON.stringify({ billingPeriod, shopId }),
      }),
    getTransactions: (params: { page?: number; limit?: number; shopId?: string; employeeId?: string; startDate?: string; endDate?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      if (params.shopId) sp.set('shopId', params.shopId);
      if (params.employeeId) sp.set('employeeId', params.employeeId);
      if (params.startDate) sp.set('startDate', params.startDate);
      if (params.endDate) sp.set('endDate', params.endDate);
      if (params.status) sp.set('status', params.status);
      return request<{
        transactions: Sale[];
        pagination: { page: number; limit: number; totalCount: number; totalPages: number };
      }>(`/super-admin/transactions?${sp.toString()}`);
    },
    getAuditLog: (params: { page?: number; limit?: number; action?: string; shopId?: string }) => {
      const sp = new URLSearchParams();
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      if (params.action) sp.set('action', params.action);
      if (params.shopId) sp.set('shopId', params.shopId);
      return request<{
        logs: AuditLogEntry[];
        pagination: { page: number; limit: number; totalCount: number; totalPages: number };
      }>(`/super-admin/audit-log?${sp.toString()}`);
    },
    getImpersonationLog: () => request<{ logs: ImpersonationLogEntry[] }>('/super-admin/impersonation-log'),
  },

  // Shop Admin API
  shopAdmin: {
    getOverview: () => request<ShopAdminOverviewStats>('/shop-admin/overview'),
    getStaff: () => request<{ staff: (Employee & { total_sales_count: number; total_sales_amount: number })[] }>('/shop-admin/staff'),
    createStaff: (payload: { employeeId: string; name: string; tier: 'CASHIER' | 'SHIFT_LEAD'; pin: string }) =>
      request<{ employee: Employee }>('/shop-admin/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateStaff: (id: string, payload: { name: string; pin?: string }) =>
      request<{ employee: Employee }>(`/shop-admin/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updateStaffTier: (id: string, tier: 'CASHIER' | 'SHIFT_LEAD') =>
      request<{ success: boolean; employeeId: string; tier: string }>(`/shop-admin/staff/${id}/tier`, {
        method: 'PATCH',
        body: JSON.stringify({ tier }),
      }),
    updateStaffStatus: (id: string, status: 'ACTIVE' | 'DEACTIVATED') =>
      request<{ success: boolean; employeeId: string; status: string }>(`/shop-admin/staff/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    getInventory: (params?: { search?: string; category?: string; lowStockOnly?: boolean }) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.category) sp.set('category', params.category);
      if (params?.lowStockOnly) sp.set('lowStockOnly', 'true');
      return request<{ products: Product[]; categories: string[] }>(`/shop-admin/inventory?${sp.toString()}`);
    },
    createProduct: (payload: {
      sku: string;
      name: string;
      category: string;
      price: number;
      costPrice?: number;
      cost_price?: number;
      stock: number;
      lowStockThreshold?: number;
      taxRate?: number;
    }) =>
      request<{ product: Product }>('/shop-admin/inventory', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateProduct: (
      id: string,
      payload: {
        name?: string;
        category?: string;
        price?: number;
        costPrice?: number;
        cost_price?: number;
        stock?: number;
        lowStockThreshold?: number;
        taxRate?: number;
      }
    ) =>
      request<{ product: Product }>(`/shop-admin/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    deleteProduct: (id: string) =>
      request<{ success: boolean; message: string }>(`/shop-admin/inventory/${id}`, {
        method: 'DELETE',
      }),
    getProfile: () => request<{ shop: Shop }>('/shop-admin/profile'),
    updateProfile: (payload: {
      name: string;
      gstNumber: string;
      vatNumber?: string;
      phone: string;
      shortNote?: string;
      address: string;
      shopType: string;
      taxState: string;
    }) =>
      request<{ shop: Shop }>('/shop-admin/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    getBilling: () =>
      request<{
        invoices: MonthlyInvoice[];
        amountDue: number;
        shopStatus: string;
        isPosSuspended: boolean;
        gracePeriodDaysLeft: number | null;
        overdueInvoice: MonthlyInvoice | null;
      }>('/shop-admin/billing'),
    getAuditLog: (page = 1, limit = 25) =>
      request<{
        logs: AuditLogEntry[];
        pagination: { page: number; limit: number; totalCount: number; totalPages: number };
      }>(`/shop-admin/audit-log?page=${page}&limit=${limit}`),
  },

  // POS Terminal API
  pos: {
    getProducts: (params?: { search?: string; category?: string; barcode?: string }) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.category) sp.set('category', params.category);
      if (params?.barcode) sp.set('barcode', params.barcode);
      return request<{ products: Product[]; categories: string[] }>(`/pos/products?${sp.toString()}`);
    },
    getByBarcode: (barcode: string) =>
      request<{ product: Product }>(`/pos/barcode/${encodeURIComponent(barcode)}`),
    calculatePreview: (items: { productId: string; quantity: number; discount?: number }[], discount?: number) =>
      request<{ calculation: any }>('/pos/calculate-preview', {
        method: 'POST',
        body: JSON.stringify({ items, discount }),
      }),
    checkout: (payload: {
      items: { productId: string; quantity: number; discount?: number }[];
      discount?: number;
      idempotencyKey?: string;
      payments?: { method: 'CASH' | 'CARD' | 'UPI'; amount: number; amountReceived?: number; changeDue?: number; referenceNote?: string }[];
    }) =>
      request<{
        success: boolean;
        sale: Sale;
        items: any[];
        payments: any[];
        shop: Shop;
        employee: Employee;
        isExisting?: boolean;
      }>('/pos/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    holdBill: (payload: {
      items: { productId: string; quantity: number; discount?: number }[];
      discount?: number;
      referenceLabel?: string;
      customerName?: string;
    }) =>
      request<{ success: boolean; heldBill: any }>('/pos/hold', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getHeldBills: () => request<{ heldBills: any[] }>('/pos/held-bills'),
    cancelHeldBill: (id: string) =>
      request<{ success: boolean; message: string }>(`/pos/held-bills/${id}`, {
        method: 'DELETE',
      }),
    resumeHeldBill: (id: string) =>
      request<{ success: boolean; heldBill: any; cartData: { items: any[]; discount: number } }>(
        `/pos/held-bills/${id}/resume`,
        {
          method: 'POST',
        }
      ),
    voidSale: (saleId: string, reason: string) =>
      request<{ success: boolean; sale: Sale; message: string }>(`/pos/sales/${saleId}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    refundSale: (
      saleId: string,
      payload: {
        items: { saleItemId: string; quantity: number }[];
        reason: string;
        refundMethod?: 'CASH' | 'CARD' | 'UPI';
      }
    ) =>
      request<{
        success: boolean;
        refund: any;
        refundItems: any[];
        message: string;
      }>(`/pos/sales/${saleId}/refund`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getReceipt: (saleId: string) =>
      request<{
        sale: Sale;
        items: any[];
        payments: any[];
        refunds: any[];
        shop: Shop;
        employee: Employee;
      }>(`/pos/sales/${saleId}/receipt`),
    getRecentSales: (params?: { search?: string; date?: string; status?: string; limit?: number }) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.date) sp.set('date', params.date);
      if (params?.status) sp.set('status', params.status);
      if (params?.limit) sp.set('limit', String(params.limit));
      return request<{ sales: Sale[] }>(`/pos/sales?${sp.toString()}`);
    },
    getSessionSummary: () => request<{ summary: any }>('/pos/session/summary'),
  },

  // System Test Runner API
  tests: {
    runTests: () =>
      request<{
        totalTests: number;
        passedCount: number;
        failedCount: number;
        allPassed: boolean;
        results: { id: string; category: string; name: string; passed: boolean; message: string }[];
      }>('/system-tests/run'),
  },

  // Multi-Tenant & Business Switching API
  tenants: {
    getBusinesses: () => request<{ businesses: any[] }>('/tenants/businesses'),
    getCurrentBusiness: () => request<{ business: any; branches: any[] }>('/tenants/current'),
    switchBusiness: (businessId: string) =>
      request<{ success: boolean; business: any; branches: any[] }>('/tenants/switch', {
        method: 'POST',
        body: JSON.stringify({ businessId }),
      }),
    onboardBusiness: (payload: any) =>
      request<{ success: boolean; business: any; branches: any[] }>('/tenants/onboard', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getBranches: () => request<{ branches: any[] }>('/tenants/branches'),
    createBranch: (payload: { name: string; code: string; address?: string; phone?: string }) =>
      request<{ success: boolean; branch: any }>('/tenants/branches', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getRolesPermissions: () => request<{ roles: any[]; professions: any[] }>('/tenants/roles-permissions'),
  },

  // Healthcare Engine API
  healthcare: {
    getOverview: () => request<{ stats: any; upcomingAppointments: any[] }>('/healthcare/overview'),
    getPatients: (q?: string) => request<{ patients: any[] }>(`/healthcare/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    createPatient: (payload: any) =>
      request<{ success: boolean; patient: any }>('/healthcare/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getDoctors: () => request<{ doctors: any[] }>('/healthcare/doctors'),
    createDoctor: (payload: any) =>
      request<{ success: boolean; doctor: any }>('/healthcare/doctors', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getAppointments: (date?: string) =>
      request<{ appointments: any[] }>(`/healthcare/appointments${date ? `?date=${encodeURIComponent(date)}` : ''}`),
    bookAppointment: (payload: any) =>
      request<{ success: boolean; appointment: any }>('/healthcare/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateAppointmentStatus: (id: string, payload: { status?: string; paymentStatus?: string }) =>
      request<{ success: boolean; id: string; status?: string }>(`/healthcare/appointments/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getConsultations: (patientId?: string) =>
      request<{ consultations: any[] }>(`/healthcare/consultations${patientId ? `?patientId=${patientId}` : ''}`),
    recordConsultation: (payload: any) =>
      request<{ success: boolean; consultation: any }>('/healthcare/consultations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Gym & Fitness Engine API
  gym: {
    getOverview: () => request<{ stats: any; recentAttendance: any[] }>('/gym/overview'),
    getMembers: (q?: string) => request<{ members: any[] }>(`/gym/members${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    createMember: (payload: any) =>
      request<{ success: boolean; member: any }>('/gym/members', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getPlans: () => request<{ plans: any[] }>('/gym/plans'),
    createPlan: (payload: any) =>
      request<{ success: boolean; plan: any }>('/gym/plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    freezeMembership: (payload: { membershipId: string; freezeDays: number }) =>
      request<{ success: boolean; message: string; frozen_until: string; new_end_date: string }>('/gym/memberships/freeze', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    renewMembership: (payload: { memberId: string; planId: string }) =>
      request<{ success: boolean; membership: any }>('/gym/memberships/renew', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    checkInMember: (payload: { memberId: string; workoutType?: string; notes?: string }) =>
      request<{ success: boolean; checkin: any }>('/gym/attendance/checkin', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Restaurant & KOT Engine API
  restaurant: {
    getTables: () => request<{ tables: any[] }>('/restaurant/tables'),
    createTable: (payload: { tableNumber: string; capacity?: number; floorSection?: string }) =>
      request<{ success: boolean; table: any }>('/restaurant/tables', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateTableStatus: (id: string, status: string) =>
      request<{ success: boolean; id: string; status: string }>(`/restaurant/tables/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    getOrders: (status?: string) =>
      request<{ orders: any[] }>(`/restaurant/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    createOrder: (payload: any) =>
      request<{ success: boolean; order: any }>('/restaurant/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateOrderStatus: (id: string, status: string) =>
      request<{ success: boolean; id: string; status: string }>(`/restaurant/orders/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    payOrder: (id: string, paymentMethod?: string) =>
      request<{ success: boolean; message: string }>(`/restaurant/orders/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      }),
  },

  // Repair Lab Engine API
  repair: {
    getJobs: (params?: { status?: string; q?: string }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.set('status', params.status);
      if (params?.q) sp.set('q', params.q);
      return request<{ jobs: any[] }>(`/repair/jobs?${sp.toString()}`);
    },
    createJob: (payload: any) =>
      request<{ success: boolean; job: any }>('/repair/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateJobStatus: (id: string, payload: { status: string; diagnosis?: string; partsCost?: number; laborCost?: number }) =>
      request<{ success: boolean; id: string; status: string }>(`/repair/jobs/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Equipment & Vehicle Rental Engine API
  rental: {
    getAssets: () => request<{ assets: any[] }>('/rental/assets'),
    createAsset: (payload: any) =>
      request<{ success: boolean; asset: any }>('/rental/assets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getBookings: () => request<{ bookings: any[] }>('/rental/bookings'),
    bookAsset: (payload: any) =>
      request<{ success: boolean; booking: any }>('/rental/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    returnAsset: (id: string, payload?: { returnedDate?: string; conditionNotes?: string; lateFee?: number }) =>
      request<{ success: boolean; message: string; late_fee: number; deposit_to_refund: number }>(`/rental/bookings/${id}/return`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
  },

  // Services Catalog API
  services: {
    getServices: () => request<{ services: any[] }>('/services'),
    createService: (payload: any) =>
      request<{ success: boolean; service: any }>('/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Universal Appointments & Double Booking Guard API
  appointments: {
    getAppointments: (params?: { date?: string; resourceId?: string }) => {
      const sp = new URLSearchParams();
      if (params?.date) sp.set('date', params.date);
      if (params?.resourceId) sp.set('resourceId', params.resourceId);
      return request<{ appointments: any[] }>(`/appointments?${sp.toString()}`);
    },
    bookAppointment: (payload: any) =>
      request<{ success: boolean; appointment: any }>('/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Expenses Tracking API
  expenses: {
    getExpenses: (category?: string) =>
      request<{ expenses: any[]; totalAmount: number }>(`/expenses${category ? `?category=${encodeURIComponent(category)}` : ''}`),
    createExpense: (payload: any) =>
      request<{ success: boolean; expense: any }>('/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // 4-Database Polyglot Architecture API
  databases: {
    getOverview: () => request<any>('/databases/overview'),
    getSamples: () => request<any>('/databases/samples'),
    executeQuery: (payload: { targetDatabase: string; queryText: string }) =>
      request<any>('/databases/query', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    simulateTransaction: (payload?: any) =>
      request<any>('/databases/simulate-transaction', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
  },
};
