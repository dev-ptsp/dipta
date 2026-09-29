// DIPTA — Dashboard Integrasi Pelayanan Terpadu DPMPTSP Kabupaten Ogan Komering Ilir
import React, { useState, useEffect, useMemo } from 'react';
import { User, DiptaRecord, DataQualityIssue, ImportBatch, AuditLog, GlobalFilter } from './types';
import { DiptaStorageService } from './services/dataStorage';
import { Header } from './components/Header';
import { Sidebar, ActiveView } from './components/Sidebar';
import { GlobalFilterBar } from './components/common/GlobalFilterBar';
import { ExecutiveDashboardView } from './components/views/ExecutiveDashboardView';
import { ExecutiveAiInsightView } from './components/views/ExecutiveAiInsightView';
import { MonitoringPelayananView } from './components/views/MonitoringPelayananView';
import { AnalyticsOssView } from './components/views/AnalyticsOssView';
import { AnalyticsSicantikView } from './components/views/AnalyticsSicantikView';
import { AnalyticsSimbgView } from './components/views/AnalyticsSimbgView';
import { DataQualityView } from './components/views/DataQualityView';
import { ImportModuleView } from './components/views/ImportModuleView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { AdministrationView } from './components/views/AdministrationView';

// Ensure storage is initialized and clean on application startup
DiptaStorageService.init();

