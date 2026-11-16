import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Language } from '../types/suppliers';
import { translations } from '../i18n/translations';

interface AddSupplierModalProps {
  isOpen: boolean;
  lang: Language;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    taxNumber: string;
    date: string;
    invoiceNumber: string;
  }) => Promise<void> | void;
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  lang,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const t = translations[lang];
  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [date, setDate] = useState(today);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTaxNumber('');
      setDate(new Date().toISOString().slice(0, 10));
      setInvoiceNumber('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !taxNumber.trim() || !date.trim() || !invoiceNumber.trim()) {
      setError(t.errRequiredField);
      return;
    }

    await onSubmit({
      name: name.trim(),
      taxNumber: taxNumber.trim(),
      date: date.trim(),
      invoiceNumber: invoiceNumber.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.addSupplierModalTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">{t.addSupplierModalHint}</p>
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

        {/* Strictly the 4 requested fields only */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t.fieldSupplierName} <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.placeholderSupplierName}
              required
              autoFocus
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t.fieldTaxNumber} <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder={t.placeholderTaxNumber}
              required
              dir="ltr"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
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
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={t.placeholderInvoiceNumber}
                required
                dir="ltr"
                className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
              {isSaving ? t.driveSyncing : t.saveSupplier}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
