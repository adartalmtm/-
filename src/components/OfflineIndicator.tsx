import React from 'react';
import { RefreshCw, WifiOff, CloudUpload } from 'lucide-react';
import type { Language } from '../types/suppliers';
import { formatNumber, translations } from '../i18n/translations';

interface OfflineIndicatorProps {
  lang: Language;
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  lang,
  isOnline,
  pendingCount,
  isSyncing,
  onSyncNow,
}) => {
  const t = translations[lang];

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`border rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 ${
        !isOnline
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-blue-50 border-blue-200 text-blue-900'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3 text-xs sm:text-sm">
        {!isOnline ? (
          <WifiOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
        ) : (
          <CloudUpload className="w-4 h-4 text-blue-700 shrink-0 mt-0.5 sm:mt-0" />
        )}
        <div>
          <span className="font-semibold">
            {!isOnline ? t.offlineModeTitle : `${t.pendingSyncLabel}: ${formatNumber(pendingCount)}`}
          </span>
          {!isOnline && (
            <span className="ms-2 text-amber-800">
              {t.offlineModeDesc}
              {pendingCount > 0 ? ` (${formatNumber(pendingCount)} ${t.pendingSyncLabel})` : ''}
            </span>
          )}
        </div>
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          className="px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? t.syncingNowBtn : t.syncNowBtn}</span>
        </button>
      )}
    </div>
  );
};
