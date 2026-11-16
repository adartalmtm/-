import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Server, ShieldCheck, UserCheck } from 'lucide-react';
import type { Language } from '../types/suppliers';
import { translations } from '../i18n/translations';
import { GoogleSignInButton } from './GoogleSignInButton';
import { getApiBaseUrl, isNativeCapacitorApp, setApiBaseUrl } from '../services/apiClient';

interface LoginScreenProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onManagerGoogleLogin: () => Promise<void>;
  onEmployeeLogin: (username: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  lang,
  onChangeLang,
  onManagerGoogleLogin,
  onEmployeeLogin,
  isLoading,
  error,
  onClearError,
}) => {
  const t = translations[lang];
  const [mode, setMode] = useState<'manager' | 'employee'>('manager');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isNative = isNativeCapacitorApp();
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(() => getApiBaseUrl());
  const [serverSavedNotice, setServerSavedNotice] = useState(false);

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    await onEmployeeLogin(username.trim(), password);
  };

  const handleSaveServerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(serverUrlInput);
    setServerSavedNotice(true);
    setTimeout(() => setServerSavedNotice(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 safe-pt safe-pb">
      {/* Top Language Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <span className="text-lg font-bold tracking-tight text-slate-900">{t.brandTitle}</span>
        <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => onChangeLang('ar')}
            className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-colors ${
              lang === 'ar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.languageArabic}
          </button>
          <button
            type="button"
            onClick={() => onChangeLang('en')}
            className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-colors ${
              lang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.languageEnglish}
          </button>
        </div>
      </div>

      {/* Main Centered Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{t.loginPageTitle}</h1>
            <p className="text-sm text-slate-500 mt-1.5">{t.loginPageSubtitle}</p>
          </div>

          {/* Account Type Segmented Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('manager');
                onClearError();
              }}
              className={`py-2.5 px-3 min-h-[42px] text-xs sm:text-sm font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 ${
                mode === 'manager'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>{t.loginTabManager}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('employee');
                onClearError();
              }}
              className={`py-2.5 px-3 min-h-[42px] text-xs sm:text-sm font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 ${
                mode === 'employee'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-slate-700" />
              <span>{t.loginTabEmployee}</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg leading-relaxed">
              {error}
            </div>
          )}

          {mode === 'manager' ? (
            <div className="space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed text-center">
                {t.loginManagerDesc}
              </p>
              <div className="flex justify-center pt-1">
                <GoogleSignInButton
                  label={t.signInWithGoogle}
                  onClick={onManagerGoogleLogin}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed mb-2">{t.loginEmployeeDesc}</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.fieldUsername}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) onClearError();
                  }}
                  placeholder={t.placeholderUsername}
                  required
                  autoComplete="username"
                  dir="ltr"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.fieldPassword}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) onClearError();
                    }}
                    placeholder={t.placeholderPassword}
                    required
                    autoComplete="current-password"
                    dir="ltr"
                    className="w-full min-h-[44px] ps-3.5 pe-11 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 -translate-y-1/2 end-2 p-2 text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] py-2.5 px-5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60 mt-2"
              >
                {isLoading ? t.signingInBtn : t.signInBtn}
              </button>
            </form>
          )}

          {isNative && (
            <div className="mt-6 pt-5 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowServerConfig((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 py-1.5"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.serverConnectionTitle}</span>
                </span>
                <span className="font-mono-tabular text-[11px] text-blue-700" dir="ltr">
                  {showServerConfig ? t.close : 'API'}
                </span>
              </button>

              {showServerConfig && (
                <form onSubmit={handleSaveServerUrl} className="mt-3 space-y-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <label className="block text-xs font-medium text-slate-700">
                    {t.serverUrlLabel}
                  </label>
                  <input
                    type="url"
                    value={serverUrlInput}
                    onChange={(e) => setServerUrlInput(e.target.value)}
                    dir="ltr"
                    required
                    placeholder="https://..."
                    className="w-full min-h-[42px] px-3 py-2 text-xs font-mono-tabular text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 leading-relaxed">{t.serverUrlHint}</p>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="submit"
                      className="px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900"
                    >
                      {t.saveServerUrlBtn}
                    </button>
                    {serverSavedNotice && (
                      <span className="text-xs font-medium text-emerald-700">{t.serverUrlSaved}</span>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 pb-2">
        AL EQFAL · {t.sectionTitle}
      </div>
    </div>
  );
};
