import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  Archive,
  Building2,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderSync,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  DashboardStats,
  Language,
  PublicUserAccount,
  PurchaseInvoice,
  ShiftSaleRecord,
  Supplier,
  SupplierWithStats,
  UserAccountStatus,
  UserPermissions,
  WorkspacePayload,
} from './types/suppliers';
import { formatCurrency, formatNumber, translations } from './i18n/translations';
import { googleSignIn, logout as googleLogout } from './services/googleAuth';
import {
  ApiError,
  authorizeExport,
  connectManagerDrive,
  createBranch,
  createDriveBackup,
  createPurchaseInvoice,
  createShiftSaleRecord,
  createSupplier,
  createUserAccount,
  deleteBranch,
  deletePurchaseInvoice,
  deleteShiftSaleRecord,
  deleteSupplier,
  deleteUserAccount,
  fetchWorkspace,
  getStoredSessionToken,
  loginEmployee,
  refreshManagerDrive,
  setStoredSessionToken,
  syncOfflineBatch,
  updateBranch,
  updatePurchaseInvoice,
  updateSupplier,
  updateUserAccount,
} from './services/apiClient';
import { exportSuppliersToExcel, exportSuppliersToPdf } from './services/exportService';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  clearCachedWorkspace,
  clearSyncedOperations,
  enqueueOfflineMutation,
  getActiveSessionUserIdHint,
  getCachedWorkspace,
  getPendingQueue,
  setActiveSessionUserIdHint,
  setCachedWorkspace,
} from './services/offlineSync';
import { LoginScreen } from './components/LoginScreen';
import { DashboardStatsBar } from './components/DashboardStatsBar';
import { AddSupplierModal } from './components/AddSupplierModal';
import { EditSupplierModal } from './components/EditSupplierModal';
import { NewInvoiceModal } from './components/NewInvoiceModal';
import { EditInvoiceModal } from './components/EditInvoiceModal';
import { SupplierInvoicesDrawer } from './components/SupplierInvoicesDrawer';
import { ShiftsSalesView } from './components/ShiftsSalesView';
import { UsersManagementView } from './components/UsersManagementView';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

