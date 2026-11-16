import React from 'react';
import type { DashboardStats, Language } from '../types/suppliers';
import { formatCurrency, formatNumber, translations } from '../i18n/translations';

interface DashboardStatsBarProps {
  stats: DashboardStats;
  lang: Language;
  isLoading?: boolean;
}

export const DashboardStatsBar: React.FC<DashboardStatsBarProps> = ({
  stats,
  lang,
  isLoading = false,
}) => {
  const t = translations[lang];

  const cards = [
    {
      key: 'suppliers',
      label: t.kpiSuppliersCount,
      value: formatNumber(stats.suppliersCount),
      tone: 'text-slate-900',
    },
    {
      key: 'invoices',
      label: t.kpiInvoicesCount,
      value: formatNumber(stats.invoicesCount),
      tone: 'text-slate-900',
    },
    {
      key: 'purchases',
      label: t.kpiTotalPurchases,
      value: formatCurrency(stats.totalPurchases, lang),
      tone: 'text-slate-900',
    },
    {
      key: 'payments',
      label: t.kpiTotalPayments,
      value: formatCurrency(stats.totalPayments, lang),
      tone: 'text-emerald-700',
    },
    {
      key: 'payables',
      label: t.kpiTotalPayables,
      value: formatCurrency(stats.totalPayables, lang),
      tone: stats.totalPayables > 0 ? 'text-rose-700' : 'text-slate-900',
    },
  ];

  return (
    <section aria-label={t.navDashboard} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3"
        >
          <span className="text-xs font-medium text-slate-500">{card.label}</span>
          {isLoading ? (
            <div className="h-7 w-28 bg-slate-100 rounded animate-pulse" />
          ) : (
            <div className={`text-xl font-bold tabular-nums tracking-tight ${card.tone}`}>
              {card.value}
            </div>
          )}
        </div>
      ))}
    </section>
  );
};