export default function App() {
  // Current logged in user (defaults to Project Leader: Eva Kaparina, S.Sos)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const allUsers = DiptaStorageService.getAllUsers();
    return allUsers.find(u => u.username === 'eva.kaparina') || allUsers[0];
  });

  // Active navigation view
  const [activeView, setActiveView] = useState<ActiveView>('executive_dashboard');
  const [adminInitialTab, setAdminInitialTab] = useState<'USERS' | 'ROLES' | 'MAPPING' | 'KECAMATAN' | 'DATABASE'>('USERS');

  // Core Data loaded from storage
  const [records, setRecords] = useState<DiptaRecord[]>(() => DiptaStorageService.getAllRecords());
  const [issues, setIssues] = useState<DataQualityIssue[]>(() => DiptaStorageService.getAllIssues());
  const [batches, setBatches] = useState<ImportBatch[]>(() => DiptaStorageService.getAllBatches());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => DiptaStorageService.getAuditLogs());

  // Global Filter State (PRD Section 10 & 11)
  const [filters, setFilters] = useState<GlobalFilter>({
    periode_start: '',
    periode_end: '',
    sumber_aplikasi: 'SEMUA',
    jenis_layanan: 'SEMUA',
    status_dipta: 'SEMUA',
    kecamatan: 'SEMUA',
    search_query: ''
  });

  // Reload all records & issues from storage
  const reloadData = () => {
    setRecords(DiptaStorageService.getAllRecords());
    setIssues(DiptaStorageService.getAllIssues());
    setBatches(DiptaStorageService.getAllBatches());
    setAuditLogs(DiptaStorageService.getAuditLogs());
    setCurrentUser(DiptaStorageService.getCurrentUser());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Filter computation
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // 1. Filter Sumber Aplikasi
      if (filters.sumber_aplikasi !== 'SEMUA' && record.sumber_aplikasi !== filters.sumber_aplikasi) {
        return false;
      }

      // 2. Filter Status DIPTA
      if (filters.status_dipta !== 'SEMUA' && record.status_dipta !== filters.status_dipta) {
        return false;
      }

      // 3. Filter Kecamatan
      if (filters.kecamatan !== 'SEMUA' && record.kecamatan !== filters.kecamatan) {
        return false;
      }

      // 4. Filter Jenis Layanan
      if (filters.jenis_layanan !== 'SEMUA' && record.jenis_layanan !== filters.jenis_layanan) {
        return false;
      }

      // 5. Filter Periode Data
      if (filters.periode_start && record.periode_data && record.periode_data < filters.periode_start) {
        return false;
      }
      if (filters.periode_end && record.periode_data && record.periode_data > filters.periode_end) {
        return false;
      }

      // 6. Search Query (ID Sumber, Nomor Permohonan, NIB, Nomor Dokumen, Nama Pemohon/Perusahaan)
      if (filters.search_query && filters.search_query.trim() !== '') {
        const query = filters.search_query.toLowerCase().trim();
        const matchesId = record.id_record_sumber.toLowerCase().includes(query);
        const matchesNoPermohonan = (record.nomor_permohonan || '').toLowerCase().includes(query);
        const matchesNoDok = (record.nomor_dokumen || '').toLowerCase().includes(query);
        const matchesNama = record.nama_pemohon_usaha.toLowerCase().includes(query);
        const matchesKec = (record.kecamatan || '').toLowerCase().includes(query);

        if (!matchesId && !matchesNoPermohonan && !matchesNoDok && !matchesNama && !matchesKec) {
          return false;
        }
      }

      return true;
    });
  }, [records, filters]);

  // Unique services list for dropdown
  const availableServices = useMemo(() => {
    const list = Array.from(new Set(records.map(r => r.jenis_layanan))).filter(Boolean);
    return list.sort();
  }, [records]);

  // Open quality issues count
  const openIssuesCount = useMemo(() => {
    return issues.filter(i => i.status_isu === 'TERBUKA').length;
  }, [issues]);

  const handleResetData = () => {
    DiptaStorageService.clearAllDummyData();
    reloadData();
  };

  // Determine if the current view should display the unified GlobalFilterBar
  const showFilterBar =
    activeView === 'executive_dashboard' ||
    activeView === 'ai_insight' ||
    activeView.startsWith('monitoring_') ||
    activeView === 'data_recap';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        openIssuesCount={openIssuesCount}
        onNavigateToQuality={() => setActiveView('data_quality')}
        onResetData={handleResetData}
        onOpenDatabase={() => {
          setAdminInitialTab('DATABASE');
          setActiveView('administration');
        }}
      />

      {/* Main Body with Sidebar and Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeView={activeView}
          onNavigate={(view) => {
            if (view === 'administration') {
              setAdminInitialTab('USERS');
            }
            setActiveView(view);
          }}
          currentUser={currentUser}
          qualityIssuesCount={openIssuesCount}
        />

        {/* Workspace Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Global Filter Bar (Unified across all monitoring & dashboard views) */}
            {showFilterBar && (
              <GlobalFilterBar
                filters={filters}
                onFilterChange={setFilters}
                availableServices={availableServices}
                totalFilteredCount={filteredRecords.length}
                totalAllCount={records.length}
              />
            )}

            {/* View Router */}
            {activeView === 'executive_dashboard' && (
              <ExecutiveDashboardView
                records={filteredRecords}
                allRecordsCount={records.length}
                filters={filters}
                currentUser={currentUser}
                onNavigateToQuality={() => setActiveView('data_quality')}
                onSelectKecamatan={(kec) => setFilters(prev => ({ ...prev, kecamatan: kec }))}
                onNavigateToImport={() => setActiveView('import_data')}
                onNavigateToDatabase={() => {
                  setAdminInitialTab('DATABASE');
                  setActiveView('administration');
                }}
                onNavigateToAiInsight={() => setActiveView('ai_insight')}
              />
            )}

            {activeView === 'ai_insight' && (
              <ExecutiveAiInsightView
                records={filteredRecords}
                allRecordsCount={records.length}
                filters={filters}
                currentUser={currentUser}
                onNavigateToDashboard={() => setActiveView('executive_dashboard')}
                onNavigateToQuality={() => setActiveView('data_quality')}
              />
            )}

            {activeView === 'monitoring_all' && (
              <MonitoringPelayananView
                records={filteredRecords}
                title="Monitoring Pelayanan — Seluruh Sumber"
                subtitle="Daftar transaksi konsolidasi dari OSS-RBA, SICANTIK Cloud, dan SIMBG di Kab. Ogan Komering Ilir."
                currentUser={currentUser}
              />
            )}

            {activeView === 'monitoring_oss' && (
              <MonitoringPelayananView
                records={filteredRecords}
                filterSource="OSS-RBA"
                title="Monitoring Pelayanan — OSS-RBA"
                subtitle="Data transaksi perizinan berusaha berbasis risiko dari Online Single Submission (OSS-RBA)."
                currentUser={currentUser}
              />
            )}

            {activeView === 'monitoring_sicantik' && (
              <MonitoringPelayananView
                records={filteredRecords}
                filterSource="SICANTIK"
                title="Monitoring Pelayanan — SICANTIK Cloud"
                subtitle="Data transaksi perizinan dan non-perizinan daerah dari aplikasi cerdas terpadu satu pintu (SICANTIK Cloud)."
                currentUser={currentUser}
              />
            )}

            {activeView === 'monitoring_simbg' && (
              <MonitoringPelayananView
                records={filteredRecords}
                filterSource="SIMBG"
                title="Monitoring Pelayanan — SIMBG (PBG / SLF)"
                subtitle="Data transaksi Persetujuan Bangunan Gedung dan Sertifikat Laik Fungsi dari SIMBG."
                currentUser={currentUser}
              />
            )}

            {activeView === 'analytics_oss' && (
              <AnalyticsOssView records={filteredRecords} />
            )}

            {activeView === 'analytics_sicantik' && (
              <AnalyticsSicantikView records={filteredRecords} />
            )}

            {activeView === 'analytics_simbg' && (
              <AnalyticsSimbgView records={filteredRecords} />
            )}

            {activeView === 'data_recap' && (
              <MonitoringPelayananView
                records={filteredRecords}
                title="Data & Rekapitulasi Pelayanan Terpadu"
                subtitle="Tabel induk rekapitulasi data dengan kemampuan filter komprehensif dan ekspor laporan Excel."
                currentUser={currentUser}
              />
            )}

            {activeView === 'data_quality' && (
              <DataQualityView
                records={records}
                issues={issues}
                currentUser={currentUser}
                onRefresh={reloadData}
              />
            )}

            {activeView === 'import_data' && (
              <ImportModuleView
                currentUser={currentUser}
                onImportSuccess={() => {
                  reloadData();
                  setActiveView('executive_dashboard');
                }}
              />
            )}

            {activeView === 'audit_history' && (
              <AuditTrailView
                batches={batches}
                auditLogs={auditLogs}
              />
            )}

            {activeView === 'administration' && (
              <AdministrationView
                currentUser={currentUser}
                onDataRefresh={reloadData}
                initialTab={adminInitialTab}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
