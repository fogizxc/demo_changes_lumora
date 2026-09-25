export type UserRole = 'SUPER_ADMIN' | 'SHOP_ADMIN';
export type EmployeeTier = 'CASHIER' | 'SHIFT_LEAD';
export type AnyRole = UserRole | EmployeeTier;

export type ShopStatus = 'ACTIVE' | 'OVERDUE' | 'SUSPENDED';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type SaleStatus = 'COMPLETED' | 'VOIDED';
export type SessionStatus = 'ACTIVE' | 'CLOSED';
export type EmployeeStatus = 'ACTIVE' | 'DEACTIVATED';

export type TaxScenario = 'INTRA_STATE' | 'INTER_STATE'; // INTRA = CGST+SGST, INTER = IGST

export interface User {
  id: string;
  email: string;
  role: UserRole;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  name: string;
  gst_number: string;
  vat_number?: string | null;
  phone: string;
  address: string;
  short_note?: string | null;
  shop_type: string;
  tax_state: TaxScenario;
  status: ShopStatus;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  shop_id: string;
  employee_id: string;
  name: string;
  tier: EmployeeTier;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface PosSession {
  id: string;
  employee_id: string;
  shop_id: string;
  employee_name?: string;
  employee_tier?: EmployeeTier;
  login_at: string;
  logout_at?: string | null;
  status: SessionStatus;
}

export interface Product {
  id: string;
  shop_id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  brand?: string | null;
  price: number;
  cost_price?: number;
  costPrice?: number;
  stock: number;
  low_stock_threshold: number;
  tax_rate: number;
  unit?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  line_total: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';

export interface Payment {
  id: string;
  sale_id: string;
  shop_id: string;
  method: PaymentMethod;
  amount: number;
  amount_received?: number | null;
  change_due?: number | null;
  reference_note?: string | null;
  status: string;
  created_at: string;
}

export interface HeldBill {
  id: string;
  shop_id: string;
  employee_id: string;
  session_id: string;
  reference_label: string;
  customer_name?: string | null;
  cart_data: string; // JSON
  items_count: number;
  subtotal: number;
  total_estimate: number;
  status: 'HELD' | 'RESUMED' | 'CANCELLED';
  employee_name?: string;
  created_at: string;
  updated_at: string;
}

export interface RefundItem {
  id: string;
  refund_id: string;
  sale_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax: number;
  refund_total: number;
}

export interface Refund {
  id: string;
  sale_id: string;
  shop_id: string;
  employee_id: string;
  session_id: string;
  refund_invoice_number: string;
  subtotal: number;
  tax_amount: number;
  total_refund_amount: number;
  reason: string;
  payment_method: PaymentMethod;
  created_at: string;
  employee_name?: string;
  items?: RefundItem[];
}

export interface PosSessionSummary {
  session: PosSession;
  operator: {
    name: string;
    employee_id: string;
    tier: EmployeeTier | string;
  };
  durationFormatted: string;
  totalSalesCount: number;
  grossSalesAmount: number;
  totalDiscountsGiven: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  paymentsBreakdown: {
    cashTotal: number;
    cardTotal: number;
    upiTotal: number;
  };
  voids: {
    count: number;
    totalAmount: number;
  };
  refunds: {
    count: number;
    totalAmount: number;
  };
  netTillBalance: number; // Cash received minus Cash refunded
}

export interface Sale {
  id: string;
  shop_id: string;
  employee_id: string;
  session_id: string;
  invoice_number: string;
  idempotency_key?: string | null;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  status: SaleStatus;
  void_reason?: string | null;
  voided_by?: string | null;
  voided_at?: string | null;
  created_at: string;
  employee_name?: string;
  shop_name?: string;
  items?: SaleItem[];
  payments?: Payment[];
  refunds?: Refund[];
}

export interface MonthlyInvoice {
  id: string;
  shop_id: string;
  shop_name?: string;
  billing_period: string; // e.g. "2026-08"
  gross_sales: number;
  commission_rate: number; // 0.02
  commission_due: number;
  commission_amount?: number;
  status: InvoiceStatus;
  sent_at: string;
  grace_period_ends_at: string;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  actor_name?: string;
  shop_id?: string | null;
  shop_name?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  before?: string | null;
  after?: string | null;
  timestamp: string;
}

export interface ImpersonationLogEntry {
  id: string;
  super_admin_id: string;
  super_admin_email?: string;
  target_shop_admin_id: string;
  shop_id: string;
  shop_name?: string;
  start_time: string;
  started_at?: string;
  end_time?: string | null;
  ended_at?: string | null;
  actions?: string | null;
  reason?: string | null;
}

export interface SuperAdminDashboardStats {
  totalGrossSales: number;
  totalCommissionThisMonth: number;
  activeShopsCount: number;
  overdueShopsCount: number;
  suspendedShopsCount: number;
  commissionRevenueTrend: { period: string; grossSales: number; commission: number }[];
  overdueShopsList: {
    shopId: string;
    shopName: string;
    amountDue: number;
    gracePeriodEndsAt: string;
    daysOverdue: number;
  }[];
}

export interface ShopAdminOverviewStats {
  todaySales: number;
  monthSales: number;
  todayTransactionsCount: number;
  monthTransactionsCount: number;
  amountDue: number;
  topSellingItems: {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  salesTrend: { date: string; amount: number; count: number }[];
  salesByEmployee: {
    employeeId: string;
    name: string;
    tier: string;
    salesCount: number;
    totalAmount: number;
  }[];
  shopStatus: ShopStatus;
  overdueInvoice?: MonthlyInvoice | null;
  gracePeriodDaysLeft?: number | null;
}

export interface AuthSession {
  token: string;
  role: AnyRole;
  user?: User;
  employee?: Employee;
  shop?: Shop;
  session?: PosSession;
  isImpersonating?: boolean;
  superAdminId?: string;
}

// =============================================================================
// MULTI-TENANT & MODULAR INDUSTRY ENGINES TYPES
// =============================================================================

export type BusinessIndustry =
  | 'RETAIL'
  | 'HEALTHCARE'
  | 'GYM'
  | 'RESTAURANT'
  | 'REPAIR'
  | 'RENTAL'
  | 'SALON'
  | 'EDUCATION'
  | 'CUSTOM';

export interface Business {
  id: string;
  name: string;
  slug: string;
  industry: BusinessIndustry;
  business_type: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  country?: string;
  state?: string;
  city?: string;
  timezone?: string;
  currency?: string;
  tax_configuration?: Record<string, any>;
  enabled_modules: string[];
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  timezone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  branch_id?: string | null;
  name: string;
  description?: string | null;
  category: string;
  duration_minutes: number;
  price: number;
  tax_rate: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  branch_id?: string | null;
  customer_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  service_id?: string | null;
  service_name: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
  fee: number;
  notes?: string | null;
  created_at: string;
}

export interface HealthcarePatient {
  id: string;
  business_id: string;
  patient_number: string;
  name: string;
  date_of_birth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  blood_group?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  medical_history?: string | null;
  allergies?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface HealthcareDoctor {
  id: string;
  business_id: string;
  name: string;
  specialization: string;
  department: string;
  qualification?: string;
  license_number?: string;
  consultation_fee: number;
  phone?: string | null;
  email?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  available_days?: string;
  created_at: string;
}

export interface HealthcareConsultation {
  id: string;
  business_id: string;
  appointment_id?: string | null;
  patient_id: string;
  patient_name?: string;
  patient_number?: string;
  doctor_id: string;
  doctor_name?: string;
  specialization?: string;
  visit_date: string;
  symptoms?: string | null;
  diagnosis: string;
  vital_signs: {
    bp?: string;
    hr?: string;
    spo2?: string;
    temp?: string;
    weight?: string;
  };
  prescriptions: {
    medicine: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  lab_tests: string[];
  doctor_notes?: string | null;
  follow_up_date?: string | null;
  fee: number;
  payment_status: 'PENDING' | 'PAID';
  created_at: string;
}

export interface GymMember {
  id: string;
  business_id: string;
  member_number: string;
  name: string;
  phone: string;
  email?: string | null;
  emergency_contact?: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN';
  join_date: string;
  trainer_name?: string | null;
  fitness_goal?: string | null;
  membership_id?: string;
  plan_name?: string;
  start_date?: string;
  end_date?: string;
  membership_status?: string;
  freeze_status?: string;
  frozen_until?: string | null;
  created_at: string;
}

export interface GymPlan {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  duration_months: number;
  price: number;
  benefits?: string | null;
  usage_limit?: number;
  freeze_limit_days: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface GymMembership {
  id: string;
  business_id: string;
  member_id: string;
  plan_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN';
  freeze_status: 'NORMAL' | 'FROZEN';
  frozen_until?: string | null;
  price_paid: number;
}

export interface GymAttendance {
  id: string;
  business_id: string;
  member_id: string;
  member_name: string;
  check_in_time: string;
  workout_type: string;
  notes?: string | null;
}

export interface RestaurantTable {
  id: string;
  business_id: string;
  table_number: string;
  capacity: number;
  floor_section: string;
  status: 'VACANT' | 'OCCUPIED' | 'BILLING' | 'RESERVED';
  current_order_id?: string | null;
  order_number?: string | null;
  order_status?: string | null;
  order_total?: number | null;
  items?: { name: string; qty: number; price: number }[];
}

export interface RestaurantOrder {
  id: string;
  business_id: string;
  table_id?: string | null;
  table_number?: string | null;
  order_number: string;
  order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  items: { name: string; qty: number; price: number }[];
  status: 'RECEIVED' | 'KITCHEN' | 'READY' | 'SERVED' | 'BILLED' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  tax: number;
  total: number;
  payment_status: 'PENDING' | 'PAID';
  waiter_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface RepairJob {
  id: string;
  business_id: string;
  job_number: string;
  customer_name: string;
  customer_phone: string;
  device_type: string;
  brand: string;
  model: string;
  serial_number?: string | null;
  reported_fault: string;
  diagnosis?: string | null;
  technician_name?: string | null;
  status: 'RECEIVED' | 'DIAGNOSING' | 'WAITING_APPROVAL' | 'IN_REPAIR' | 'READY' | 'DELIVERED' | 'CANCELLED';
  estimated_cost: number;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  payment_status: 'PENDING' | 'PARTIAL_PAID' | 'PAID';
  delivery_date?: string | null;
  created_at: string;
}

export interface RentalAsset {
  id: string;
  business_id: string;
  name: string;
  category: string;
  serial_number?: string | null;
  daily_rate: number;
  deposit_amount: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
  condition_notes?: string | null;
}

export interface RentalBooking {
  id: string;
  business_id: string;
  asset_id: string;
  asset_name: string;
  customer_name: string;
  customer_phone?: string | null;
  start_date: string;
  end_date: string;
  daily_rate: number;
  deposit_paid: number;
  total_rent: number;
  late_fee: number;
  status: 'ACTIVE' | 'BOOKED' | 'RETURNED' | 'OVERDUE';
  returned_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  business_id: string;
  branch_id?: string | null;
  category: string;
  title: string;
  amount: number;
  payment_method: string;
  vendor?: string | null;
  date: string;
  description?: string | null;
  created_by: string;
  created_at: string;
}

