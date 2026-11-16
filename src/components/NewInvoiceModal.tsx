import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import type { Language, PurchaseInvoice, Supplier } from '../types/suppliers';
import { formatCurrency, translations } from '../i18n/translations';
import { captureOrSelectInvoiceImage } from '../services/cameraService';

interface NewInvoiceModalProps {
  isOpen: boolean;
  suppliers: Supplier[];
  existingInvoices: PurchaseInvoice[];
  initialSupplierId?: string | null;
  lang: Language;
  isSaving: boolean;
  onClose: () => void;
  onOpenAddSupplier: () => void;
  onSubmit: (data: {
    supplierId: string;
    date: string;
    invoiceNumber: string;
    amount: number;
    paidAmount: number;
    invoiceImageDataUrl?: string;
  }) => Promise<void> | void;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({
  isOpen,
  suppliers,
  existingInvoices,
  initialSupplierId = null,
  lang,
  isSaving,
  onClose,
  onOpenAddSupplier,
  onSubmit,
}) => {
  const t = translations[lang];
  const today = new Date().toISOString().slice(0, 10);

  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(today);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paidInput, setPaidInput] = useState('');
  const [invoiceImageDataUrl, setInvoiceImageDataUrl] = useState<string | undefined>(undefined);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSupplierId(initialSupplierId || (suppliers.length === 1 ? suppliers[0].id : ''));
      setDate(new Date().toISOString().slice(0, 10));
      setInvoiceNumber('');
      setAmountInput('');
      setPaidInput('');
      setInvoiceImageDataUrl(undefined);
      setIsCapturingPhoto(false);
      setError(null);
    }
  }, [isOpen, initialSupplierId, suppliers]);

  const handleCapturePhoto = async () => {
    setError(null);
    setIsCapturingPhoto(true);
    try {
      const captured = await captureOrSelectInvoiceImage();
      if (captured) {
        setInvoiceImageDataUrl(captured);
      }
    } catch {
      setError(t.errCameraFailed);
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId) || null,
    [suppliers, supplierId]
  );

  const parsedAmount = amountInput.trim() === '' ? 0 : Number(amountInput);
  const parsedPaid = paidInput.trim() === '' ? 0 : Number(paidInput);
  const remainingPreview = Math.max(
    0,
    (Number.isFinite(parsedAmount) ? parsedAmount : 0) - (Number.isFinite(parsedPaid) ? parsedPaid : 0)
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId || !date.trim() || !invoiceNumber.trim()) {
      setError(t.errRequiredField);
      return;
    }

    const normalizedInvoiceNo = invoiceNumber.trim().toLowerCase();
    const isDuplicate = existingInvoices.some(
      (inv) =>
        inv.supplierId === supplierId &&
        inv.invoiceNumber.trim().toLowerCase() === normalizedInvoiceNo
    );

    if (isDuplicate) {
      setError(t.errDuplicateInvoiceForSupplier);
      return;
    }

    const finalAmount = amountInput.trim() === '' ? 0 : Number(amountInput);
    const finalPaid = paidInput.trim() === '' ? 0 : Number(paidInput);

    if (!Number.isFinite(finalAmount) || finalAmount < 0 || !Number.isFinite(finalPaid) || finalPaid < 0) {
      setError(t.errNegativeAmount);
      return;
    }

    if (finalAmount > 0 && finalPaid > finalAmount) {
      setError(t.errPaidExceedsAmount);
      return;
    }

    await onSubmit({
      supplierId,
      date: date.trim(),
      invoiceNumber: invoiceNumber.trim(),
      amount: finalAmount,
      paidAmount: finalPaid,
      invoiceImageDataUrl,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.newInvoiceModalTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">{t.newInvoiceModalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {suppliers.length === 0 ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-slate-600">{t.noSuppliersPrompt}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddSupplier();
                }}
                className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
              >
                {t.addNewSupplierBtn}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t.fieldSelectSupplier} <span className="text-rose-600">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setError(null);
                }}
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="">{t.selectSupplierPlaceholder}</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t.fieldTaxNumber}
              </label>
              <input
                type="text"
                readOnly
                value={selectedSupplier ? selectedSupplier.taxNumber : ''}
                placeholder={t.autoFilledTaxNote}
                dir="ltr"
                className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-700 bg-slate-50 border border-slate-200 rounded-lg cursor-default focus:outline-none"
              />
            </div>

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
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.fieldInvoiceNumber} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    setError(null);
                  }}
                  placeholder={t.placeholderInvoiceNumber}
                  required
                  dir="ltr"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldInvoiceAmount}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.fieldPaidAmount}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              {(parsedAmount > 0 || parsedPaid > 0) && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 px-1">
                  <span>{t.fieldRemainingAmount}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {formatCurrency(remainingPreview, lang)}
                  </span>
                </div>
              )}
            </div>

            {/* Camera / Invoice Image Attachment */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label className="block text-sm font-medium text-slate-700">
                {t.attachInvoicePhoto}
              </label>

              {invoiceImageDataUrl ? (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
                  <img
                    src={invoiceImageDataUrl}
                    alt={t.invoicePhotoPreviewTitle}
                    className="w-full max-h-48 object-contain rounded-md bg-white border border-slate-200"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      disabled={isSaving || isCapturingPhoto}
                      className="flex-1 min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4 text-blue-700" />
                      <span>{t.replaceInvoicePhoto}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceImageDataUrl(undefined)}
                      disabled={isSaving || isCapturingPhoto}
                      className="min-h-[40px] px-3 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 inline-flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t.removePhoto}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  disabled={isSaving || isCapturingPhoto}
                  className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-lg hover:bg-slate-100 hover:border-blue-400 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Camera className="w-4 h-4 text-blue-700" />
                  <span>{t.takeOrChoosePhoto}</span>
                </button>
              )}
              <p className="text-xs text-slate-500">{t.invoicePhotoHint}</p>
            </div>

            {error && (
              <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {isSaving ? t.driveSyncing : t.saveAndReturn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
