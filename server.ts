import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response as ExpressResponse, NextFunction } from 'express';
import type {
  AuthSession,
  Branch,
  PublicUserAccount,
  PurchaseInvoice,
  ShiftSaleRecord,
  Supplier,
  SuppliersDatabase,
  UserAccount,
  UserAccountStatus,
  UserPermissions,
  WorkspacePayload,
} from './src/types/suppliers.ts';

const PORT = 3000;
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'AL EQFAL Suppliers';
const BACKUP_FOLDER_NAME = 'Backups';
const DATA_FILE_NAME = 'al_eqfal_suppliers_data.json';
const DEFAULT_BRANCH_ID = 'branch_main';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const FULL_MANAGER_PERMISSIONS: UserPermissions = {
  canRecordShiftsSales: true,
  canViewSuppliers: true,
  canCreateSuppliers: true,
  canCreateInvoices: true,
  canEditInvoices: true,
  canDeleteData: true,
  canExportReports: true,
};

// Server-side authoritative state synchronized with Manager's Google Drive
let activeDb: SuppliersDatabase | null = null;
let activeDriveFileId: string | null = null;
let activeDriveToken: string | null = null;
let activeManagerDisplayName = 'المدير';
let driveSyncStatus: 'disconnected' | 'connected' | 'token_expired' = 'disconnected';
let hasPendingDriveSync = false;
let lastSyncedAt: string | null = null;

