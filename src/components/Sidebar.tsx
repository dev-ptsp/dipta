// DIPTA - Information Architecture Navigation Sidebar
import React from 'react';
import { User } from '../types';
import { DiptaStorageService } from '../services/dataStorage';
import {
  LayoutDashboard,
  Eye,
  BarChart3,
  Table,
  CheckCircle,
  UploadCloud,
  History,
  Settings,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  Building2,
  FileCheck2,
  FileText,
  Database
} from 'lucide-react';

export type ActiveView =
  | 'executive_dashboard'
  | 'ai_insight'
  | 'monitoring_all'
  | 'monitoring_oss'
  | 'monitoring_sicantik'
  | 'monitoring_simbg'
  | 'analytics_oss'
  | 'analytics_sicantik'
  | 'analytics_simbg'
  | 'data_recap'
  | 'data_quality'
  | 'import_data'
  | 'audit_history'
  | 'administration';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  currentUser: User;
  qualityIssuesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  currentUser,
  qualityIssuesCount
}) => {
  const role = currentUser.role_code;
  const canImport = DiptaStorageService.canUser(role, 'import');
  const canAdmin = DiptaStorageService.canUser(role, 'admin');
  const canQuality = DiptaStorageService.canUser(role, 'quality');
  const canAudit = DiptaStorageService.canUser(role, 'audit');

  const [expandedSections, setExpandedSections] = React.useState<{ [key: string]: boolean }>({
    monitoring: true,
    analytics: false
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isMonitoringActive = activeView.startsWith('monitoring_');
  const isAnalyticsActive = activeView.startsWith('analytics_');

  return (
    <aside
      id="dipta-sidebar"
      className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800"
    >
      {/* Top Banner Tagline */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Satu Data • Satu Kendali</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
          Purwarupa Konsolidasi OSS-RBA, SICANTIK Cloud, dan SIMBG.
        </p>
      </div>

      {/* Navigation Tree (PRD Section 9) */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto text-xs">
        {/* 1. Dashboard Eksekutif */}
        <button
          id="nav-executive-dashboard"
          onClick={() => onNavigate('executive_dashboard')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all font-medium ${
            activeView === 'executive_dashboard'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            <span>Dashboard Eksekutif</span>
          </div>
        </button>

        {/* 2. AI Insight Eksekutif (Halaman Baru & Menu Baru) */}
        <button
          id="nav-ai-insight"
          onClick={() => onNavigate('ai_insight')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all font-medium ${
            activeView === 'ai_insight'
              ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Insight Eksekutif</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 font-bold border border-amber-400/30">
            BARU
          </span>
        </button>

        {/* 2. Monitoring Pelayanan (Accordion) */}
        <div>
          <button
            id="nav-monitoring-parent"
            onClick={() => toggleSection('monitoring')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors font-medium ${
              isMonitoringActive
                ? 'bg-slate-800/80 text-emerald-400'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-sky-400" />
              <span>Monitoring Pelayanan</span>
            </div>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform text-slate-400 ${
                expandedSections.monitoring ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expandedSections.monitoring && (
            <div className="pl-6 pt-1 pb-1 space-y-1 border-l border-slate-800 ml-5 mt-1">
              <button
                id="nav-monitoring-all"
                onClick={() => onNavigate('monitoring_all')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeView === 'monitoring_all'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Seluruh Sumber</span>
              </button>
              <button
                id="nav-monitoring-oss"
                onClick={() => onNavigate('monitoring_oss')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeView === 'monitoring_oss'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>OSS-RBA</span>
              </button>
              <button
                id="nav-monitoring-sicantik"
                onClick={() => onNavigate('monitoring_sicantik')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeView === 'monitoring_sicantik'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>SICANTIK Cloud</span>
              </button>
              <button
                id="nav-monitoring-simbg"
                onClick={() => onNavigate('monitoring_simbg')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeView === 'monitoring_simbg'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>SIMBG PBG/SLF</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Analitik Sumber (Accordion) */}
        <div>
          <button
            id="nav-analytics-parent"
            onClick={() => toggleSection('analytics')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors font-medium ${
              isAnalyticsActive
                ? 'bg-slate-800/80 text-indigo-400'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Analitik Sumber</span>
            </div>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform text-slate-400 ${
                expandedSections.analytics ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expandedSections.analytics && (
            <div className="pl-6 pt-1 pb-1 space-y-1 border-l border-slate-800 ml-5 mt-1">
              <button
                id="nav-analytics-oss"
                onClick={() => onNavigate('analytics_oss')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeView === 'analytics_oss'
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Analitik OSS (NIB/Proyek/Izin)</span>
              </button>
              <button
                id="nav-analytics-sicantik"
                onClick={() => onNavigate('analytics_sicantik')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeView === 'analytics_sicantik'
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Analitik SICANTIK & SLA</span>
              </button>
              <button
                id="nav-analytics-simbg"
                onClick={() => onNavigate('analytics_simbg')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeView === 'analytics_simbg'
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Analitik SIMBG (PBG/SLF)</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Data & Rekapitulasi */}
        <button
          id="nav-data-recap"
          onClick={() => onNavigate('data_recap')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors font-medium ${
            activeView === 'data_recap'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <Table className="w-4 h-4 text-emerald-400" />
          <span>Data & Rekapitulasi</span>
        </button>

        {/* 5. Data Quality */}
        <button
          id="nav-data-quality"
          onClick={() => onNavigate('data_quality')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors font-medium ${
            activeView === 'data_quality'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-amber-400" />
            <span>Data Quality</span>
          </div>
          {qualityIssuesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              {qualityIssuesCount}
            </span>
          )}
        </button>

        {/* 6. Modul Import Data (Access guarded) */}
        {canImport ? (
          <button
            id="nav-import-data"
            onClick={() => onNavigate('import_data')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors font-medium ${
              activeView === 'import_data'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-teal-400" />
            <span>Import 5 Dataset</span>
          </button>
        ) : (
          <div className="px-3 py-2 text-[11px] text-slate-500 italic flex items-center gap-2 opacity-60">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Data (Terkunci)</span>
          </div>
        )}

        {/* 7. Riwayat Pembaruan (Import History & Audit) */}
        <button
          id="nav-audit-history"
          onClick={() => onNavigate('audit_history')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors font-medium ${
            activeView === 'audit_history'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <History className="w-4 h-4 text-cyan-400" />
          <span>Riwayat & Audit Trail</span>
        </button>

        {/* 8. Administrasi & RBAC (Access guarded) */}
        {canAdmin ? (
          <button
            id="nav-administration"
            onClick={() => onNavigate('administration')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors font-medium ${
              activeView === 'administration'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Administrasi & RBAC</span>
          </button>
        ) : (
          <button
            id="nav-administration-view-only"
            onClick={() => onNavigate('administration')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors font-medium ${
              activeView === 'administration'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Info Role & Master</span>
          </button>
        )}

        {/* 9. Database Cloud Supabase */}
        <button
          id="nav-database-supabase"
          onClick={() => onNavigate('administration')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white group border border-slate-800/60 mt-1"
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-400 group-hover:scale-105 transition-transform" />
            <span className="text-[11px]">Database Supabase</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>
      </nav>

      {/* Footer / Authority badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-300">DPMPTSP Kab. OKI</div>
        <div className="text-slate-400 mt-0.5">Project Leader: Eva Kaparina, S.Sos</div>
        <div className="text-[10px] text-slate-500 mt-1">PRD Versi 1.0 • Purwarupa</div>
      </div>
    </aside>
  );
};
