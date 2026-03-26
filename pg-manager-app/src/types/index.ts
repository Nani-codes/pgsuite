export interface User {
  id: string;
  name: string;
  role: 'owner' | 'tenant';
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  amenities: string[];
  _count?: { rooms: number };
  rooms?: Room[];
  floors?: Floor[];
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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  tenant?: Pick<Tenant, 'name'>;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
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
  totalDues: number;
  openComplaints: number;
  occupancy: {
    total: number;
    occupied: number;
    vacant: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