interface TokenPayload {
  role: 'manager' | 'employee';
  userId: string;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  session?: AuthSession;
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = String(storedHash || '').split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

function signSessionToken(role: 'manager' | 'employee', userId: string): string {
  const now = Date.now();
  const payload: TokenPayload = {
    role,
    userId,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(token: string): TokenPayload | null {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as TokenPayload;
    if (!decoded || typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function sanitizeUser(user: UserAccount): PublicUserAccount {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    branchId: user.branchId,
    status: user.status,
    permissions: user.permissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizePermissions(raw?: Partial<UserPermissions>): UserPermissions {
  return {
    canRecordShiftsSales: Boolean(raw?.canRecordShiftsSales),
    canViewSuppliers: Boolean(raw?.canViewSuppliers),
    canCreateSuppliers: Boolean(raw?.canCreateSuppliers),
    canCreateInvoices: Boolean(raw?.canCreateInvoices),
    canEditInvoices: Boolean(raw?.canEditInvoices),
    canDeleteData: Boolean(raw?.canDeleteData),
    canExportReports: Boolean(raw?.canExportReports),
  };
}

function sanitizeInvoiceImage(raw: unknown): {
  provided: boolean;
  value?: string;
  invalid?: boolean;
} {
  if (raw === undefined) {
    return { provided: false };
  }
  if (raw === null || raw === '') {
    return { provided: true, value: undefined };
  }
  if (typeof raw !== 'string') {
    return { provided: true, invalid: true };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { provided: true, value: undefined };
  }
  const isValidImageDataUrl = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);
  if (!isValidImageDataUrl || trimmed.length > 2_500_000) {
    return { provided: true, invalid: true };
  }
  return { provided: true, value: trimmed };
}

function isAllowedCorsOrigin(origin: string): boolean {
  const normalized = origin.trim().replace(/\/+$/, '');
  const staticAllowed = new Set([
    'capacitor://localhost',
    'ionic://localhost',
    'https://localhost',
    'http://localhost',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
  ]);
  if (staticAllowed.has(normalized)) {
    return true;
  }
  const appUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (appUrl && normalized === appUrl) {
    return true;
  }
  if (/^https:\/\/[a-z0-9-]+\.run\.app$/i.test(normalized)) {
    return true;
  }
  return false;
}

function normalizeDatabase(raw: Partial<SuppliersDatabase> | null | undefined): SuppliersDatabase {
  const now = new Date().toISOString();
  const branches: Branch[] =
    Array.isArray(raw?.branches) && raw.branches.length > 0
      ? raw.branches
      : [
          {
            id: DEFAULT_BRANCH_ID,
            name: 'الفرع الرئيسي',
            code: 'MAIN',
            createdAt: now,
          },
        ];

  const defaultBranchId = branches[0].id;

  const suppliers: Supplier[] = (Array.isArray(raw?.suppliers) ? raw.suppliers : []).map((s) => ({
    ...s,
    branchId: s.branchId || defaultBranchId,
  }));

  const supplierBranchMap = new Map<string, string>();
  suppliers.forEach((s) => {
    supplierBranchMap.set(s.id, s.branchId || defaultBranchId);
  });

  const invoices: PurchaseInvoice[] = (Array.isArray(raw?.invoices) ? raw.invoices : []).map((inv) => {
    const imgCheck = sanitizeInvoiceImage(inv.invoiceImageDataUrl);
    return {
      ...inv,
      branchId: inv.branchId || supplierBranchMap.get(inv.supplierId) || defaultBranchId,
      amount: Number(inv.amount || 0),
      paidAmount: Number(inv.paidAmount || 0),
      invoiceImageDataUrl: imgCheck.provided && !imgCheck.invalid ? imgCheck.value : undefined,
    };
  });

  const users: UserAccount[] = (Array.isArray(raw?.users) ? raw.users : []).map((u) => ({
    ...u,
    role: 'employee',
    branchId: branches.some((b) => b.id === u.branchId) ? u.branchId : defaultBranchId,
    status: u.status === 'suspended' ? 'suspended' : 'active',
    permissions: normalizePermissions(u.permissions),
  }));

  const shiftsSales: ShiftSaleRecord[] = (Array.isArray(raw?.shiftsSales) ? raw.shiftsSales : []).map(
    (rec) => ({
      ...rec,
      branchId: rec.branchId || defaultBranchId,
      salesAmount: Number(rec.salesAmount || 0),
      purchasesAmount: Number(rec.purchasesAmount || 0),
      notes: String(rec.notes || ''),
    })
  );

  return {
    version: raw?.version || 2,
    updatedAt: raw?.updatedAt || now,
    managerEmail: raw?.managerEmail,
    branches,
    users,
    suppliers,
    invoices,
    shiftsSales,
  };
}

class DriveAuthError extends Error {
  constructor(message = 'Google Drive authorization expired or missing') {
    super(message);
    this.name = 'DriveAuthError';
  }
}

async function driveFetch(url: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new DriveAuthError(`Google Drive auth error (${res.status})`);
  }

  return res;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new DriveAuthError('Failed to verify Google user token');
  }
  const info = (await res.json()) as { email?: string; name?: string };
  if (!info.email) {
    throw new DriveAuthError('Google account email missing');
  }
  return {
    email: info.email.toLowerCase(),
    name: info.name || info.email,
  };
}

async function findOrCreateFolder(accessToken: string): Promise<string> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`
  );
  const searchRes = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${q}&fields=files(id,name)&spaces=drive`,
    accessToken
  );

  if (!searchRes.ok) {
    throw new Error(`Failed to search folder in Google Drive (${searchRes.status})`);
  }

  const searchData = (await searchRes.json()) as { files?: Array<{ id: string; name: string }> };
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await driveFetch(`${DRIVE_API_BASE}/files?fields=id`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create folder in Google Drive (${createRes.status})`);
  }

  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function findDataFile(accessToken: string, folderId: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${DATA_FILE_NAME}' and '${folderId}' in parents and trashed=false`
  );
  const res = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`,
    accessToken
  );

  if (!res.ok) {
    throw new Error(`Failed to query data file in Google Drive (${res.status})`);
  }

  const data = (await res.json()) as { files?: Array<{ id: string }> };
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  return null;
}

async function createDataFile(
  accessToken: string,
  folderId: string,
  initialDb: SuppliersDatabase
): Promise<string> {
  const boundary = `al_eqfal_boundary_${Date.now()}`;
  const metadata = {
    name: DATA_FILE_NAME,
    mimeType: 'application/json',
    parents: [folderId],
  };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(initialDb, null, 2)}\r\n` +
    `--${boundary}--`;

  const res = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create data file in Google Drive (${res.status})`);
  }

  const created = (await res.json()) as { id: string };
  return created.id;
}

async function loadFromDrive(accessToken: string): Promise<{
  database: SuppliersDatabase;
  fileId: string;
}> {
  const folderId = await findOrCreateFolder(accessToken);
  let fileId = await findDataFile(accessToken, folderId);

  if (!fileId) {
    const emptyDb = normalizeDatabase(null);
    fileId = await createDataFile(accessToken, folderId, emptyDb);
    return { database: emptyDb, fileId };
  }

  const contentRes = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, accessToken);
  if (!contentRes.ok) {
    throw new Error(`Failed to download data file from Google Drive (${contentRes.status})`);
  }

  try {
    const parsed = (await contentRes.json()) as Partial<SuppliersDatabase>;
    return { database: normalizeDatabase(parsed), fileId };
  } catch {
    return { database: normalizeDatabase(null), fileId };
  }
}

async function writeDatabaseToDrive(
  accessToken: string,
  fileId: string,
  db: SuppliersDatabase
): Promise<SuppliersDatabase> {
  const payload: SuppliersDatabase = {
    ...db,
    version: 2,
    updatedAt: new Date().toISOString(),
  };

  const res = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media&fields=id,modifiedTime`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload, null, 2),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to save data to Google Drive (${res.status})`);
  }

  return payload;
}

async function findOrCreateBackupFolder(accessToken: string, parentFolderId: string): Promise<string> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${BACKUP_FOLDER_NAME}' and '${parentFolderId}' in parents and trashed=false`
  );
  const searchRes = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${q}&fields=files(id,name)&spaces=drive`,
    accessToken
  );

  if (!searchRes.ok) {
    throw new Error(`Failed to search backup folder in Google Drive (${searchRes.status})`);
  }

  const searchData = (await searchRes.json()) as { files?: Array<{ id: string; name: string }> };
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await driveFetch(`${DRIVE_API_BASE}/files?fields=id`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create backup folder in Google Drive (${createRes.status})`);
  }

  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function createBackupFileInDrive(
  accessToken: string,
  backupFolderId: string,
  db: SuppliersDatabase
): Promise<{ id: string; fileName: string; createdAt: string }> {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `al_eqfal_backup_${stamp}.json`;
  const boundary = `al_eqfal_backup_boundary_${Date.now()}`;
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [backupFolderId],
  };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(db, null, 2)}\r\n` +
    `--${boundary}--`;

  const res = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create backup file in Google Drive (${res.status})`);
  }

  const created = (await res.json()) as { id: string };
  return { id: created.id, fileName, createdAt: now.toISOString() };
}

async function persistActiveDb(nextDb: SuppliersDatabase): Promise<void> {
  const stamped: SuppliersDatabase = {
    ...nextDb,
    version: 2,
    updatedAt: new Date().toISOString(),
  };
  activeDb = stamped;

  if (!activeDriveToken || !activeDriveFileId) {
    driveSyncStatus = 'token_expired';
    hasPendingDriveSync = true;
    return;
  }

  try {
    activeDb = await writeDatabaseToDrive(activeDriveToken, activeDriveFileId, stamped);
    driveSyncStatus = 'connected';
    hasPendingDriveSync = false;
    lastSyncedAt = new Date().toISOString();
  } catch (err) {
    if (err instanceof DriveAuthError) {
      driveSyncStatus = 'token_expired';
      hasPendingDriveSync = true;
    } else {
      throw err;
    }
  }
}

function buildSessionForTokenPayload(payload: TokenPayload): AuthSession | null {
  if (!activeDb) return null;

  if (payload.role === 'manager') {
    return {
      role: 'manager',
      userId: 'manager',
      displayName: activeManagerDisplayName || activeDb.managerEmail || 'Manager',
      email: activeDb.managerEmail,
      branchId: null,
      permissions: FULL_MANAGER_PERMISSIONS,
    };
  }

  const user = activeDb.users.find((u) => u.id === payload.userId);
  if (!user || user.status !== 'active') {
    return null;
  }

  const branch = activeDb.branches.find((b) => b.id === user.branchId);
  return {
    role: 'employee',
    userId: user.id,
    displayName: user.fullName,
    username: user.username,
    branchId: user.branchId,
    branchName: branch?.name || '',
    permissions: user.permissions,
  };
}

