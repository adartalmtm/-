import React, { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type {
  AuthSession,
  Branch,
  Language,
  ShiftSaleRecord,
} from '../types/suppliers';
import { formatCurrency, formatNumber, translations } from '../i18n/translations';

interface ShiftsSalesViewProps {
  records: ShiftSaleRecord[];
  branches: Branch[];
  session: AuthSession;
  selectedBranchFilter: string;
  lang: Language;
  isSaving: boolean;
  onAddShiftSale: (payload: {
    branchId?: string;
    date: string;
    shiftName: string;
    salesAmount: number;
    purchasesAmount: number;
    notes: string;
  }) => Promise<boolean>;
  onRequestDeleteRecord: (record: ShiftSaleRecord) => void;
}

export const ShiftsSalesView: React.FC<ShiftsSalesViewProps> = ({
  records,
  branches,
  session,
  selectedBranchFilter,
  lang,
  isSaving,
  onAddShiftSale,
  onRequestDeleteRecord,
}) => {
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(today);
  const [shiftName, setShiftName] = useState(t.shiftMorning);
  const [salesInput, setSalesInput] = useState('');
  const [purchasesInput, setPurchasesInput] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = session.role === 'manager' || session.permissions.canRecordShiftsSales;
  const canDelete = session.role === 'manager' || session.permissions.canDeleteData;

  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const visibleRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    if (session.role === 'manager' && selectedBranchFilter !== 'all') {
      return sorted.filter((r) => r.branchId === selectedBranchFilter);
    }
    return sorted;
  }, [records, session.role, selectedBranchFilter]);

  const kpis = useMemo(() => {
    const totalSales = visibleRecords.reduce((acc, r) => acc + (r.salesAmount || 0), 0);
    const totalPurchases = visibleRecords.reduce((acc, r) => acc + (r.purchasesAmount || 0), 0);
    return {
      count: visibleRecords.length,
      totalSales,
      totalPurchases,
      netSales: totalSales - totalPurchases,
    };
  }, [visibleRecords]);

  const openModal = () => {
    const defaultBranch =
      session.role === 'employee'
        ? session.branchId || branches[0]?.id || ''
        : selectedBranchFilter !== 'all'
          ? selectedBranchFilter
          : branches[0]?.id || '';
    setBranchId(defaultBranch);
    setDate(new Date().toISOString().slice(0, 10));
    setShiftName(t.shiftMorning);
    setSalesInput('');
    setPurchasesInput('');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!date.trim() || !shiftName.trim()) {
      setFormError(t.errRequiredField);
      return;
    }

    const salesAmount = salesInput.trim() === '' ? 0 : Number(salesInput);
    const purchasesAmount = purchasesInput.trim() === '' ? 0 : Number(purchasesInput);

    if (
      !Number.isFinite(salesAmount) ||
      salesAmount < 0 ||
      !Number.isFinite(purchasesAmount) ||
      purchasesAmount < 0
    ) {
      setFormError(t.errNegativeAmount);
      return;
    }

    const ok = await onAddShiftSale({
      branchId: session.role === 'manager' ? branchId : undefined,
      date: date.trim(),
      shiftName: shiftName.trim(),
      salesAmount,
      purchasesAmount,
      notes: notes.trim(),
    });

    if (ok) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.shiftsSalesTitle}</h2>
          <p className="text-sm text-slate-500 mt-1">{t.shiftsSalesSubtitle}</p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openModal}
            className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addShiftSaleBtn}</span>
          </button>
        )}
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t.kpiShiftsCount}</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-2">
            {formatNumber(kpis.count)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t.kpiTotalSales}</div>
          <div className="text-xl font-bold text-emerald-700 tabular-nums mt-2">
            {formatCurrency(kpis.totalSales, lang)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t.kpiShiftPurchases}</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-2">
            {formatCurrency(kpis.totalPurchases, lang)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t.kpiNetSales}</div>
          <div
            className={`text-xl font-bold tabular-nums mt-2 ${
              kpis.netSales < 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {formatCurrency(kpis.netSales, lang)}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h3 className="text-base font-bold text-slate-900">{t.navShiftsSales}</h3>
          <span className="text-xs text-slate-500 tabular-nums">
            {t.showingCount}: {formatNumber(visibleRecords.length)}
          </span>
        </div>

        {visibleRecords.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <h4 className="text-base font-semibold text-slate-900">{t.emptyShiftsTitle}</h4>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{t.emptyShiftsDesc}</p>
            {canCreate && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={openModal}
                  className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addShiftSaleBtn}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-5 text-start">{t.colDate}</th>
                  <th className="py-3.5 px-4 text-start">{t.colBranch}</th>
                  <th className="py-3.5 px-4 text-start">{t.colShift}</th>
                  <th className="py-3.5 px-4 text-start">{t.colEmployee}</th>
                  <th className="py-3.5 px-4 text-start">{t.colSales}</th>
                  <th className="py-3.5 px-4 text-start">{t.colShiftPurchases}</th>
                  <th className="py-3.5 px-4 text-start">{t.colNetShift}</th>
                  <th className="py-3.5 px-4 text-start">{t.colNotes}</th>
                  {canDelete && <th className="py-3.5 px-5 text-end">{t.colActions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleRecords.map((rec) => {
                  const net = (rec.salesAmount || 0) - (rec.purchasesAmount || 0);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono-tabular text-slate-700" dir="ltr">
                        {rec.date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {branchNameMap.get(rec.branchId) || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-medium">{rec.shiftName}</td>
                      <td className="py-3.5 px-4 text-slate-700">{rec.employeeName}</td>
                      <td className="py-3.5 px-4 font-mono-tabular font-semibold text-emerald-700">
                        {formatCurrency(rec.salesAmount, lang)}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-slate-900">
                        {formatCurrency(rec.purchasesAmount, lang)}
                      </td>
                      <td
                        className={`py-3.5 px-4 font-mono-tabular font-semibold ${
                          net < 0 ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(net, lang)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {rec.notes || '-'}
                      </td>
                      {canDelete && (
                        <td className="py-3.5 px-5 text-end">
                          <button
                            type="button"
                            onClick={() => onRequestDeleteRecord(rec)}
                            className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                            title={t.deleteSupplier}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add Shift & Sales Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
              <h2 className="text-lg font-bold text-slate-900">{t.shiftModalTitle}</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {session.role === 'manager' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.branchLabel} <span className="text-rose-600">*</span>
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
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.branchLabel}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={session.branchName || ''}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldDate} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldShiftName} <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    required
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value={t.shiftMorning}>{t.shiftMorning}</option>
                    <option value={t.shiftEvening}>{t.shiftEvening}</option>
                    <option value={t.shiftNight}>{t.shiftNight}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldSalesAmount}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salesInput}
                    onChange={(e) => setSalesInput(e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldShiftPurchases}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasesInput}
                    onChange={(e) => setPurchasesInput(e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.fieldNotes}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {formError && (
                <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};
