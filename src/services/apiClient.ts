import { Capacitor } from '@capacitor/core';
import type { UserAccountStatus, UserPermissions, WorkspacePayload } from '../types/suppliers';

const SESSION_STORAGE_KEY = 'al_eqfal_app_session';
const API_BASE_STORAGE_KEY = 'al_eqfal_api_base_url';
const DEFAULT_MOBILE_API_BASE_URL =
  'https://ais-pre-oz67o5kikxeqppxx7torkm-590426457539.europe-west2.run.app';
let memorySessionToken: string | null = null;

export function isNativeCapacitorApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getApiBaseUrl(): string {
  try {
    const saved = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (saved && /^https?:\/\//i.test(saved.trim())) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // Ignore storage restriction
  }
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envBase && /^https?:\/\//i.test(envBase)) {
    return envBase.replace(/\/+$/, '');
  }
  return DEFAULT_MOBILE_API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  const cleaned = url.trim().replace(/\/+$/, '');
  try {
    if (cleaned && /^https?:\/\//i.test(cleaned)) {
      localStorage.setItem(API_BASE_STORAGE_KEY, cleaned);
    } else if (!cleaned) {
      localStorage.removeItem(API_BASE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction
  }
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (!isNativeCapacitorApp()) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getStoredSessionToken(): string | null {
  if (memorySessionToken) return memorySessionToken;
  try {
    const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (token) {
      memorySessionToken = token;
    }
    return token;
  } catch {
    return null;
  }
}

export function setStoredSessionToken(token: string | null): void {
  memorySessionToken = token;
  try {
    if (token) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(resolveApiUrl(path), {
    ...options,
    headers,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error || 'REQUEST_FAILED',
      data?.message || `Request failed (${res.status})`
    );
  }

  return data as T;
}

export async function connectManagerDrive(googleAccessToken: string): Promise<{
  sessionToken: string;
  workspace: WorkspacePayload;
}> {
  const res = await apiRequest<{ sessionToken: string; workspace: WorkspacePayload }>(
    '/api/auth/manager-connect',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
    }
  );
  setStoredSessionToken(res.sessionToken);
  return res;
}

export async function loginEmployee(
  username: string,
  password: string
): Promise<{ sessionToken: string; workspace: WorkspacePayload }> {
  const res = await apiRequest<{ sessionToken: string; workspace: WorkspacePayload }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }
  );
  setStoredSessionToken(res.sessionToken);
  return res;
}

export async function fetchWorkspace(): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>('/api/workspace', { method: 'GET' });
}

export async function refreshManagerDrive(googleAccessToken?: string): Promise<WorkspacePayload> {
  const headers: Record<string, string> = {};
  if (googleAccessToken) {
    headers['X-Google-Access-Token'] = googleAccessToken;
  }
  return apiRequest<WorkspacePayload>('/api/manager/refresh-drive', {
    method: 'POST',
    headers,
  });
}

// Branches (Manager Only)
export async function createBranch(name: string): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>('/api/branches', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateBranch(branchId: string, name: string): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/branches/${branchId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteBranch(branchId: string): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/branches/${branchId}`, {
    method: 'DELETE',
  });
}

// Users (Manager Only)
export async function createUserAccount(payload: {
  fullName: string;
  username: string;
  password: string;
  branchId: string;
  status: UserAccountStatus;
  permissions: UserPermissions;
}): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUserAccount(
  userId: string,
  payload: {
    fullName?: string;
    username?: string;
    password?: string;
    branchId?: string;
    status?: UserAccountStatus;
    permissions?: UserPermissions;
  }
): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteUserAccount(userId: string): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/users/${userId}`, {
    method: 'DELETE',
  });
}

// Suppliers
export async function createSupplier(payload: {
  name: string;
  taxNumber: string;
  date: string;
  invoiceNumber: string;
  branchId?: string;
}): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSupplier(
  supplierId: string,
  payload: { name: string; taxNumber: string; branchId?: string }
): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/suppliers/${supplierId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteSupplier(supplierId: string): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/suppliers/${supplierId}`, {
    method: 'DELETE',
  });
}

// Invoices
export async function createPurchaseInvoice(payload: {
  supplierId: string;
  date: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  invoiceImageDataUrl?: string;
}): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePurchaseInvoice(
  invoiceId: string,
  payload: {
    invoiceNumber: string;
    date: string;
    amount: number;
    paidAmount: number;
    invoiceImageDataUrl?: string | null;
  }
): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/invoices/${invoiceId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePurchaseInvoice(invoiceId: string): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
}

// Shifts & Sales
export async function createShiftSaleRecord(payload: {
  branchId?: string;
  date: string;
  shiftName: string;
  salesAmount: number;
  purchasesAmount: number;
  notes: string;
}): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>('/api/shifts-sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteShiftSaleRecord(recordId: string): Promise<WorkspacePayload> {
  return apiRequest<WorkspacePayload>(`/api/shifts-sales/${recordId}`, {
    method: 'DELETE',
  });
}

export async function authorizeExport(): Promise<boolean> {
  const res = await apiRequest<{ authorized: boolean }>('/api/export/authorize', {
    method: 'POST',
  });
  return res.authorized;
}

export async function createDriveBackup(googleAccessToken?: string): Promise<{
  ok: boolean;
  fileName: string;
  createdAt: string;
  workspace: WorkspacePayload;
}> {
  const headers: Record<string, string> = {};
  if (googleAccessToken) {
    headers['X-Google-Access-Token'] = googleAccessToken;
  }
  return apiRequest<{
    ok: boolean;
    fileName: string;
    createdAt: string;
    workspace: WorkspacePayload;
  }>('/api/manager/backup-drive', {
    method: 'POST',
    headers,
  });
}

export interface OfflineSyncOperationInput {
  clientOpId: string;
  type: 'create_supplier' | 'create_invoice' | 'create_shift_sale';
  payload: Record<string, unknown>;
}

export interface OfflineSyncResultItem {
  clientOpId: string;
  status: 'applied' | 'skipped' | 'error';
  code?: string;
  message?: string;
}

export async function syncOfflineBatch(operations: OfflineSyncOperationInput[]): Promise<{
  results: OfflineSyncResultItem[];
  workspace: WorkspacePayload;
}> {
  return apiRequest<{
    results: OfflineSyncResultItem[];
    workspace: WorkspacePayload;
  }>('/api/sync/batch', {
    method: 'POST',
    body: JSON.stringify({ operations }),
  });
}