function requireSession(req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Session is invalid or expired' });
    return;
  }

  if (!activeDb) {
    res.status(503).json({
      error: 'DRIVE_NOT_CONNECTED',
      message: 'Manager Google Drive session is not active yet',
    });
    return;
  }

  const session = buildSessionForTokenPayload(payload);
  if (!session) {
    res.status(403).json({
      error: 'ACCOUNT_DISABLED',
      message: 'Account is suspended or no longer exists',
    });
    return;
  }

  req.session = session;
  next();
}

function requireManager(req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction) {
  if (!req.session || req.session.role !== 'manager') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Manager privileges required' });
    return;
  }
  next();
}

function buildWorkspaceForSession(session: AuthSession): WorkspacePayload {
  if (!activeDb) {
    throw new Error('Database not initialized');
  }

  if (session.role === 'manager') {
    return {
      session,
      branches: activeDb.branches,
      users: activeDb.users.map(sanitizeUser),
      suppliers: activeDb.suppliers,
      invoices: activeDb.invoices,
      shiftsSales: activeDb.shiftsSales,
      driveSyncStatus,
      lastSyncedAt,
    };
  }

  const branchId = session.branchId;
  const employeeBranches = activeDb.branches.filter((b) => b.id === branchId);
  const canReadSuppliers =
    session.permissions.canViewSuppliers ||
    session.permissions.canCreateSuppliers ||
    session.permissions.canCreateInvoices ||
    session.permissions.canEditInvoices;

  const branchSuppliers = canReadSuppliers
    ? activeDb.suppliers.filter((s) => s.branchId === branchId)
    : [];

  const supplierIdSet = new Set(branchSuppliers.map((s) => s.id));
  const branchInvoices = canReadSuppliers
    ? activeDb.invoices.filter((inv) => inv.branchId === branchId || supplierIdSet.has(inv.supplierId))
    : [];

  const branchShiftsSales = activeDb.shiftsSales.filter((rec) => rec.branchId === branchId);

  return {
    session,
    branches: employeeBranches,
    users: [], // Employees never receive user accounts list
    suppliers: branchSuppliers,
    invoices: branchInvoices,
    shiftsSales: branchShiftsSales,
    driveSyncStatus: 'connected', // Never expose internal Drive state/errors to employees
    lastSyncedAt: null,
  };
}

