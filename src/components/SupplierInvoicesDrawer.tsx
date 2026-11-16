import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Image as ImageIcon, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Language, PurchaseInvoice, SupplierWithStats } from '../types/suppliers';
import { formatCurrency, translations } from '../i18n/translations';

interface SupplierInvoicesDrawerProps {
  supplier: SupplierWithStats | null;
  invoices: PurchaseInvoice[];
  lang: Language;
  isExporting: boolean;
  canCreateInvoice?: boolean;
  canEditInvoice?: boolean;
  canDeleteInvoice?: boolean;
  canExportReports?: boolean;
  onClose: () => void;
  onAddInvoice: (supplierId: string) => void;
  onEditInvoice: (invoice: PurchaseInvoice) => void;
  onDeleteInvoice: (invoice: PurchaseInvoice) => void;
  onExportExcel: (supplier: SupplierWithStats) => void;
  onExportPdf: (supplier: SupplierWithStats) => void;
}

export const SupplierInvoicesDrawer: React.FC<SupplierInvoicesDrawerProps> = ({
  supplier,
  invoices,
  lang,
  isExporting,
  canCreateInvoice = true,
  canEditInvoice = true,
  canDeleteInvoice = true,
  canExportReports = true,
  onClose,
  onAddInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onExportExcel,
  onExportPdf,
}) => {
  const t = translations[lang];
  const [previewInvoice, setPreviewInvoice] = useState<PurchaseInvoice | null>(null);
  if (!supplier) return null;

  const supplierInvoices = invoices
    .filter((inv) => inv.supplierId === supplier.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const hasRowActions = canEditInvoice || canDeleteInvoice || supplierInvoices.some((inv) => Boolean(inv.invoiceImageDataUrl));

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{supplier.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span>{t.colTaxNumber}:</span>
              <span className="font-mono-tabular font-medium text-slate-700" dir="ltr">
                {supplier.taxNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {supplier.invoiceCount} {t.colInvoicesCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canExportReports && (
              <>
                <button
                  type="button"
                  onClick={() => onExportExcel(supplier)}
                  disabled={isExporting}
                  className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>{t.exportExcel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onExportPdf(supplier)}
                  disabled={isExporting}
                  className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-rose-700" />
                  <span>{t.exportPdf}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 divide-x rtl:divide-x-reverse divide-slate-200 bg-slate-50 border-b border-slate-200">
          <div className="px-6 py-4">
            <div className="text-xs text-slate-500">{t.colTotalPurchases}</div>
            <div className="text-base font-bold text-slate-900 tabular-nums mt-1">
              {formatCurrency(supplier.totalPurchases, lang)}
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="text-xs text-slate-500">{t.colTotalPayments}</div>
            <div className="text-base font-bold text-emerald-700 tabular-nums mt-1">
              {formatCurrency(supplier.totalPayments, lang)}
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="text-xs text-slate-500">{t.colTotalDue}</div>
            <div
              className={`text-base font-bold tabular-nums mt-1 ${
                supplier.totalDue > 0 ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              {formatCurrency(supplier.totalDue, lang)}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-900">{t.supplierInvoicesTitle}</h3>
          {canCreateInvoice && (
            <button
              type="button"
              onClick={() => onAddInvoice(supplier.id)}
              className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addInvoiceForSupplier}</span>
            </button>
          )}
        </div>

        {/* Invoices Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {supplierInvoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">{t.noInvoicesForSupplier}</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4 text-start">{t.colInvoiceNumber}</th>
                    <th className="py-3 px-4 text-start">{t.colDate}</th>
                    <th className="py-3 px-4 text-start">{t.colAmount}</th>
                    <th className="py-3 px-4 text-start">{t.colPaid}</th>
                    <th className="py-3 px-4 text-start">{t.colRemaining}</th>
                    {hasRowActions && <th className="py-3 px-4 text-end">{t.colActions}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {supplierInvoices.map((inv) => {
                    const remaining = Math.max(0, inv.amount - inv.paidAmount);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900" dir="ltr">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-600" dir="ltr">
                          {inv.date}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-900">
                          {formatCurrency(inv.amount, lang)}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-emerald-700">
                          {formatCurrency(inv.paidAmount, lang)}
                        </td>
                        <td
                          className={`py-3 px-4 font-mono-tabular font-medium ${
                            remaining > 0 ? 'text-rose-700' : 'text-slate-600'
                          }`}
                        >
                          {formatCurrency(remaining, lang)}
                        </td>
                        {hasRowActions && (
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {inv.invoiceImageDataUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewInvoice(inv)}
                                  className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                  title={t.viewInvoicePhoto}
                                  aria-label={t.viewInvoicePhoto}
                                >
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                              )}
                              {canEditInvoice && (
                                <button
                                  type="button"
                                  onClick={() => onEditInvoice(inv)}
                                  className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                  title={t.editInvoice}
                                  aria-label={t.editInvoice}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canDeleteInvoice && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteInvoice(inv)}
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
        </div>
      </div>

      {previewInvoice && previewInvoice.invoiceImageDataUrl && (
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
                  #{previewInvoice.invoiceNumber} · {previewInvoice.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewInvoice.invoiceImageDataUrl}
                alt={`${t.invoicePhotoPreviewTitle} ${previewInvoice.invoiceNumber}`}
                className="max-w-full max-h-[64vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
