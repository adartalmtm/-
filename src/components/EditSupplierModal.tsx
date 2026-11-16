import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Language, Supplier } from '../types/suppliers';
import { translations } from '../i18n/translations';

interface EditSupplierModalProps {
  supplier: Supplier | null;
  lang: Language;
  isSaving: boolean;
  onClose: () => void;
  onRequestSave: (supplierId: string, updates: { name: string; taxNumber: string }) => void;
}

export const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  supplier,
  lang,
  isSaving,
  onClose,
  onRequestSave,
}) => {
  const t = translations[lang];
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setTaxNumber(supplier.taxNumber);
      setError(null);
    }
  }, [supplier]);

  if (!supplier) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !taxNumber.trim()) {
      setError(t.errRequiredField);
      return;
    }
    onRequestSave(supplier.id, {
      name: name.trim(),
      taxNumber: taxNumber.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.editSupplierModalTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">{t.editSupplierConfirmHint}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t.fieldSupplierName} <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              required
              dir="ltr"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
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
              className="px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {t.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
