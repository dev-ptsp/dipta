// DIPTA - Modern Login View for DPMPTSP Kabupaten Ogan Komering Ilir
import React, { useState } from 'react';
import { User } from '../../types';
import { DiptaStorageService } from '../../services/dataStorage';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState<string>('eva.kaparina');
  const [password, setPassword] = useState<string>('dipta2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const allUsers = DiptaStorageService.getAllUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    setTimeout(() => {
      const result = DiptaStorageService.authenticate(identifier, password);
      setLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Autentikasi gagal. Silakan periksa kembali data login Anda.');
      }
    }, 400);
  };

  const handleSelectDemoUser = (user: User) => {
    setIdentifier(user.username);
    setPassword(user.password || 'dipta2026');
    setErrorMessage(null);
  };

  const handleQuickLoginAs = (user: User) => {
    setIdentifier(user.username);
    setPassword(user.password || 'dipta2026');
    setLoading(true);

    setTimeout(() => {
      const result = DiptaStorageService.authenticate(user.username, user.password || 'dipta2026');
      setLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center relative overflow-hidden font-sans">
      {/* Background Ambient Glows & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          
          {/* Left Column: Brand Hero & Presentation (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative">
            {/* Top Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Aksi Perubahan Kualitas Pelayanan Publik
              </span>
              <span className="text-xs text-slate-400">PKP Tahun 2026</span>
            </div>

            {/* Official Uploaded 3D Logo Showcase */}
            <div className="my-8 text-center flex flex-col items-center">
              <div className="relative group p-2">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500" />
                <div className="relative bg-white rounded-2xl p-4 shadow-2xl border border-white/20 transition-transform duration-300 hover:scale-[1.02]">
                  <img
                    src="/logo-dipta.jpg"
                    alt="Logo Resmi DIPTA DPMPTSP OKI"
                    className="w-56 sm:w-64 h-auto object-contain mx-auto"
                    onError={(e) => {
                      // Fallback if path needs secondary static reference
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('logo-dipta.png')) {
                        target.src = '/logo-dipta.png';
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 text-center">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  DIPTA
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-emerald-400 uppercase tracking-widest mt-1">
                  Dashboard Integrasi Pelayanan Terpadu
                </p>
                <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kabupaten Ogan Komering Ilir
                </p>
              </div>
            </div>

            {/* 3 Value Pillars */}
            

            {/* Left Footer Trust Note */}
            <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Eva Kaparina, S.Sos
              </span>
              <span>DPMPTSP • OKI</span>
            </div>
          </div>

          {/* Right Column: Interactive Login Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-12 flex flex-col justify-between">
            <div>
              {/* Form Header */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Masuk ke Dashboard
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Gunakan kredensial akun kedinasan Anda untuk mengakses dashboard.
                  </p>
                </div>

               
              </div>

              {/* Error Notification Banner */}
              {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Gagal Masuk</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Interactive Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Identifier (Username / NIP / Email) */}
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Username, NIP, atau Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="login-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="contoh: eva.kaparina atau 19790412..."
                      required
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Input with Visibility Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Kata Sandi (Password)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Help */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-600">Ingat sesi login saya</span>
                  </label>

                  
                </div>

                {/* Submit Button */}
                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi Kredensial...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard DIPTA</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Quick Accounts Drawer (Evaluator & Multi-Role Testing) */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-toggle-demo-accounts"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-indigo-600 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Pilih Akun Simulasi Cepat (8 Role DPMPTSP OKI)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDemoAccounts ? 'rotate-180' : ''}`} />
                </button>

                {showDemoAccounts && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 max-h-56 overflow-y-auto animate-in fade-in duration-200">
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Klik salah satu akun di bawah untuk mengisi form login secara otomatis:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {allUsers.map((u) => {
                        const isCurrentActive = identifier.toLowerCase() === u.username.toLowerCase();
                        return (
                          <div
                            key={u.user_id}
                            className={`p-2 rounded-lg border text-left flex items-center justify-between gap-2 transition-all ${
                              isCurrentActive
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectDemoUser(u)}
                              className="flex-1 text-left"
                            >
                              <div className="font-bold text-xs truncate">{u.full_name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{u.role_name}</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickLoginAs(u)}
                              title={`Langsung masuk sebagai ${u.full_name}`}
                              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold shrink-0"
                            >
                              Masuk
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Form Footer & System Status */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Server Aktif & Terhubung Cloud 
              </span>
              <span>DIPTA v1.0 • DPMPTSP OKI 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password / Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Bantuan Akses Akun</h3>
                <p className="text-xs text-slate-500">DPMPTSP Kabupaten Ogan Komering Ilir</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Untuk menjaga keamanan integrasi data perizinan, pengaturan ulang kata sandi dilakukan secara terpusat oleh Tim Administrator Sistem TI DPMPTSP Kab. OKI.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                <div><strong>Default Password Semua Akun:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">dipta2026</code></div>
                <div><strong>Helpdesk TI DPMPTSP OKI:</strong> dpmptsp@kaboki.go.id</div>
                <div><strong>Lokasi Kantor:</strong> Jl. Letjen Yusuf Singadekane, Kayu Agung, OKI</div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
            >
              Mengerti & Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
