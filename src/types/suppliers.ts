export type Language = 'ar' | 'en';

export type UserRole = 'manager' | 'employee';
export type UserAccountStatus = 'active' | 'suspended';

export interface Branch {
  id: string;
  name: string;
  code?: string;
  createdAt: string;
}

export interface UserPermissions {
  canRecordShiftsSales: boolean;
  canViewSuppliers: boolean;
  canCreateSuppliers: boolean;
  canCreateInvoices: boolean;
  canEditInvoices: boolean;
  canDeleteData: boolean;
  canExportReports: boolean;
}

export interface UserAccount {
  id: string;
  fullName: string;
  username: string;
  passwordHash: string;
  role: 'employee';
  branchId: string;
  status: UserAccountStatus;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
}

export type PublicUserAccount = Omit<UserAccount, 'passwordHash'>;

export interface ShiftSaleRecord {
  id: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  shiftName: string;
  employeeId: string;
  employeeName: string;
  salesAmount: number;
  purchasesAmount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  branchId?: string;
  name: string;
  taxNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoice {
  id: string;
  branchId?: string;
  supplierId: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paidAmount: number;
  invoiceImageDataUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersDatabase {
  version: number;
  updatedAt: string;
  managerEmail?: string;
  branches: Branch[];
  users: UserAccount[];
  suppliers: Supplier[];
  invoices: PurchaseInvoice[];
  shiftsSales: ShiftSaleRecord[];
}

export interface AuthSession {
  role: UserRole;
  userId: string;
  displayName: string;
  username?: string;
  email?: string;
  branchId: string | null;
  branchName?: string;
  permissions: UserPermissions;
}

export interface WorkspacePayload {
  session: AuthSession;
  branches: Branch[];
  users: PublicUserAccount[];
  suppliers: Supplier[];
  invoices: PurchaseInvoice[];
  shiftsSales: ShiftSaleRecord[];
  driveSyncStatus: 'disconnected' | 'connected' | 'token_expired';
  lastSyncedAt: string | null;
}

export interface SupplierWithStats extends Supplier {
  invoiceCount: number;
  totalPurchases: number;
  totalPayments: number;
  totalDue: number;
  lastInvoiceDate: string | null;
  lastInvoiceNumber: string | null;
}

export interface DashboardStats {
  suppliersCount: number;
  invoicesCount: number;
  totalPurchases: number;
  totalPayments: number;
  totalPayables: number;
}