type ActiveSection = 'dashboard' | 'suppliers' | 'invoices' | 'shifts' | 'users';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('al_eqfal_lang');
      return saved === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  });

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('al_eqfal_lang', lang);
    } catch {
      // Ignore storage errors
    }
  }, [lang]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {});
    SplashScreen.hide().catch(() => {});
  }, []);

  // Auth & Workspace State
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Navigation & Filters
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mutation / Sync State
  const isOnline = useOnlineStatus();
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUpDrive, setIsBackingUpDrive] = useState(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Modals & Drawers
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);
  const [previewingInvoicePhoto, setPreviewingInvoicePhoto] = useState<PurchaseInvoice | null>(null);

  // Confirmation Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'primary';
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: () => {},
  });

  const mapApiErrorMessage = useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_CREDENTIALS':
            return t.errInvalidCredentials;
          case 'ACCOUNT_SUSPENDED':
            return t.errAccountSuspended;
          case 'DRIVE_NOT_CONNECTED':
            return t.errDriveNotConnectedSession;
          case 'MANAGER_MISMATCH':
            return t.errManagerMismatch;
          case 'DUPLICATE_USERNAME':
            return t.errDuplicateUsername;
          case 'WEAK_PASSWORD':
            return t.errWeakPassword;
          case 'DUPLICATE_INVOICE':
            return t.errDuplicateInvoiceForSupplier;
          case 'BRANCH_IN_USE':
            return t.errBranchInUse;
          case 'CANNOT_DELETE_LAST_BRANCH':
            return t.errCannotDeleteLastBranch;
          case 'FORBIDDEN':
          case 'BRANCH_FORBIDDEN':
            return t.errPermissionDenied;
          case 'DRIVE_SAVE_FAILED':
            return t.errDriveSaveFailed;
          case 'DRIVE_LOAD_FAILED':
            return t.errDriveLoadFailed;
          default:
            return err.message;
        }
      }
      return t.errDriveSaveFailed;
    },
    [t]
  );

  // Cache authorized workspace per-user for safe offline viewing
  useEffect(() => {
    if (workspace) {
      setCachedWorkspace(workspace);
      setPendingSyncCount(getPendingQueue(workspace.session.userId).length);
    } else {
      setPendingSyncCount(0);
    }
  }, [workspace]);

  // Restore existing app session if present (with offline cache fallback)
  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      const token = getStoredSessionToken();
      if (!token) {
        if (mounted) setIsInitializingSession(false);
        return;
      }

      try {
        const ws = await fetchWorkspace();
        if (mounted) {
          setWorkspace(ws);
          if (ws.session.role === 'employee') {
            setSelectedBranchFilter(ws.session.branchId || 'all');
          }
        }
      } catch (err) {
        if (!(err instanceof ApiError)) {
          const uidHint = getActiveSessionUserIdHint();
          const cached = uidHint ? getCachedWorkspace(uidHint) : null;
          if (cached && mounted) {
            setWorkspace(cached);
            if (cached.session.role === 'employee') {
              setSelectedBranchFilter(cached.session.branchId || 'all');
            }
            setIsInitializingSession(false);
            return;
          }
        }
        setStoredSessionToken(null);
        setActiveSessionUserIdHint(null);
      } finally {
        if (mounted) setIsInitializingSession(false);
      }
    };
    restore();
    return () => {
      mounted = false;
    };
  }, []);

  const handleManagerGoogleLogin = async () => {
    setIsAuthBusy(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        const connected = await connectManagerDrive(res.accessToken);
        setWorkspace(connected.workspace);
        setSelectedBranchFilter('all');
        setActiveSection('dashboard');
      }
    } catch (err) {
      setAuthError(mapApiErrorMessage(err));
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleEmployeeLogin = async (username: string, password: string) => {
    setIsAuthBusy(true);
    setAuthError(null);
    try {
      const loggedIn = await loginEmployee(username, password);
      setWorkspace(loggedIn.workspace);
      setSelectedBranchFilter(loggedIn.workspace.session.branchId || 'all');
      const perms = loggedIn.workspace.session.permissions;
      if (perms.canViewSuppliers || perms.canCreateSuppliers || perms.canCreateInvoices) {
        setActiveSection('dashboard');
      } else {
        setActiveSection('shifts');
      }
    } catch (err) {
      setAuthError(mapApiErrorMessage(err));
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    const wasManager = workspace?.session.role === 'manager';
    const uid = workspace?.session.userId;
    if (uid && getPendingQueue(uid).length === 0) {
      clearCachedWorkspace(uid);
    }
    setActiveSessionUserIdHint(null);
    setStoredSessionToken(null);
    setWorkspace(null);
    setViewingSupplierId(null);
    setEditingSupplier(null);
    setEditingInvoice(null);
    setActionError(null);
    setSyncNotice(null);
    setAuthError(null);
    setSearchQuery('');
    if (wasManager) {
      try {
        await googleLogout();
      } catch {
        // Ignore Firebase sign-out errors
      }
    }
  };

  const handleSessionExpiryOrError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && (err.status === 401 || err.code === 'ACCOUNT_DISABLED')) {
        setStoredSessionToken(null);
        setWorkspace(null);
        setAuthError(mapApiErrorMessage(err));
      } else {
        setActionError(mapApiErrorMessage(err));
      }
    },
    [mapApiErrorMessage]
  );

  const handleRefreshDrive = async () => {
    if (!workspace || workspace.session.role !== 'manager') return;
    setIsRefreshing(true);
    setActionError(null);
    try {
      const ws = await refreshManagerDrive();
      setWorkspace(ws);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'GOOGLE_TOKEN_EXPIRED') {
        try {
          const res = await googleSignIn();
          if (res) {
            const ws = await refreshManagerDrive(res.accessToken);
            setWorkspace(ws);
          }
        } catch (reAuthErr) {
          handleSessionExpiryOrError(reAuthErr);
        }
      } else {
        handleSessionExpiryOrError(err);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReconnectDrive = async () => {
    setIsRefreshing(true);
    setActionError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        const ws = await refreshManagerDrive(res.accessToken);
        setWorkspace(ws);
      }
    } catch (err) {
      handleSessionExpiryOrError(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBackupToDrive = async () => {
    if (!workspace || workspace.session.role !== 'manager') return;
    setIsBackingUpDrive(true);
    setActionError(null);
    setSyncNotice(null);
    try {
      const res = await createDriveBackup();
      setWorkspace(res.workspace);
      setSyncNotice(`${t.backupDriveSuccess}: ${res.fileName}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'GOOGLE_TOKEN_EXPIRED') {
        try {
          const authRes = await googleSignIn();
          if (authRes) {
            const res = await createDriveBackup(authRes.accessToken);
            setWorkspace(res.workspace);
            setSyncNotice(`${t.backupDriveSuccess}: ${res.fileName}`);
          }
        } catch (reAuthErr) {
          handleSessionExpiryOrError(reAuthErr);
        }
      } else {
        handleSessionExpiryOrError(err);
      }
    } finally {
      setIsBackingUpDrive(false);
    }
  };

  const handleSyncOfflineQueue = useCallback(async () => {
    if (!workspace || isSyncingOffline || !isOnline) return;
    const uid = workspace.session.userId;
    const queue = getPendingQueue(uid);
    if (queue.length === 0) return;

    setIsSyncingOffline(true);
    setActionError(null);
    try {
      const res = await syncOfflineBatch(queue);
      const processed = new Set(
        res.results
          .filter((r) => r.status === 'applied' || r.status === 'skipped')
          .map((r) => r.clientOpId)
      );
      const remaining = clearSyncedOperations(uid, processed);
      setPendingSyncCount(remaining.length);
      setWorkspace(res.workspace);
      if (remaining.length === 0) {
        setSyncNotice(t.syncCompleteMsg);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        handleSessionExpiryOrError(err);
      }
    } finally {
      setIsSyncingOffline(false);
    }
  }, [workspace, isSyncingOffline, handleSessionExpiryOrError, t.syncCompleteMsg]);

  useEffect(() => {
    if (isOnline && workspace && getPendingQueue(workspace.session.userId).length > 0) {
      handleSyncOfflineQueue();
    }
  }, [isOnline, workspace?.session.userId, handleSyncOfflineQueue]);

  // Permissions shortcuts
  const session = workspace?.session || null;
  const isManager = session?.role === 'manager';
  const perms = session?.permissions;
  const canViewSuppliers =
    isManager ||
    Boolean(
      perms?.canViewSuppliers ||
        perms?.canCreateSuppliers ||
        perms?.canCreateInvoices ||
        perms?.canEditInvoices
    );
  const canCreateSuppliers = isManager || Boolean(perms?.canCreateSuppliers);
  const canCreateInvoices = isManager || Boolean(perms?.canCreateInvoices);
  const canEditInvoices = isManager || Boolean(perms?.canEditInvoices);
  const canDeleteData = isManager || Boolean(perms?.canDeleteData);
  const canExportReports = isManager || Boolean(perms?.canExportReports);

  // Filtered Suppliers & Invoices by selected branch (for Manager) + search query
  const branches = workspace?.branches || [];
  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const branchScopedSuppliers = useMemo(() => {
    const list = workspace?.suppliers || [];
    if (isManager && selectedBranchFilter !== 'all') {
      return list.filter((s) => s.branchId === selectedBranchFilter);
    }
    return list;
  }, [workspace?.suppliers, isManager, selectedBranchFilter]);

  const branchScopedInvoices = useMemo(() => {
    const list = workspace?.invoices || [];
    if (isManager && selectedBranchFilter !== 'all') {
      return list.filter((inv) => inv.branchId === selectedBranchFilter);
    }
    return list;
  }, [workspace?.invoices, isManager, selectedBranchFilter]);

  const suppliersMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    (workspace?.suppliers || []).forEach((s) => map.set(s.id, s));
    return map;
  }, [workspace?.suppliers]);

  const suppliersWithStats = useMemo<SupplierWithStats[]>(() => {
    return branchScopedSuppliers
      .map((sup) => {
        const supInvoices = branchScopedInvoices
          .filter((inv) => inv.supplierId === sup.id)
          .sort((a, b) => b.date.localeCompare(a.date));

        const totalPurchases = supInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const totalPayments = supInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const totalDue = Math.max(0, totalPurchases - totalPayments);
        const latest = supInvoices[0] || null;

        return {
          ...sup,
          invoiceCount: supInvoices.length,
          totalPurchases,
          totalPayments,
          totalDue,
          lastInvoiceDate: latest ? latest.date : null,
          lastInvoiceNumber: latest ? latest.invoiceNumber : null,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [branchScopedSuppliers, branchScopedInvoices]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return suppliersWithStats;
    return suppliersWithStats.filter(
      (s) => s.name.toLowerCase().includes(q) || s.taxNumber.toLowerCase().includes(q)
    );
  }, [suppliersWithStats, searchQuery]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...branchScopedInvoices].sort((a, b) => b.date.localeCompare(a.date));
    if (!q) return sorted;
    return sorted.filter((inv) => {
      const sup = suppliersMap.get(inv.supplierId);
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (sup && (sup.name.toLowerCase().includes(q) || sup.taxNumber.toLowerCase().includes(q)))
      );
    });
  }, [branchScopedInvoices, suppliersMap, searchQuery]);

  const dashboardStats = useMemo<DashboardStats>(() => {
    const totalPurchases = branchScopedInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalPayments = branchScopedInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    return {
      suppliersCount: branchScopedSuppliers.length,
      invoicesCount: branchScopedInvoices.length,
      totalPurchases,
      totalPayments,
      totalPayables: Math.max(0, totalPurchases - totalPayments),
    };
  }, [branchScopedSuppliers.length, branchScopedInvoices]);

  const viewingSupplier = useMemo(
    () => suppliersWithStats.find((s) => s.id === viewingSupplierId) || null,
    [suppliersWithStats, viewingSupplierId]
  );

  // =========================
  // CRUD Handlers via Backend
  // =========================
  const handleAddSupplier = async (data: {
    name: string;
    taxNumber: string;
    date: string;
    invoiceNumber: string;
  }) => {
    setIsSaving(true);
    setActionError(null);
    const branchToUse =
      isManager && selectedBranchFilter !== 'all' ? selectedBranchFilter : undefined;

    const queueOfflineSupplier = () => {
      if (!workspace) return;
      const now = new Date().toISOString();
      const tempSupId = `offline_sup_${Date.now()}`;
      const branchId =
        workspace.session.role === 'employee'
          ? workspace.session.branchId || workspace.branches[0]?.id || 'branch_main'
          : branchToUse || workspace.branches[0]?.id || 'branch_main';

      const nextQueue = enqueueOfflineMutation(workspace.session.userId, {
        clientOpId: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'create_supplier',
        payload: { ...data, branchId, clientTempId: tempSupId },
      });
      setPendingSyncCount(nextQueue.length);

      const newSupplier: Supplier = {
        id: tempSupId,
        branchId,
        name: data.name,
        taxNumber: data.taxNumber,
        createdAt: now,
        updatedAt: now,
      };
      const initialInvoice: PurchaseInvoice = {
        id: `offline_inv_${Date.now()}`,
        branchId,
        supplierId: tempSupId,
        invoiceNumber: data.invoiceNumber,
        date: data.date,
        amount: 0,
        paidAmount: 0,
        createdBy: workspace.session.displayName,
        createdAt: now,
        updatedAt: now,
      };
      setWorkspace({
        ...workspace,
        suppliers: [newSupplier, ...workspace.suppliers],
        invoices: [initialInvoice, ...workspace.invoices],
      });
      setSyncNotice(t.savedOfflineQueued);
      setIsAddSupplierOpen(false);
    };

    if (!navigator.onLine) {
      queueOfflineSupplier();
      setIsSaving(false);
      return;
    }

    try {
      const ws = await createSupplier({ ...data, branchId: branchToUse });
      setWorkspace(ws);
      setIsAddSupplierOpen(false);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        queueOfflineSupplier();
      } else {
        handleSessionExpiryOrError(err);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestEditSupplier = (
    supplierId: string,
    updates: { name: string; taxNumber: string }
  ) => {
    setConfirmState({
      isOpen: true,
      title: t.confirmUpdateDriveTitle,
      message: t.confirmUpdateDriveBody,
      variant: 'primary',
      onConfirm: async () => {
        setIsSaving(true);
        setActionError(null);
        try {
          const ws = await updateSupplier(supplierId, updates);
          setWorkspace(ws);
          setEditingSupplier(null);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleSessionExpiryOrError(err);
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  const handleRequestDeleteSupplier = (supplier: SupplierWithStats) => {
    setConfirmState({
      isOpen: true,
      title: t.confirmDeleteSupplierTitle,
      message: `${t.confirmDeleteSupplierBody} (${supplier.name} · ${supplier.invoiceCount} ${t.colInvoicesCount})`,
      variant: 'danger',
      onConfirm: async () => {
        setIsSaving(true);
        setActionError(null);
        try {
          const ws = await deleteSupplier(supplier.id);
          setWorkspace(ws);
          if (viewingSupplierId === supplier.id) {
            setViewingSupplierId(null);
          }
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleSessionExpiryOrError(err);
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  const handleAddInvoice = async (data: {
    supplierId: string;
    date: string;
    invoiceNumber: string;
    amount: number;
    paidAmount: number;
    invoiceImageDataUrl?: string;
  }) => {
    setIsSaving(true);
    setActionError(null);

    const queueOfflineInvoice = () => {
      if (!workspace) return;
      const duplicate = workspace.invoices.some(
        (inv) =>
          inv.supplierId === data.supplierId &&
          inv.invoiceNumber.trim().toLowerCase() === data.invoiceNumber.trim().toLowerCase()
      );
      if (duplicate) {
        setActionError(t.errDuplicateInvoiceForSupplier);
        return;
      }
      const now = new Date().toISOString();
      const supplier = workspace.suppliers.find((s) => s.id === data.supplierId);
      const branchId = supplier?.branchId || workspace.session.branchId || workspace.branches[0]?.id || 'branch_main';
      const nextQueue = enqueueOfflineMutation(workspace.session.userId, {
        clientOpId: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'create_invoice',
        payload: data,
      });
      setPendingSyncCount(nextQueue.length);

      const newInvoice: PurchaseInvoice = {
        id: `offline_inv_${Date.now()}`,
        branchId,
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber,
        date: data.date,
        amount: data.amount,
        paidAmount: data.paidAmount,
        invoiceImageDataUrl: data.invoiceImageDataUrl,
        createdBy: workspace.session.displayName,
        createdAt: now,
        updatedAt: now,
      };
      setWorkspace({
        ...workspace,
        invoices: [newInvoice, ...workspace.invoices],
      });
      setSyncNotice(t.savedOfflineQueued);
      setIsNewInvoiceOpen(false);
      setPreselectedSupplierId(null);
    };

    if (!isOnline) {
      queueOfflineInvoice();
      setIsSaving(false);
      return;
    }

    try {
      const ws = await createPurchaseInvoice(data);
      setWorkspace(ws);
      setIsNewInvoiceOpen(false);
      setPreselectedSupplierId(null);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        queueOfflineInvoice();
      } else {
        handleSessionExpiryOrError(err);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestEditInvoice = (
    invoiceId: string,
    updates: {
      invoiceNumber: string;
      date: string;
      amount: number;
      paidAmount: number;
      invoiceImageDataUrl?: string | null;
    }
  ) => {
    setConfirmState({
      isOpen: true,
      title: t.confirmUpdateDriveTitle,
      message: t.confirmUpdateDriveBody,
      variant: 'primary',
      onConfirm: async () => {
        setIsSaving(true);
        setActionError(null);
        try {
          const ws = await updatePurchaseInvoice(invoiceId, updates);
          setWorkspace(ws);
          setEditingInvoice(null);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleSessionExpiryOrError(err);
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  const handleRequestDeleteInvoice = (invoice: PurchaseInvoice) => {
    const supName = suppliersMap.get(invoice.supplierId)?.name || '';
    setConfirmState({
      isOpen: true,
      title: t.confirmDeleteInvoiceTitle,
      message: `${t.confirmDeleteInvoiceBody} (#${invoice.invoiceNumber}${supName ? ` - ${supName}` : ''})`,
      variant: 'danger',
      onConfirm: async () => {
        setIsSaving(true);
        setActionError(null);
        try {
          const ws = await deletePurchaseInvoice(invoice.id);
          setWorkspace(ws);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleSessionExpiryOrError(err);
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  // Shifts & Sales Handlers
  const handleAddShiftSale = async (payload: {
    branchId?: string;
    date: string;
    shiftName: string;
    salesAmount: number;
    purchasesAmount: number;
    notes: string;
  }): Promise<boolean> => {
    setIsSaving(true);
    setActionError(null);

    const queueOfflineShift = (): boolean => {
      if (!workspace) return false;
      const now = new Date().toISOString();
      const branchId =
        workspace.session.role === 'employee'
          ? workspace.session.branchId || workspace.branches[0]?.id || 'branch_main'
          : payload.branchId || workspace.branches[0]?.id || 'branch_main';

      const nextQueue = enqueueOfflineMutation(workspace.session.userId, {
        clientOpId: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'create_shift_sale',
        payload: { ...payload, branchId },
      });
      setPendingSyncCount(nextQueue.length);

      const newRec: ShiftSaleRecord = {
        id: `offline_shift_${Date.now()}`,
        branchId,
        date: payload.date,
        shiftName: payload.shiftName,
        employeeId: workspace.session.userId,
        employeeName: workspace.session.displayName,
        salesAmount: payload.salesAmount,
        purchasesAmount: payload.purchasesAmount,
        notes: payload.notes,
        createdAt: now,
        updatedAt: now,
      };
      setWorkspace({
        ...workspace,
        shiftsSales: [newRec, ...workspace.shiftsSales],
      });
      setSyncNotice(t.savedOfflineQueued);
      return true;
    };

    if (!navigator.onLine) {
      const ok = queueOfflineShift();
      setIsSaving(false);
      return ok;
    }

    try {
      const ws = await createShiftSaleRecord(payload);
      setWorkspace(ws);
      return true;
    } catch (err) {
      if (!(err instanceof ApiError)) {
        return queueOfflineShift();
      }
      handleSessionExpiryOrError(err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeleteShiftSale = (record: ShiftSaleRecord) => {
    setConfirmState({
      isOpen: true,
      title: t.confirmDeleteShiftTitle,
      message: `${t.confirmDeleteShiftBody} (${record.date} · ${record.shiftName})`,
      variant: 'danger',
      onConfirm: async () => {
        setIsSaving(true);
        setActionError(null);
        try {
          const ws = await deleteShiftSaleRecord(record.id);
          setWorkspace(ws);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleSessionExpiryOrError(err);
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  // Users & Branches Management Handlers (Manager Only)
  const handleCreateUser = async (payload: {
    fullName: string;
    username: string;
    password: string;
    branchId: string;
    status: UserAccountStatus;
    permissions: UserPermissions;
  }) => {
    setIsSaving(true);
    try {
      const ws = await createUserAccount(payload);
      setWorkspace(ws);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapApiErrorMessage(err) };
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    payload: {
      fullName?: string;
      username?: string;
      password?: string;
      branchId?: string;
      status?: UserAccountStatus;
      permissions?: UserPermissions;
    }
  ) => {
    setIsSaving(true);
    try {
      const ws = await updateUserAccount(userId, payload);
      setWorkspace(ws);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapApiErrorMessage(err) };
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeleteUser = (user: PublicUserAccount) => {
    setConfirmState({
      isOpen: true,
      title: t.confirmDeleteUserTitle,
      message: `${t.confirmDeleteUserBody} (${user.fullName} · ${user.username})`,
      variant: 'danger',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const ws = await deleteUserAccount(user.id);
          setWorkspace(ws);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleSessionExpiryOrError(err);
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  const handleCreateBranch = async (name: string) => {
    setIsSaving(true);
    try {
      const ws = await createBranch(name);
      setWorkspace(ws);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapApiErrorMessage(err) };
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBranch = async (branchId: string, name: string) => {
    setIsSaving(true);
    try {
      const ws = await updateBranch(branchId, name);
      setWorkspace(ws);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapApiErrorMessage(err) };
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    setIsSaving(true);
    try {
      const ws = await deleteBranch(branchId);
      setWorkspace(ws);
      if (selectedBranchFilter === branchId) {
        setSelectedBranchFilter('all');
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapApiErrorMessage(err) };
    } finally {
      setIsSaving(false);
    }
  };

  // Exports (Server-verified RBAC before downloading)
  const handleExportExcel = async (singleSupplier?: SupplierWithStats) => {
    setIsExporting(true);
    setActionError(null);
    try {
      await authorizeExport();
      await exportSuppliersToExcel({
        suppliers: filteredSuppliers,
        invoices: branchScopedInvoices,
        allSuppliersMap: suppliersMap,
        lang,
        singleSupplier: singleSupplier || null,
      });
    } catch (err) {
      handleSessionExpiryOrError(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async (singleSupplier?: SupplierWithStats) => {
    setIsExporting(true);
    setActionError(null);
    try {
      await authorizeExport();
      await exportSuppliersToPdf({
        suppliers: filteredSuppliers,
        invoices: branchScopedInvoices,
        allSuppliersMap: suppliersMap,
        stats: dashboardStats,
        lang,
        managerEmail: session?.email || session?.displayName || null,
        singleSupplier: singleSupplier || null,
      });
    } catch (err) {
      handleSessionExpiryOrError(err);
    } finally {
      setIsExporting(false);
    }
  };

  const openNewInvoiceModal = (supplierId?: string) => {
    setPreselectedSupplierId(supplierId || null);
    setIsNewInvoiceOpen(true);
  };

  // Session Restoration Loading Screen
  if (isInitializingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-600">{t.loadingData}</div>
      </div>
    );
  }

  // Unauthenticated -> Show Clean Login Screen (Manager Google Sign-In + Employee Username/Password)
  if (!workspace || !session) {
    return (
      <LoginScreen
        lang={lang}
        onChangeLang={setLang}
        onManagerGoogleLogin={handleManagerGoogleLogin}
        onEmployeeLogin={handleEmployeeLogin}
        isLoading={isAuthBusy}
        error={authError}
        onClearError={() => setAuthError(null)}
      />
    );
  }

  const navTabs: Array<{
    key: ActiveSection;
    label: string;
    visible: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'dashboard', label: t.navDashboard, visible: canViewSuppliers, icon: LayoutDashboard },
    { key: 'suppliers', label: t.navSuppliers, visible: canViewSuppliers, icon: Building2 },
    { key: 'invoices', label: t.navInvoices, visible: canViewSuppliers, icon: Receipt },
    { key: 'shifts', label: t.navShiftsSales, visible: true, icon: Clock },
    { key: 'users', label: t.navUsersManagement, visible: isManager, icon: Users },
  ];

  const visibleTabs = navTabs.filter((tab) => tab.visible);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 safe-pt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element Brand wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection(canViewSuppliers ? 'dashboard' : 'shifts');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            {t.brandTitle}
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSection(tab.key)}
                className={`py-2 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeSection === tab.key
                    ? 'border-blue-700 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            {canCreateInvoices ? (
              <button
                type="button"
                onClick={() => openNewInvoiceModal()}
                className="px-4 py-2.5 min-h-[42px] text-xs sm:text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{t.newPurchaseInvoiceBtn}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.signOut}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:py-8 space-y-6">
        {/* Workspace Header & Controls Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.sectionTitle}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
              <span className="font-medium text-slate-800">{session.displayName}</span>
              <span aria-hidden="true">·</span>
              <span>{isManager ? t.roleManagerLabel : t.roleEmployeeLabel}</span>
              {!isManager && session.branchName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t.branchLabel}: {session.branchName}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Manager Branch Filter */}
            {isManager && branches.length > 0 && (
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                aria-label={t.branchLabel}
                className="min-h-[42px] px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">{t.allBranches}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Language Switcher */}
            <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setLang('ar')}
                className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  lang === 'ar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.languageArabic}
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  lang === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.languageEnglish}
              </button>
            </div>

            {/* Add New Supplier (if permitted) */}
            {canCreateSuppliers && activeSection !== 'users' && activeSection !== 'shifts' && (
              <button
                type="button"
                onClick={() => setIsAddSupplierOpen(true)}
                className="px-4 py-2.5 min-h-[42px] text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-blue-700" />
                <span>{t.addNewSupplierBtn}</span>
              </button>
            )}

            {/* PWA Mobile/Desktop Install Button */}
            <PWAInstallButton lang={lang} />

            {/* Sign Out */}
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2.5 min-h-[42px] text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.signOut}</span>
            </button>
          </div>
        </div>

        {/* Mobile Section Switcher */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSection === tab.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Manager-only Google Drive Sync Bar */}
        {isManager && (
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
              <FolderSync
                className={`w-4 h-4 shrink-0 ${
                  workspace.driveSyncStatus === 'connected' ? 'text-emerald-700' : 'text-amber-600'
                }`}
              />
              <span className="font-semibold text-slate-900">
                {workspace.driveSyncStatus === 'connected'
                  ? t.driveConnected
                  : t.driveTokenExpiredWarning}
              </span>
              {session.email && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-slate-700" dir="ltr">
                    {session.email}
                  </span>
                </>
              )}
              {isSaving ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-blue-700 font-medium">{t.driveSyncing}</span>
                </>
              ) : workspace.lastSyncedAt ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">
                    {t.driveLastSaved}:{' '}
                    {new Date(workspace.lastSyncedAt).toLocaleTimeString(
                      lang === 'ar' ? 'ar-SA' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {workspace.driveSyncStatus !== 'connected' ? (
                <button
                  type="button"
                  onClick={handleReconnectDrive}
                  disabled={isRefreshing || !isOnline}
                  className="px-3.5 py-1.5 min-h-[38px] text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap disabled:opacity-60"
                >
                  {t.reconnectDrive}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBackupToDrive}
                    disabled={isBackingUpDrive || isRefreshing || isSaving || !isOnline}
                    className="px-3 py-1.5 min-h-[38px] text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{isBackingUpDrive ? t.backingUpDrive : t.backupToDrive}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshDrive}
                    disabled={isRefreshing || isSaving || !isOnline}
                    className="px-3 py-1.5 min-h-[38px] text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{t.refreshFromDrive}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Offline Mode & Pending Safe Sync Banner */}
        <OfflineIndicator
          lang={lang}
          isOnline={isOnline}
          pendingCount={pendingSyncCount}
          isSyncing={isSyncingOffline}
          onSyncNow={handleSyncOfflineQueue}
        />

        {syncNotice && (
          <div className="p-3.5 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
            <span>{syncNotice}</span>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              className="text-xs font-semibold text-emerald-800 underline"
            >
              {t.close}
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-4">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-semibold text-rose-800 underline"
            >
              {t.close}
            </button>
          </div>
        )}

        {/* Section Routing */}
        {activeSection === 'users' && isManager ? (
          <UsersManagementView
            users={workspace.users}
            branches={branches}
            lang={lang}
            isSaving={isSaving}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onRequestDeleteUser={handleRequestDeleteUser}
            onCreateBranch={handleCreateBranch}
            onUpdateBranch={handleUpdateBranch}
            onDeleteBranch={handleDeleteBranch}
          />
        ) : activeSection === 'shifts' ? (
          <ShiftsSalesView
            records={workspace.shiftsSales}
            branches={branches}
            session={session}
            selectedBranchFilter={selectedBranchFilter}
            lang={lang}
            isSaving={isSaving}
            onAddShiftSale={handleAddShiftSale}
            onRequestDeleteRecord={handleRequestDeleteShiftSale}
          />
        ) : !canViewSuppliers ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
            {t.noSupplierViewPermission}
          </div>
        ) : (
          <>
            {/* KPI Dashboard (5 cards) */}
            <DashboardStatsBar stats={dashboardStats} lang={lang} />

            {/* Search & Export Toolbar */}
            <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full min-h-[44px] ps-10 pe-4 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canCreateInvoices && (
                  <button
                    type="button"
                    onClick={() => openNewInvoiceModal()}
                    className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.newPurchaseInvoiceBtn}</span>
                  </button>
                )}
                {canExportReports && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportExcel()}
                      disabled={isExporting || branchScopedSuppliers.length === 0}
                      className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>{isExporting ? t.exporting : t.exportExcel}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportPdf()}
                      disabled={isExporting || branchScopedSuppliers.length === 0}
                      className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4 text-rose-700" />
                      <span>{isExporting ? t.exporting : t.exportPdf}</span>
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Suppliers Directory or All Invoices View */}
            {activeSection !== 'invoices' ? (
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <h2 className="text-base font-bold text-slate-900">{t.allSuppliersTitle}</h2>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {t.showingCount}: {formatNumber(filteredSuppliers.length)}
                  </span>
                </div>

                {branchScopedSuppliers.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <h3 className="text-base font-semibold text-slate-900">{t.emptySuppliersTitle}</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">{t.emptySuppliersDesc}</p>
                    {canCreateSuppliers && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddSupplierOpen(true)}
                          className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{t.addNewSupplierBtn}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : filteredSuppliers.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <h3 className="text-base font-semibold text-slate-900">{t.emptySearchTitle}</h3>
                    <p className="text-sm text-slate-500">{t.emptySearchDesc}</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                            <th className="py-3.5 px-5 text-start">{t.colSupplierName}</th>
                            <th className="py-3.5 px-4 text-start">{t.colTaxNumber}</th>
                            {isManager && branches.length > 1 && (
                              <th className="py-3.5 px-4 text-start">{t.colBranch}</th>
                            )}
                            <th className="py-3.5 px-4 text-center">{t.colInvoicesCount}</th>
                            <th className="py-3.5 px-4 text-start">{t.colTotalPurchases}</th>
                            <th className="py-3.5 px-4 text-start">{t.colTotalPayments}</th>
                            <th className="py-3.5 px-4 text-start">{t.colTotalDue}</th>
                            <th className="py-3.5 px-4 text-start">{t.colLastInvoice}</th>
                            <th className="py-3.5 px-5 text-end">{t.colActions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredSuppliers.map((supplier) => (
                            <tr key={supplier.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-5 font-semibold text-slate-900">
                                <button
                                  type="button"
                                  onClick={() => setViewingSupplierId(supplier.id)}
                                  className="hover:text-blue-700 hover:underline text-start"
                                >
                                  {supplier.name}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 font-mono-tabular text-slate-700" dir="ltr">
                                {supplier.taxNumber}
                              </td>
                              {isManager && branches.length > 1 && (
                                <td className="py-3.5 px-4 text-xs text-slate-600">
                                  {branchNameMap.get(supplier.branchId || '') || '-'}
                                </td>
                              )}
                              <td className="py-3.5 px-4 font-mono-tabular text-center text-slate-900">
                                {formatNumber(supplier.invoiceCount)}
                              </td>
                              <td className="py-3.5 px-4 font-mono-tabular text-slate-900">
                                {formatCurrency(supplier.totalPurchases, lang)}
                              </td>
                              <td className="py-3.5 px-4 font-mono-tabular text-emerald-700">
                                {formatCurrency(supplier.totalPayments, lang)}
                              </td>
                              <td
                                className={`py-3.5 px-4 font-mono-tabular font-semibold ${
                                  supplier.totalDue > 0 ? 'text-rose-700' : 'text-slate-700'
                                }`}
                              >
                                {formatCurrency(supplier.totalDue, lang)}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-600 font-mono-tabular" dir="ltr">
                                {supplier.lastInvoiceNumber
                                  ? `${supplier.lastInvoiceNumber} · ${supplier.lastInvoiceDate}`
                                  : '-'}
                              </td>
                              <td className="py-3.5 px-5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSupplierId(supplier.id)}
                                    className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{t.viewInvoices}</span>
                                  </button>
                                  {canEditInvoices && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingSupplier(supplier)}
                                      className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                      title={t.editSupplier}
                                      aria-label={t.editSupplier}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canDeleteData && (
                                    <button
                                      type="button"
                                      onClick={() => handleRequestDeleteSupplier(supplier)}
                                      className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                      title={t.deleteSupplier}
                                      aria-label={t.deleteSupplier}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked List */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {filteredSuppliers.map((supplier) => (
                        <div key={supplier.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold text-slate-900 text-base">{supplier.name}</div>
                              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                <span className="font-mono-tabular" dir="ltr">
                                  {supplier.taxNumber}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {formatNumber(supplier.invoiceCount)} {t.colInvoicesCount}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                            <div>
                              <div className="text-slate-500">{t.colTotalPurchases}</div>
                              <div className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                                {formatCurrency(supplier.totalPurchases, lang)}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500">{t.colTotalPayments}</div>
                              <div className="font-mono-tabular font-semibold text-emerald-700 mt-0.5">
                                {formatCurrency(supplier.totalPayments, lang)}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500">{t.colTotalDue}</div>
                              <div
                                className={`font-mono-tabular font-semibold mt-0.5 ${
                                  supplier.totalDue > 0 ? 'text-rose-700' : 'text-slate-900'
                                }`}
                              >
                                {formatCurrency(supplier.totalDue, lang)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setViewingSupplierId(supplier.id)}
                              className="flex-1 py-2.5 min-h-[44px] text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 inline-flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-4 h-4" />
                              <span>{t.viewInvoices}</span>
                            </button>
                            {canEditInvoices && (
                              <button
                                type="button"
                                onClick={() => setEditingSupplier(supplier)}
                                className="px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                              >
                                {t.editSupplier}
                              </button>
                            )}
                            {canDeleteData && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteSupplier(supplier)}
                                className="px-4 py-2.5 min-h-[44px] text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50"
                              >
                                {t.deleteSupplier}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ) : (
              /* All Purchase Invoices Ledger View */
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <h2 className="text-base font-bold text-slate-900">{t.allInvoicesTitle}</h2>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {t.showingCount}: {formatNumber(filteredInvoices.length)}
                  </span>
                </div>

                {filteredInvoices.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <h3 className="text-base font-semibold text-slate-900">{t.emptyInvoicesTitle}</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">{t.emptyInvoicesDesc}</p>
                    {canCreateInvoices && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => openNewInvoiceModal()}
                          className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{t.newPurchaseInvoiceBtn}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-3.5 px-5 text-start">{t.colInvoiceNumber}</th>
                          <th className="py-3.5 px-4 text-start">{t.colDate}</th>
                          <th className="py-3.5 px-4 text-start">{t.colSupplierName}</th>
                          <th className="py-3.5 px-4 text-start">{t.colTaxNumber}</th>
                          <th className="py-3.5 px-4 text-start">{t.colAmount}</th>
                          <th className="py-3.5 px-4 text-start">{t.colPaid}</th>
                          <th className="py-3.5 px-4 text-start">{t.colRemaining}</th>
                          {(canEditInvoices || canDeleteData || filteredInvoices.some((inv) => Boolean(inv.invoiceImageDataUrl))) && (
                            <th className="py-3.5 px-5 text-end">{t.colActions}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredInvoices.map((inv) => {
                          const sup = suppliersMap.get(inv.supplierId);
                          const remaining = Math.max(0, inv.amount - inv.paidAmount);
                          const showActionCell =
                            canEditInvoices ||
                            canDeleteData ||
                            filteredInvoices.some((item) => Boolean(item.invoiceImageDataUrl));
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-5 font-mono-tabular font-semibold text-slate-900" dir="ltr">
                                {inv.invoiceNumber}
                              </td>
                              <td className="py-3.5 px-4 font-mono-tabular text-slate-600" dir="ltr">
                                {inv.date}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-900">
                                {sup ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingSupplierId(sup.id)}
                                    className="hover:text-blue-700 hover:underline text-start"
                                  >
                                    {sup.name}
                                  </button>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono-tabular text-slate-600" dir="ltr">
                                {sup?.taxNumber || '-'}
                              </td>
                              <td className="py-3.5 px-4 font-mono-tabular text-slate-900">
                                {formatCurrency(inv.amount, lang)}
                              </td>
                              <td className="py-3.5 px-4 font-mono-tabular text-emerald-700">
                                {formatCurrency(inv.paidAmount, lang)}
                              </td>
                              <td
                                className={`py-3.5 px-4 font-mono-tabular font-semibold ${
                                  remaining > 0 ? 'text-rose-700' : 'text-slate-700'
                                }`}
                              >
                                {formatCurrency(remaining, lang)}
                              </td>
                              {showActionCell && (
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {inv.invoiceImageDataUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewingInvoicePhoto(inv)}
                                        className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                        title={t.viewInvoicePhoto}
                                        aria-label={t.viewInvoicePhoto}
                                      >
                                        <ImageIcon className="w-4 h-4" />
                                      </button>
                                    )}
                                    {canEditInvoices && (
                                      <button
                                        type="button"
                                        onClick={() => setEditingInvoice(inv)}
                                        className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                        title={t.editInvoice}
                                        aria-label={t.editInvoice}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                    )}
                                    {canDeleteData && (
                                      <button
                                        type="button"
                                        onClick={() => handleRequestDeleteInvoice(inv)}
                                        className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                        title={t.deleteInvoice}
                                        aria-label={t.deleteInvoice}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 safe-pb"
      >
        <div className="flex items-stretch justify-around px-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSection(tab.key)}
                className={`flex-1 py-2 px-1 min-h-[54px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[74px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals & Drawers */}
      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        lang={lang}
        isSaving={isSaving}
        onClose={() => setIsAddSupplierOpen(false)}
        onSubmit={handleAddSupplier}
      />

      <EditSupplierModal
        supplier={editingSupplier}
        lang={lang}
        isSaving={isSaving}
        onClose={() => setEditingSupplier(null)}
        onRequestSave={handleRequestEditSupplier}
      />

      <NewInvoiceModal
        isOpen={isNewInvoiceOpen}
        suppliers={branchScopedSuppliers}
        existingInvoices={branchScopedInvoices}
        initialSupplierId={preselectedSupplierId}
        lang={lang}
        isSaving={isSaving}
        onClose={() => {
          setIsNewInvoiceOpen(false);
          setPreselectedSupplierId(null);
        }}
        onOpenAddSupplier={() => {
          if (canCreateSuppliers) {
            setIsAddSupplierOpen(true);
          }
        }}
        onSubmit={handleAddInvoice}
      />

      <EditInvoiceModal
        invoice={editingInvoice}
        supplierName={editingInvoice ? suppliersMap.get(editingInvoice.supplierId)?.name || '' : ''}
        existingInvoices={branchScopedInvoices}
        lang={lang}
        isSaving={isSaving}
        onClose={() => setEditingInvoice(null)}
        onRequestSave={handleRequestEditInvoice}
      />

      <SupplierInvoicesDrawer
        supplier={viewingSupplier}
        invoices={branchScopedInvoices}
        lang={lang}
        isExporting={isExporting}
        canCreateInvoice={canCreateInvoices}
        canEditInvoice={canEditInvoices}
        canDeleteInvoice={canDeleteData}
        canExportReports={canExportReports}
        onClose={() => setViewingSupplierId(null)}
        onAddInvoice={(supplierId) => openNewInvoiceModal(supplierId)}
        onEditInvoice={(inv) => setEditingInvoice(inv)}
        onDeleteInvoice={handleRequestDeleteInvoice}
        onExportExcel={(sup) => handleExportExcel(sup)}
        onExportPdf={(sup) => handleExportPdf(sup)}
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        variant={confirmState.variant}
        isProcessing={isSaving}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {previewingInvoicePhoto && previewingInvoicePhoto.invoiceImageDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{t.invoicePhotoPreviewTitle}</h4>
                <p className="text-xs text-slate-500 font-mono-tabular mt-0.5" dir="ltr">
                  #{previewingInvoicePhoto.invoiceNumber} · {previewingInvoicePhoto.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingInvoicePhoto(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewingInvoicePhoto.invoiceImageDataUrl}
                alt={`${t.invoicePhotoPreviewTitle} ${previewingInvoicePhoto.invoiceNumber}`}
                className="max-w-full max-h-[64vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