async function startServer() {
  const app = express();
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isAllowedCorsOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type,Authorization,X-Google-Access-Token'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, driveInitialized: Boolean(activeDb) });
  });

  // Manager connects with Google OAuth access token -> verifies identity & syncs Google Drive
  app.post('/api/auth/manager-connect', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const googleAccessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!googleAccessToken) {
      res.status(400).json({ error: 'MISSING_GOOGLE_TOKEN', message: 'Google access token required' });
      return;
    }

    try {
      const userInfo = await fetchGoogleUserInfo(googleAccessToken);
      const loaded = await loadFromDrive(googleAccessToken);

      if (
        loaded.database.managerEmail &&
        loaded.database.managerEmail.toLowerCase() !== userInfo.email
      ) {
        res.status(403).json({
          error: 'MANAGER_MISMATCH',
          message: 'This Google Drive database belongs to a different manager account',
        });
        return;
      }

      if (!loaded.database.managerEmail) {
        loaded.database.managerEmail = userInfo.email;
      }

      activeDriveToken = googleAccessToken;
      activeDriveFileId = loaded.fileId;
      activeManagerDisplayName = userInfo.name;

      if (activeDb && hasPendingDriveSync && activeDb.managerEmail === userInfo.email) {
        // Flush any pending in-memory employee transactions safely up to Drive
        activeDb = await writeDatabaseToDrive(googleAccessToken, loaded.fileId, activeDb);
      } else {
        activeDb = await writeDatabaseToDrive(googleAccessToken, loaded.fileId, loaded.database);
      }

      driveSyncStatus = 'connected';
      hasPendingDriveSync = false;
      lastSyncedAt = new Date().toISOString();

      const sessionToken = signSessionToken('manager', 'manager');
      const session: AuthSession = {
        role: 'manager',
        userId: 'manager',
        displayName: userInfo.name,
        email: userInfo.email,
        branchId: null,
        permissions: FULL_MANAGER_PERMISSIONS,
      };

      res.json({
        sessionToken,
        workspace: buildWorkspaceForSession(session),
      });
    } catch (err) {
      console.error('Manager connect error:', err);
      if (err instanceof DriveAuthError) {
        res.status(401).json({ error: 'GOOGLE_AUTH_FAILED', message: err.message });
      } else {
        res.status(500).json({ error: 'DRIVE_SYNC_FAILED', message: 'Failed to connect Google Drive' });
      }
    }
  });

  // Employee login with username + password
  app.post('/api/auth/login', (req, res) => {
    if (!activeDb) {
      res.status(503).json({
        error: 'DRIVE_NOT_CONNECTED',
        message: 'Manager has not connected Google Drive in this session yet.',
      });
      return;
    }

    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Username and password required' });
      return;
    }

    const user = activeDb.users.find((u) => u.username.trim().toLowerCase() === username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'This account has been suspended by the manager' });
      return;
    }

    const sessionToken = signSessionToken('employee', user.id);
    const branch = activeDb.branches.find((b) => b.id === user.branchId);
    const session: AuthSession = {
      role: 'employee',
      userId: user.id,
      displayName: user.fullName,
      username: user.username,
      branchId: user.branchId,
      branchName: branch?.name || '',
      permissions: user.permissions,
    };

    res.json({
      sessionToken,
      workspace: buildWorkspaceForSession(session),
    });
  });

  app.get('/api/workspace', requireSession, (req: AuthenticatedRequest, res) => {
    res.json(buildWorkspaceForSession(req.session!));
  });

  app.post('/api/manager/refresh-drive', requireSession, requireManager, async (req: AuthenticatedRequest, res) => {
    const freshGoogleToken = String(req.headers['x-google-access-token'] || '').trim();
    const tokenToUse = freshGoogleToken || activeDriveToken;

    if (!tokenToUse) {
      driveSyncStatus = 'token_expired';
      res.status(401).json({ error: 'GOOGLE_TOKEN_EXPIRED', message: 'Please reconnect Google Drive' });
      return;
    }

    try {
      if (freshGoogleToken) {
        activeDriveToken = freshGoogleToken;
      }
      if (hasPendingDriveSync && activeDb && activeDriveFileId) {
        activeDb = await writeDatabaseToDrive(tokenToUse, activeDriveFileId, activeDb);
      } else {
        const loaded = await loadFromDrive(tokenToUse);
        activeDriveFileId = loaded.fileId;
        if (!loaded.database.managerEmail && req.session?.email) {
          loaded.database.managerEmail = req.session.email;
        }
        activeDb = loaded.database;
      }
      driveSyncStatus = 'connected';
      hasPendingDriveSync = false;
      lastSyncedAt = new Date().toISOString();
      res.json(buildWorkspaceForSession(req.session!));
    } catch (err) {
      if (err instanceof DriveAuthError) {
        driveSyncStatus = 'token_expired';
        res.status(401).json({ error: 'GOOGLE_TOKEN_EXPIRED', message: 'Google Drive session expired' });
      } else {
        res.status(500).json({ error: 'DRIVE_LOAD_FAILED', message: 'Failed to refresh from Google Drive' });
      }
    }
  });

  app.post('/api/manager/backup-drive', requireSession, requireManager, async (req: AuthenticatedRequest, res) => {
    const freshGoogleToken = String(req.headers['x-google-access-token'] || '').trim();
    const tokenToUse = freshGoogleToken || activeDriveToken;

    if (!tokenToUse) {
      driveSyncStatus = 'token_expired';
      res.status(401).json({ error: 'GOOGLE_TOKEN_EXPIRED', message: 'Please reconnect Google Drive' });
      return;
    }

    try {
      if (freshGoogleToken) {
        activeDriveToken = freshGoogleToken;
      }
      const folderId = await findOrCreateFolder(tokenToUse);
      const backupFolderId = await findOrCreateBackupFolder(tokenToUse, folderId);
      const backup = await createBackupFileInDrive(tokenToUse, backupFolderId, activeDb!);
      driveSyncStatus = 'connected';
      lastSyncedAt = backup.createdAt;
      res.json({
        ok: true,
        fileName: backup.fileName,
        createdAt: backup.createdAt,
        workspace: buildWorkspaceForSession(req.session!),
      });
    } catch (err) {
      if (err instanceof DriveAuthError) {
        driveSyncStatus = 'token_expired';
        res.status(401).json({ error: 'GOOGLE_TOKEN_EXPIRED', message: 'Google Drive session expired' });
      } else {
        res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to create Google Drive backup' });
      }
    }
  });

  // ==========================
  // Branches (Manager Only)
  // ==========================
  app.post('/api/branches', requireSession, requireManager, async (req: AuthenticatedRequest, res) => {
    const name = String(req.body?.name || '').trim();
    const code = String(req.body?.code || '').trim();
    if (!name) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'Branch name is required' });
      return;
    }

    const exists = activeDb!.branches.some((b) => b.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      res.status(409).json({ error: 'DUPLICATE_BRANCH', message: 'Branch name already exists' });
      return;
    }

    const newBranch: Branch = {
      id: generateId('branch'),
      name,
      code: code || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      await persistActiveDb({
        ...activeDb!,
        branches: [...activeDb!.branches, newBranch],
      });
      res.json(buildWorkspaceForSession(req.session!));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.patch('/api/branches/:id', requireSession, requireManager, async (req: AuthenticatedRequest, res) => {
    const branchId = req.params.id;
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'Branch name is required' });
      return;
    }

    const idx = activeDb!.branches.findIndex((b) => b.id === branchId);
    if (idx === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Branch not found' });
      return;
    }

    const updatedBranches = activeDb!.branches.map((b) =>
      b.id === branchId ? { ...b, name } : b
    );

    try {
      await persistActiveDb({ ...activeDb!, branches: updatedBranches });
      res.json(buildWorkspaceForSession(req.session!));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.delete('/api/branches/:id', requireSession, requireManager, async (req: AuthenticatedRequest, res) => {
    const branchId = req.params.id;
    if (activeDb!.branches.length <= 1) {
      res.status(400).json({ error: 'CANNOT_DELETE_LAST_BRANCH', message: 'At least one branch must remain' });
      return;
    }

    const inUse =
      activeDb!.users.some((u) => u.branchId === branchId) ||
      activeDb!.suppliers.some((s) => s.branchId === branchId) ||
      activeDb!.shiftsSales.some((r) => r.branchId === branchId);

    if (inUse) {
      res.status(409).json({
        error: 'BRANCH_IN_USE',
        message: 'Cannot delete a branch that has assigned employees, suppliers, or shift records',
      });
      return;
    }

    try {
      await persistActiveDb({
        ...activeDb!,
        branches: activeDb!.branches.filter((b) => b.id !== branchId),
      });
      res.json(buildWorkspaceForSession(req.session!));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  // ==========================
  // Users Management (Manager Only)
  // ==========================
  app.post('/api/users', requireSession, requireManager, async (req: AuthenticatedRequest, res) => {
    const fullName = String(req.body?.fullName || '').trim();
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const branchId = String(req.body?.branchId || '').trim();
    const status: UserAccountStatus = req.body?.status === 'suspended' ? 'suspended' : 'active';
    const permissions = normalizePermissions(req.body?.permissions);

    if (!fullName || !username || !password || !branchId) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'All user fields are required' });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Password must be at least 4 characters' });
      return;
    }

    if (!activeDb!.branches.some((b) => b.id === branchId)) {
      res.status(400).json({ error: 'INVALID_BRANCH', message: 'Selected branch does not exist' });
      return;
    }

    const duplicateUsername = activeDb!.users.some(
      (u) => u.username.trim().toLowerCase() === username.toLowerCase()
    );
    if (duplicateUsername) {
      res.status(409).json({ error: 'DUPLICATE_USERNAME', message: 'Username already exists' });
      return;
    }

    const now = new Date().toISOString();
    const newUser: UserAccount = {
      id: generateId('usr'),
      fullName,
      username,
      passwordHash: hashPassword(password),
      role: 'employee',
      branchId,
      status,
      permissions,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await persistActiveDb({
        ...activeDb!,
        users: [newUser, ...activeDb!.users],
      });
      res.json(buildWorkspaceForSession(req.session!));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.patch('/api/users/:id', requireSession, requireManager, async (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;
    const existing = activeDb!.users.find((u) => u.id === userId);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
      return;
    }

    const fullName = String(req.body?.fullName ?? existing.fullName).trim();
    const username = String(req.body?.username ?? existing.username).trim();
    const newPassword = req.body?.password !== undefined ? String(req.body.password) : '';
    const branchId = String(req.body?.branchId ?? existing.branchId).trim();
    const status: UserAccountStatus =
      req.body?.status !== undefined
        ? req.body.status === 'suspended'
          ? 'suspended'
          : 'active'
        : existing.status;
    const permissions =
      req.body?.permissions !== undefined
        ? normalizePermissions(req.body.permissions)
        : existing.permissions;

    if (!fullName || !username || !branchId) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'Required fields missing' });
      return;
    }

    if (newPassword && newPassword.length < 4) {
      res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Password must be at least 4 characters' });
      return;
    }

    if (!activeDb!.branches.some((b) => b.id === branchId)) {
      res.status(400).json({ error: 'INVALID_BRANCH', message: 'Selected branch does not exist' });
      return;
    }

    const duplicateUsername = activeDb!.users.some(
      (u) => u.id !== userId && u.username.trim().toLowerCase() === username.toLowerCase()
    );
    if (duplicateUsername) {
      res.status(409).json({ error: 'DUPLICATE_USERNAME', message: 'Username already exists' });
      return;
    }

    const updatedUser: UserAccount = {
      ...existing,
      fullName,
      username,
      passwordHash: newPassword ? hashPassword(newPassword) : existing.passwordHash,
      branchId,
      status,
      permissions,
      updatedAt: new Date().toISOString(),
    };

    try {
      await persistActiveDb({
        ...activeDb!,
        users: activeDb!.users.map((u) => (u.id === userId ? updatedUser : u)),
      });
      res.json(buildWorkspaceForSession(req.session!));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.delete('/api/users/:id', requireSession, requireManager, async (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;
    if (!activeDb!.users.some((u) => u.id === userId)) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
      return;
    }

    try {
      await persistActiveDb({
        ...activeDb!,
        users: activeDb!.users.filter((u) => u.id !== userId),
      });
      res.json(buildWorkspaceForSession(req.session!));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  // ==========================
  // Suppliers (RBAC + Branch Enforced)
  // ==========================
  app.post('/api/suppliers', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canCreateSuppliers) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to add suppliers' });
      return;
    }

    const name = String(req.body?.name || '').trim();
    const taxNumber = String(req.body?.taxNumber || '').trim();
    const date = String(req.body?.date || '').trim();
    const invoiceNumber = String(req.body?.invoiceNumber || '').trim();

    if (!name || !taxNumber || !date || !invoiceNumber) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'All 4 supplier fields are required' });
      return;
    }

    const defaultBranchId = activeDb!.branches[0]?.id || DEFAULT_BRANCH_ID;
    const requestedBranchId = String(req.body?.branchId || '').trim();
    const branchId =
      session.role === 'employee'
        ? session.branchId!
        : activeDb!.branches.some((b) => b.id === requestedBranchId)
          ? requestedBranchId
          : defaultBranchId;

    const now = new Date().toISOString();
    const newSupplierId = generateId('sup');
    const newSupplier: Supplier = {
      id: newSupplierId,
      branchId,
      name,
      taxNumber,
      createdAt: now,
      updatedAt: now,
    };

    const initialInvoice: PurchaseInvoice = {
      id: generateId('inv'),
      branchId,
      supplierId: newSupplierId,
      invoiceNumber,
      date,
      amount: 0,
      paidAmount: 0,
      createdBy: session.displayName,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await persistActiveDb({
        ...activeDb!,
        suppliers: [newSupplier, ...activeDb!.suppliers],
        invoices: [initialInvoice, ...activeDb!.invoices],
      });
      res.json(buildWorkspaceForSession(session));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.patch('/api/suppliers/:id', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canEditInvoices) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to edit suppliers' });
      return;
    }

    const supplierId = req.params.id;
    const existing = activeDb!.suppliers.find((s) => s.id === supplierId);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Supplier not found' });
      return;
    }

    if (session.role === 'employee' && existing.branchId !== session.branchId) {
      res.status(403).json({ error: 'BRANCH_FORBIDDEN', message: 'Cannot modify supplier in another branch' });
      return;
    }

    const name = String(req.body?.name || '').trim();
    const taxNumber = String(req.body?.taxNumber || '').trim();
    if (!name || !taxNumber) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'Supplier name and tax number required' });
      return;
    }

    const nextBranchId =
      session.role === 'manager' &&
      req.body?.branchId &&
      activeDb!.branches.some((b) => b.id === req.body.branchId)
        ? String(req.body.branchId)
        : existing.branchId;

    const now = new Date().toISOString();
    try {
      await persistActiveDb({
        ...activeDb!,
        suppliers: activeDb!.suppliers.map((s) =>
          s.id === supplierId ? { ...s, name, taxNumber, branchId: nextBranchId, updatedAt: now } : s
        ),
        invoices: activeDb!.invoices.map((inv) =>
          inv.supplierId === supplierId ? { ...inv, branchId: nextBranchId } : inv
        ),
      });
      res.json(buildWorkspaceForSession(session));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.delete('/api/suppliers/:id', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canDeleteData) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to delete suppliers' });
      return;
    }

    const supplierId = req.params.id;
    const existing = activeDb!.suppliers.find((s) => s.id === supplierId);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Supplier not found' });
      return;
    }

    if (session.role === 'employee' && existing.branchId !== session.branchId) {
      res.status(403).json({ error: 'BRANCH_FORBIDDEN', message: 'Cannot delete supplier in another branch' });
      return;
    }

    try {
      await persistActiveDb({
        ...activeDb!,
        suppliers: activeDb!.suppliers.filter((s) => s.id !== supplierId),
        invoices: activeDb!.invoices.filter((inv) => inv.supplierId !== supplierId),
      });
      res.json(buildWorkspaceForSession(session));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  // ==========================
  // Purchase Invoices (RBAC + Branch + Duplicate Prevention)
  // ==========================
  app.post('/api/invoices', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canCreateInvoices) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to create invoices' });
      return;
    }

    const supplierId = String(req.body?.supplierId || '').trim();
    const date = String(req.body?.date || '').trim();
    const invoiceNumber = String(req.body?.invoiceNumber || '').trim();
    const amount = Number(req.body?.amount ?? 0);
    const paidAmount = Number(req.body?.paidAmount ?? 0);
    const imgCheck = sanitizeInvoiceImage(req.body?.invoiceImageDataUrl);

    if (imgCheck.invalid) {
      res.status(400).json({ error: 'INVALID_IMAGE', message: 'Invalid invoice image payload or size limit exceeded' });
      return;
    }

    if (!supplierId || !date || !invoiceNumber) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'Supplier, date, and invoice number required' });
      return;
    }

    const supplier = activeDb!.suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Supplier not found' });
      return;
    }

    if (session.role === 'employee' && supplier.branchId !== session.branchId) {
      res.status(403).json({ error: 'BRANCH_FORBIDDEN', message: 'Cannot record invoice for another branch' });
      return;
    }

    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(paidAmount) || paidAmount < 0) {
      res.status(400).json({ error: 'NEGATIVE_AMOUNT', message: 'Amounts must be non-negative' });
      return;
    }

    if (amount > 0 && paidAmount > amount) {
      res.status(400).json({ error: 'PAID_EXCEEDS_AMOUNT', message: 'Paid amount exceeds invoice amount' });
      return;
    }

    const duplicate = activeDb!.invoices.some(
      (inv) =>
        inv.supplierId === supplierId &&
        inv.invoiceNumber.trim().toLowerCase() === invoiceNumber.toLowerCase()
    );
    if (duplicate) {
      res.status(409).json({
        error: 'DUPLICATE_INVOICE',
        message: 'Invoice number already exists for this supplier',
      });
      return;
    }

    const now = new Date().toISOString();
    const newInvoice: PurchaseInvoice = {
      id: generateId('inv'),
      branchId: supplier.branchId || activeDb!.branches[0]?.id || DEFAULT_BRANCH_ID,
      supplierId,
      invoiceNumber,
      date,
      amount,
      paidAmount,
      invoiceImageDataUrl: imgCheck.value,
      createdBy: session.displayName,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await persistActiveDb({
        ...activeDb!,
        invoices: [newInvoice, ...activeDb!.invoices],
      });
      res.json(buildWorkspaceForSession(session));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.patch('/api/invoices/:id', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canEditInvoices) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to edit saved invoices' });
      return;
    }

    const invoiceId = req.params.id;
    const existing = activeDb!.invoices.find((inv) => inv.id === invoiceId);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' });
      return;
    }

    if (session.role === 'employee' && existing.branchId !== session.branchId) {
      res.status(403).json({ error: 'BRANCH_FORBIDDEN', message: 'Cannot edit invoice in another branch' });
      return;
    }

    const invoiceNumber = String(req.body?.invoiceNumber || '').trim();
    const date = String(req.body?.date || '').trim();
    const amount = Number(req.body?.amount ?? 0);
    const paidAmount = Number(req.body?.paidAmount ?? 0);
    const imgCheck = sanitizeInvoiceImage(req.body?.invoiceImageDataUrl);

    if (imgCheck.invalid) {
      res.status(400).json({ error: 'INVALID_IMAGE', message: 'Invalid invoice image payload or size limit exceeded' });
      return;
    }

    if (!invoiceNumber || !date) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'Invoice number and date required' });
      return;
    }

    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(paidAmount) || paidAmount < 0) {
      res.status(400).json({ error: 'NEGATIVE_AMOUNT', message: 'Amounts must be non-negative' });
      return;
    }

    if (amount > 0 && paidAmount > amount) {
      res.status(400).json({ error: 'PAID_EXCEEDS_AMOUNT', message: 'Paid amount exceeds invoice amount' });
      return;
    }

    const duplicate = activeDb!.invoices.some(
      (inv) =>
        inv.id !== invoiceId &&
        inv.supplierId === existing.supplierId &&
        inv.invoiceNumber.trim().toLowerCase() === invoiceNumber.toLowerCase()
    );
    if (duplicate) {
      res.status(409).json({
        error: 'DUPLICATE_INVOICE',
        message: 'Invoice number already exists for this supplier',
      });
      return;
    }

    const now = new Date().toISOString();
    const nextInvoiceImage = imgCheck.provided ? imgCheck.value : existing.invoiceImageDataUrl;
    try {
      await persistActiveDb({
        ...activeDb!,
        invoices: activeDb!.invoices.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                invoiceNumber,
                date,
                amount,
                paidAmount,
                invoiceImageDataUrl: nextInvoiceImage,
                updatedAt: now,
              }
            : inv
        ),
      });
      res.json(buildWorkspaceForSession(session));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.delete('/api/invoices/:id', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canDeleteData) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to delete invoices' });
      return;
    }

    const invoiceId = req.params.id;
    const existing = activeDb!.invoices.find((inv) => inv.id === invoiceId);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' });
      return;
    }

    if (session.role === 'employee' && existing.branchId !== session.branchId) {
      res.status(403).json({ error: 'BRANCH_FORBIDDEN', message: 'Cannot delete invoice in another branch' });
      return;
    }

    try {
      await persistActiveDb({
        ...activeDb!,
        invoices: activeDb!.invoices.filter((inv) => inv.id !== invoiceId),
      });
      res.json(buildWorkspaceForSession(session));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  // ==========================
  // Shifts & Sales (RBAC + Branch Enforced)
  // ==========================
  app.post('/api/shifts-sales', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canRecordShiftsSales) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to record shifts and sales' });
      return;
    }

    const date = String(req.body?.date || '').trim();
    const shiftName = String(req.body?.shiftName || '').trim();
    const salesAmount = Number(req.body?.salesAmount ?? 0);
    const purchasesAmount = Number(req.body?.purchasesAmount ?? 0);
    const notes = String(req.body?.notes || '').trim();

    if (!date || !shiftName) {
      res.status(400).json({ error: 'REQUIRED_FIELD', message: 'Date and shift name are required' });
      return;
    }

    if (
      !Number.isFinite(salesAmount) ||
      salesAmount < 0 ||
      !Number.isFinite(purchasesAmount) ||
      purchasesAmount < 0
    ) {
      res.status(400).json({ error: 'NEGATIVE_AMOUNT', message: 'Amounts must be non-negative' });
      return;
    }

    const defaultBranchId = activeDb!.branches[0]?.id || DEFAULT_BRANCH_ID;
    const requestedBranchId = String(req.body?.branchId || '').trim();
    const branchId =
      session.role === 'employee'
        ? session.branchId!
        : activeDb!.branches.some((b) => b.id === requestedBranchId)
          ? requestedBranchId
          : defaultBranchId;

    const now = new Date().toISOString();
    const record: ShiftSaleRecord = {
      id: generateId('shift'),
      branchId,
      date,
      shiftName,
      employeeId: session.userId,
      employeeName: session.displayName,
      salesAmount,
      purchasesAmount,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await persistActiveDb({
        ...activeDb!,
        shiftsSales: [record, ...activeDb!.shiftsSales],
      });
      res.json(buildWorkspaceForSession(session));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  app.delete('/api/shifts-sales/:id', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canDeleteData) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to delete shift records' });
      return;
    }

    const recordId = req.params.id;
    const existing = activeDb!.shiftsSales.find((r) => r.id === recordId);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Shift record not found' });
      return;
    }

    if (session.role === 'employee' && existing.branchId !== session.branchId) {
      res.status(403).json({ error: 'BRANCH_FORBIDDEN', message: 'Cannot delete record in another branch' });
      return;
    }

    try {
      await persistActiveDb({
        ...activeDb!,
        shiftsSales: activeDb!.shiftsSales.filter((r) => r.id !== recordId),
      });
      res.json(buildWorkspaceForSession(session));
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save to Google Drive' });
    }
  });

  // Export authorization check endpoint (real server-side verification)
  app.post('/api/export/authorize', requireSession, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role !== 'manager' && !session.permissions.canExportReports) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Permission denied to export reports' });
      return;
    }
    res.json({ authorized: true });
  });

  // Batch Offline Sync Endpoint (RBAC + Branch + Duplicate Prevention enforced per operation)
  app.post('/api/sync/batch', requireSession, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const rawOps = Array.isArray(req.body?.operations) ? req.body.operations : [];

    if (rawOps.length === 0) {
      res.json({ results: [], workspace: buildWorkspaceForSession(session) });
      return;
    }

    let draftDb: SuppliersDatabase = {
      ...activeDb!,
      suppliers: [...activeDb!.suppliers],
      invoices: [...activeDb!.invoices],
      shiftsSales: [...activeDb!.shiftsSales],
    };

    const results: Array<{
      clientOpId: string;
      status: 'applied' | 'skipped' | 'error';
      code?: string;
      message?: string;
    }> = [];

    let hasChanges = false;
    const clientTempSupplierMap = new Map<string, string>();

    for (const op of rawOps) {
      const clientOpId = String(op?.clientOpId || generateId('op'));
      const opType = String(op?.type || '');
      const payload = (op?.payload && typeof op.payload === 'object' ? op.payload : {}) as Record<string, unknown>;
      const now = new Date().toISOString();

      if (opType === 'create_supplier') {
        if (session.role !== 'manager' && !session.permissions.canCreateSuppliers) {
          results.push({ clientOpId, status: 'error', code: 'FORBIDDEN', message: 'Permission denied' });
          continue;
        }
        const name = String(payload.name || '').trim();
        const taxNumber = String(payload.taxNumber || '').trim();
        const date = String(payload.date || '').trim();
        const invoiceNumber = String(payload.invoiceNumber || '').trim();
        if (!name || !taxNumber || !date || !invoiceNumber) {
          results.push({ clientOpId, status: 'error', code: 'REQUIRED_FIELD', message: 'Missing supplier fields' });
          continue;
        }

        const defaultBranchId = draftDb.branches[0]?.id || DEFAULT_BRANCH_ID;
        const requestedBranchId = String(payload.branchId || '').trim();
        const branchId =
          session.role === 'employee'
            ? session.branchId!
            : draftDb.branches.some((b) => b.id === requestedBranchId)
              ? requestedBranchId
              : defaultBranchId;

        const newSupplierId = generateId('sup');
        if (typeof payload.clientTempId === 'string' && payload.clientTempId) {
          clientTempSupplierMap.set(payload.clientTempId, newSupplierId);
        }

        draftDb.suppliers = [
          {
            id: newSupplierId,
            branchId,
            name,
            taxNumber,
            createdAt: now,
            updatedAt: now,
          },
          ...draftDb.suppliers,
        ];
        draftDb.invoices = [
          {
            id: generateId('inv'),
            branchId,
            supplierId: newSupplierId,
            invoiceNumber,
            date,
            amount: 0,
            paidAmount: 0,
            createdBy: session.displayName,
            createdAt: now,
            updatedAt: now,
          },
          ...draftDb.invoices,
        ];
        hasChanges = true;
        results.push({ clientOpId, status: 'applied' });
      } else if (opType === 'create_invoice') {
        if (session.role !== 'manager' && !session.permissions.canCreateInvoices) {
          results.push({ clientOpId, status: 'error', code: 'FORBIDDEN', message: 'Permission denied' });
          continue;
        }
        const rawSupplierId = String(payload.supplierId || '').trim();
        const supplierId = clientTempSupplierMap.get(rawSupplierId) || rawSupplierId;
        const date = String(payload.date || '').trim();
        const invoiceNumber = String(payload.invoiceNumber || '').trim();
        const amount = Number(payload.amount ?? 0);
        const paidAmount = Number(payload.paidAmount ?? 0);
        const imgCheck = sanitizeInvoiceImage(payload.invoiceImageDataUrl);

        if (imgCheck.invalid) {
          results.push({ clientOpId, status: 'error', code: 'INVALID_IMAGE', message: 'Invalid invoice image' });
          continue;
        }

        if (!supplierId || !date || !invoiceNumber) {
          results.push({ clientOpId, status: 'error', code: 'REQUIRED_FIELD', message: 'Missing invoice fields' });
          continue;
        }
        const supplier = draftDb.suppliers.find((s) => s.id === supplierId);
        if (!supplier) {
          results.push({ clientOpId, status: 'error', code: 'NOT_FOUND', message: 'Supplier not found' });
          continue;
        }
        if (session.role === 'employee' && supplier.branchId !== session.branchId) {
          results.push({ clientOpId, status: 'error', code: 'BRANCH_FORBIDDEN', message: 'Branch mismatch' });
          continue;
        }
        if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(paidAmount) || paidAmount < 0) {
          results.push({ clientOpId, status: 'error', code: 'NEGATIVE_AMOUNT', message: 'Negative amount' });
          continue;
        }
        if (amount > 0 && paidAmount > amount) {
          results.push({ clientOpId, status: 'error', code: 'PAID_EXCEEDS_AMOUNT', message: 'Paid exceeds amount' });
          continue;
        }
        const duplicate = draftDb.invoices.some(
          (inv) =>
            inv.supplierId === supplierId &&
            inv.invoiceNumber.trim().toLowerCase() === invoiceNumber.toLowerCase()
        );
        if (duplicate) {
          results.push({
            clientOpId,
            status: 'skipped',
            code: 'DUPLICATE_INVOICE',
            message: 'Invoice number already exists for this supplier',
          });
          continue;
        }

        draftDb.invoices = [
          {
            id: generateId('inv'),
            branchId: supplier.branchId || draftDb.branches[0]?.id || DEFAULT_BRANCH_ID,
            supplierId,
            invoiceNumber,
            date,
            amount,
            paidAmount,
            invoiceImageDataUrl: imgCheck.value,
            createdBy: session.displayName,
            createdAt: now,
            updatedAt: now,
          },
          ...draftDb.invoices,
        ];
        hasChanges = true;
        results.push({ clientOpId, status: 'applied' });
      } else if (opType === 'create_shift_sale') {
        if (session.role !== 'manager' && !session.permissions.canRecordShiftsSales) {
          results.push({ clientOpId, status: 'error', code: 'FORBIDDEN', message: 'Permission denied' });
          continue;
        }
        const date = String(payload.date || '').trim();
        const shiftName = String(payload.shiftName || '').trim();
        const salesAmount = Number(payload.salesAmount ?? 0);
        const purchasesAmount = Number(payload.purchasesAmount ?? 0);
        const notes = String(payload.notes || '').trim();

        if (!date || !shiftName) {
          results.push({ clientOpId, status: 'error', code: 'REQUIRED_FIELD', message: 'Missing shift fields' });
          continue;
        }
        if (
          !Number.isFinite(salesAmount) ||
          salesAmount < 0 ||
          !Number.isFinite(purchasesAmount) ||
          purchasesAmount < 0
        ) {
          results.push({ clientOpId, status: 'error', code: 'NEGATIVE_AMOUNT', message: 'Negative amount' });
          continue;
        }

        const defaultBranchId = draftDb.branches[0]?.id || DEFAULT_BRANCH_ID;
        const requestedBranchId = String(payload.branchId || '').trim();
        const branchId =
          session.role === 'employee'
            ? session.branchId!
            : draftDb.branches.some((b) => b.id === requestedBranchId)
              ? requestedBranchId
              : defaultBranchId;

        draftDb.shiftsSales = [
          {
            id: generateId('shift'),
            branchId,
            date,
            shiftName,
            employeeId: session.userId,
            employeeName: session.displayName,
            salesAmount,
            purchasesAmount,
            notes,
            createdAt: now,
            updatedAt: now,
          },
          ...draftDb.shiftsSales,
        ];
        hasChanges = true;
        results.push({ clientOpId, status: 'applied' });
      } else {
        results.push({ clientOpId, status: 'error', code: 'UNSUPPORTED_OP', message: 'Unsupported operation type' });
      }
    }

    try {
      if (hasChanges) {
        await persistActiveDb(draftDb);
      }
      res.json({ results, workspace: buildWorkspaceForSession(session) });
    } catch {
      res.status(500).json({ error: 'DRIVE_SAVE_FAILED', message: 'Failed to save synced operations to Google Drive' });
    }
  });

  // Return structured JSON 404 for unknown /api/* routes instead of HTML fallback
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'API endpoint not found' });
  });

  // Vite Dev Middleware or Static Production Build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });

    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (!result) {
          next();
          return;
        }
        const patchedCode = result.code
          .replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* HMR disabled in Express middlewareMode */'
          )
          .replace(
            'else throw new SendBeforeConnectError("send was called before connect");',
            'else return;'
          );
        res
          .status(200)
          .setHeader('Content-Type', 'application/javascript; charset=utf-8')
          .send(patchedCode);
      } catch {
        next();
      }
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AL EQFAL server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
