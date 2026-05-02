export type UserRole = 'owner' | 'tenant' | 'explorer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  availableFor?: string;
  about?: string;
  imageUrls?: string[];
  isActive?: boolean;
  amenities: string[];
  _count?: { rooms: number };
  rooms?: Room[];
  floors?: Floor[];
}

export interface ShowcaseProperty {
  id: string;
  name: string;
  city: string;
  state?: string;
  pincode?: string;
  address: string;
  availableFor?: string;
  about?: string;
  commonAmenitiesSummary?: string;
  serviceAmenitiesSummary?: string;
  foodAmenitiesSummary?: string;
  imageUrls: string[];
  distanceKm?: number;
}

export interface CreatePropertyPayload {
  name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  availableFor?: string;
  about?: string;
  imageUrls?: string[];
  amenities?: string[];
  totalBeds?: number;
  listPublicly?: boolean;
}

export interface Room {
  id: string;
  roomNumber: string;
  roomType: 'single' | 'double' | 'triple';
  rentAmount: number;
  floor?: Floor;
  beds?: Bed[];
}

export interface Bed {
  id: string;
  label: string;
  status: 'vacant' | 'occupied' | 'reserved';
  room?: Room;
}

export interface Floor {
  id: string;
  label: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePhotoUrl?: string;
  status: 'active' | 'checked_out' | 'suspended';
  createdAt: string;
  daysToNextInvoice?: number | null;
  leases?: Lease[];
  documents?: TenantDocument[];
}

export interface Lease {
  id: string;
  status: string;
  rentAmount: number;
  billingDay: number;
  moveInDate: string;
  moveOutDate?: string;
  securityDeposit: number;
  depositStatus: string;
  property?: Pick<Property, 'id' | 'name'>;
  bed?: Bed & { room?: Pick<Room, 'roomNumber'> };
}

export interface InvoiceItem {
  id: string;
  type: 'rent' | 'late_fee' | 'utility' | 'maintenance' | 'other';
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  total: number;
  status: 'draft' | 'sent' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  tenant?: Pick<Tenant, 'name'>;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  amount: number;
  issuedAt: string;
  payment?: Payment;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  referenceNo?: string;
  collectedBy?: string;
  paidAt?: string;
  receipt?: Receipt;
}

export interface AgingBucket {
  bucket: string;
  count: number;
  totalAmount: number;
  invoices: {
    id: string;
    invoiceNumber: string;
    tenantName: string;
    total: number;
    dueDate: string;
    daysOverdue: number;
  }[];
}

export interface ReconciliationReport {
  summary: {
    totalExpected: number;
    totalCollected: number;
    totalShortfall: number;
  };
  byMethod: Record<string, number>;
  daily: {
    date: string;
    expected: number;
    collected: number;
    shortfall: number;
    byMethod: Record<string, number>;
  }[];
}

export interface LateFeePolicy {
  id: string;
  leaseId: string;
  graceDays: number;
  feeType: 'fixed' | 'percentage';
  feeAmount: number;
  maxFee?: number;
  isActive: boolean;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  tenant?: Pick<Tenant, 'name'>;
  property?: Pick<Property, 'name'>;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface TenantDocument {
  id: string;
  docType: string;
  verified: boolean;
}

export interface DashboardData {
  totalProperties: number;
  todayCollection: number;
  monthCollection: number;
  totalDues: number;
  monthDues: number;
  monthExpenses: number;
  openComplaints: number;
  tenantsUnderNotice: number;
  activeBookings: number;
  newLeads: number;
  daysToNextInvoice: number | null;
  occupancy: {
    total: number;
    occupied: number;
    vacant: number;
    reserved: number;
  };
}

export interface Booking {
  id: string;
  propertyId: string;
  bedId?: string;
  name: string;
  phone: string;
  email?: string;
  expectedCheckIn: string;
  rentAmount: number;
  advanceAmount: number;
  advancePaid: boolean;
  status: 'pending' | 'confirmed' | 'cancelled' | 'converted';
  notes?: string;
  convertedTenantId?: string;
  createdAt: string;
  property?: Pick<Property, 'id' | 'name'>;
  bed?: Bed & { room?: Pick<Room, 'roomNumber'> };
}

export interface Lead {
  id: string;
  propertyId?: string;
  name: string;
  phone: string;
  email?: string;
  source: 'walk_in' | 'online' | 'referral' | 'social_media' | 'other';
  status: 'new_lead' | 'contacted' | 'interested' | 'visit_scheduled' | 'visit_done' | 'converted' | 'lost';
  budget?: number;
  preferredRoomType?: string;
  followUpDate?: string;
  notes?: string;
  convertedBookingId?: string;
  createdAt: string;
  property?: Pick<Property, 'id' | 'name'>;
}

export interface DuesPackageItem {
  id: string;
  type: 'rent' | 'late_fee' | 'utility' | 'maintenance' | 'other';
  description: string;
  amount: number;
}

export interface DuesPackage {
  id: string;
  propertyId?: string;
  name: string;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  totalAmount: number;
  autoGenerate: boolean;
  isActive: boolean;
  items: DuesPackageItem[];
  property?: Pick<Property, 'id' | 'name'>;
  _count?: { leases: number };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
