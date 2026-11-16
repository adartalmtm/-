import React, { useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Power, Trash2, UserPlus, X } from 'lucide-react';
import type {
  Branch,
  Language,
  PublicUserAccount,
  UserAccountStatus,
  UserPermissions,
} from '../types/suppliers';
import { formatNumber, translations } from '../i18n/translations';

interface UsersManagementViewProps {
  users: PublicUserAccount[];
  branches: Branch[];
  lang: Language;
  isSaving: boolean;
  onCreateUser: (payload: {
    fullName: string;
    username: string;
    password: string;
    branchId: string;
    status: UserAccountStatus;
    permissions: UserPermissions;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateUser: (
    userId: string,
    payload: {
      fullName?: string;
      username?: string;
      password?: string;
      branchId?: string;
      status?: UserAccountStatus;
      permissions?: UserPermissions;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onRequestDeleteUser: (user: PublicUserAccount) => void;
  onCreateBranch: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateBranch: (branchId: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteBranch: (branchId: string) => Promise<{ ok: boolean; error?: string }>;
}

const DEFAULT_EMPLOYEE_PERMISSIONS: UserPermissions = {
  canRecordShiftsSales: true,
  canViewSuppliers: true,
  canCreateSuppliers: false,
  canCreateInvoices: true,
  canEditInvoices: false,
  canDeleteData: false,
  canExportReports: false,
};

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  users,
  branches,
  lang,
  isSaving,
  onCreateUser,
  onUpdateUser,
  onRequestDeleteUser,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
}) => {
  const t = translations[lang];

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PublicUserAccount | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<UserAccountStatus>('active');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);
  const [userError, setUserError] = useState<string | null>(null);

  // Branches Modal State
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');
  const [branchError, setBranchError] = useState<string | null>(null);

  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const permissionItems: Array<{ key: keyof UserPermissions; label: string }> = [
    { key: 'canRecordShiftsSales', label: t.permRecordShiftsSales },
    { key: 'canViewSuppliers', label: t.permViewSuppliers },
    { key: 'canCreateSuppliers', label: t.permCreateSuppliers },
    { key: 'canCreateInvoices', label: t.permCreateInvoices },
    { key: 'canEditInvoices', label: t.permEditInvoices },
    { key: 'canDeleteData', label: t.permDeleteData },
    { key: 'canExportReports', label: t.permExportReports },
  ];

  const openAddUserModal = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setBranchId(branches[0]?.id || '');
    setStatus('active');
    setPermissions({ ...DEFAULT_EMPLOYEE_PERMISSIONS });
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: PublicUserAccount) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setPassword('');
    setBranchId(user.branchId);
    setStatus(user.status);
    setPermissions({ ...user.permissions });
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    if (!fullName.trim() || !username.trim() || !branchId) {
      setUserError(t.errRequiredField);
      return;
    }

    if (!editingUser && !password) {
      setUserError(t.errRequiredField);
      return;
    }

    if (password && password.length < 4) {
      setUserError(t.errWeakPassword);
      return;
    }

    const res = editingUser
      ? await onUpdateUser(editingUser.id, {
          fullName: fullName.trim(),
          username: username.trim(),
          password: password || undefined,
          branchId,
          status,
          permissions,
        })
      : await onCreateUser({
          fullName: fullName.trim(),
          username: username.trim(),
          password,
          branchId,
          status,
          permissions,
        });

    if (res.ok) {
      setIsUserModalOpen(false);
    } else if (res.error) {
      setUserError(res.error);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchError(null);
    if (!newBranchName.trim()) {
      setBranchError(t.errRequiredField);
      return;
    }
    const res = await onCreateBranch(newBranchName.trim());
    if (res.ok) {
      setNewBranchName('');
    } else if (res.error) {
      setBranchError(res.error);
    }
  };

  const handleSaveBranchRename = async (id: string) => {
    setBranchError(null);
    if (!editingBranchName.trim()) return;
    const res = await onUpdateBranch(id, editingBranchName.trim());
    if (res.ok) {
      setEditingBranchId(null);
    } else if (res.error) {
      setBranchError(res.error);
    }
  };

  const handleDeleteBranchClick = async (id: string) => {
    setBranchError(null);
    const res = await onDeleteBranch(id);
    if (!res.ok && res.error) {
      setBranchError(res.error);
    }
  };

  const summarizePermissions = (perms: UserPermissions) => {
    const enabled = permissionItems.filter((item) => perms[item.key]).map((item) => item.label);
    return enabled.length > 0 ? enabled.join(' · ') : '-';
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.usersPageTitle}</h2>
          <p className="text-sm text-slate-500 mt-1">{t.usersPageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setBranchError(null);
              setIsBranchesModalOpen(true);
            }}
            className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>{t.manageBranchesBtn}</span>
          </button>

