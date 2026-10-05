// DIPTA - Header Component
import React from 'react';
import { User } from '../types';
import { DiptaStorageService } from '../services/dataStorage';
import { Shield, AlertTriangle, RefreshCw, UserCheck, ChevronDown, Trash2, LogOut } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  openIssuesCount: number;
  onNavigateToQuality: () => void;
  onResetData: () => void;
  onOpenDatabase?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  openIssuesCount,
  onNavigateToQuality,
  onResetData,
  onLogout,
}) => {
  const allUsers = DiptaStorageService.getAllUsers();
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  return (
    <header
      id="dipta-header"
      className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-xs p-0.5">
              <img
                src="/logo-dipta.jpg"
                alt="Logo DIPTA DPMPTSP OKI"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('logo-dipta.png')) {
                    target.src = '/logo-dipta.png';
                  }
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  DIPTA
                </h1>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Kabupaten Ogan Komering Ilir
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-none mt-0.5">
                Dashboard Integrasi Pelayanan Terpadu DPMPTSP
              </p>
            </div>
          </div>

          {/* Center/Right Info & User Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Open Data Quality Alert Badge */}
            {openIssuesCount > 0 && (
              <button
                id="header-btn-quality-alert"
                onClick={onNavigateToQuality}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800 transition-colors"
                title="Lihat data yang memerlukan verifikasi"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Perlu Verifikasi:</span>
                <span className="bg-amber-600 text-white rounded-full px-1.5 py-0.2 text-[11px] font-bold">
                  {openIssuesCount}
                </span>
              </button>
            )}

            {/* Quick Clear Dummy Data */}
            <button
              id="header-btn-reset-data"
              onClick={onResetData}
              title="Hapus / Kosongkan Seluruh Data Dummy & Hasil Import"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* RBAC Role Switcher & User Profile */}
            <div className="relative">
              <button
                id="header-btn-user-profile"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-xs">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.full_name}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{currentUser.role_name}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div
                  id="user-switch-dropdown"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 text-xs"
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Simulasi Pengguna / Role (RBAC)
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Pilih profil untuk menguji batasan hak akses sesuai PRD:
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                    {allUsers.map(u => {
                      const isSelected = u.user_id === currentUser.user_id;
                      return (
                        <button
                          key={u.user_id}
                          id={`select-user-${u.username}`}
                          onClick={() => {
                            onUserChange(u);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start gap-2 ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-900 font-medium border border-emerald-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isSelected ? (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{u.full_name}</div>
                            <div className="text-[11px] text-slate-500">
                              {u.role_name} • {u.jabatan}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {onLogout && (
                    <div className="pt-2 mt-1 border-t border-slate-100">
                      <button
                        id="header-btn-logout"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar dari Sistem (Logout)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Header Logout Button */}
            {onLogout && (
              <button
                id="header-quick-logout"
                onClick={onLogout}
                title="Keluar dari Sistem (Logout)"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