          <button
            type="button"
            onClick={openAddUserModal}
            className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.addUserBtn}</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h3 className="text-base font-bold text-slate-900">{t.navUsersManagement}</h3>
          <span className="text-xs text-slate-500 tabular-nums">
            {t.showingCount}: {formatNumber(users.length)}
          </span>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <h4 className="text-base font-semibold text-slate-900">{t.emptyUsersTitle}</h4>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{t.emptyUsersDesc}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={openAddUserModal}
                className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t.addUserBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-5 text-start">{t.fieldEmployeeName}</th>
                    <th className="py-3.5 px-4 text-start">{t.fieldUsername}</th>
                    <th className="py-3.5 px-4 text-start">{t.branchLabel}</th>
                    <th className="py-3.5 px-4 text-start">{t.fieldAccountStatus}</th>
                    <th className="py-3.5 px-4 text-start">{t.fieldPermissions}</th>
                    <th className="py-3.5 px-5 text-end">{t.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{user.fullName}</td>
                      <td className="py-3.5 px-4 font-mono-tabular text-slate-700" dir="ltr">
                        {user.username}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800">
                        {branchNameMap.get(user.branchId) || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            user.status === 'active' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {user.status === 'active' ? t.statusActive : t.statusSuspended}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-md leading-relaxed">
                        {summarizePermissions(user.permissions)}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateUser(user.id, {
                                status: user.status === 'active' ? 'suspended' : 'active',
                              })
                            }
                            disabled={isSaving}
                            className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                              user.status === 'active'
                                ? 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                : 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{user.status === 'active' ? t.toggleSuspend : t.toggleActivate}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditUserModal(user)}
                            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                            title={t.editSupplier}
                            aria-label={t.editSupplier}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDeleteUser(user)}
                            className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                            title={t.deleteSupplier}
                            aria-label={t.deleteSupplier}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {users.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{user.fullName}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-mono-tabular" dir="ltr">
                          {user.username}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{branchNameMap.get(user.branchId) || '-'}</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        user.status === 'active' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {user.status === 'active' ? t.statusActive : t.statusSuspended}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {summarizePermissions(user.permissions)}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateUser(user.id, {
                          status: user.status === 'active' ? 'suspended' : 'active',
                        })
                      }
                      className="flex-1 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                    >
                      {user.status === 'active' ? t.toggleSuspend : t.toggleActivate}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditUserModal(user)}
                      className="px-4 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                    >
                      {t.editSupplier}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteUser(user)}
                      className="px-4 py-2 min-h-[40px] text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg"
                    >
                      {t.deleteSupplier}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Add / Edit User Modal */}
      {isUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editingUser ? t.editUserModalTitle : t.addUserModalTitle}
              </h2>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                disabled={isSaving}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldEmployeeName} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoFocus
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldUsername} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {editingUser ? t.fieldNewPasswordOptional : t.fieldTempPassword}{' '}
                  {!editingUser && <span className="text-rose-600">*</span>}
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldSelectBranch} <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    required
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldAccountStatus}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserAccountStatus)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="active">{t.statusActive}</option>
                    <option value="suspended">{t.statusSuspended}</option>
                  </select>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="pt-2">
                <div className="text-sm font-semibold text-slate-800 mb-2.5">{t.fieldPermissions}</div>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {permissionItems.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[item.key]}
                        onChange={() => handleTogglePermission(item.key)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      />
                      <span className="text-sm text-slate-800">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {userError && (
                <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {userError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60"
                >
                  {isSaving ? t.driveSyncing : t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branches Management Modal */}
      {isBranchesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
              <h2 className="text-lg font-bold text-slate-900">{t.branchesModalTitle}</h2>
              <button
                type="button"
                onClick={() => setIsBranchesModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBranch} className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder={t.addBranchPlaceholder}
                className="flex-1 min-h-[44px] px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addBranchBtn}</span>
              </button>
            </form>

            {branchError && (
              <div className="mb-4 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                {branchError}
              </div>
            )}

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-72 overflow-y-auto">
              {branches.map((branch) => (
                <div key={branch.id} className="px-4 py-3 flex items-center justify-between gap-2">
                  {editingBranchId === branch.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingBranchName}
                        onChange={(e) => setEditingBranchName(e.target.value)}
                        className="flex-1 min-h-[38px] px-2.5 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveBranchRename(branch.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-md"
                      >
                        {t.confirm}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBranchId(null)}
                        className="px-2.5 py-1.5 text-xs text-slate-600"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-slate-900">{branch.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBranchId(branch.id);
                            setEditingBranchName(branch.name);
                            setBranchError(null);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-700 rounded-md"
                          aria-label={t.editSupplier}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {branches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBranchClick(branch.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 rounded-md"
                            aria-label={t.deleteSupplier}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
