// DIPTA - Administrasi, RBAC, dan Master Mapping (PRD Section 4, 21, 24)
import React, { useState, useMemo, useEffect } from 'react';
import { User, StatusMappingRule, StatusDIPTA, SourceApp, RoleCode } from '../../types';
import { DiptaStorageService } from '../../services/dataStorage';
import { DiptaSupabaseService, SupabaseConnectionStatus } from '../../services/supabaseClient';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import { OKI_KECAMATAN_LIST } from '../../data/initialData';
import {
  Settings,
  Users,
  Shield,
  Layers,
  MapPin,
  Plus,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Database,
  Cloud,
  CloudUpload,
  CloudDownload,
  Copy,
  Check,
  ExternalLink,
  Key,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  Trash2,
  Pencil,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  UserCog,
  Briefcase,
  Filter,
  Info,
  ShieldCheck,
  Globe,
  Terminal,
  Zap
} from 'lucide-react';

interface AdministrationViewProps {
  currentUser: User;
  onDataRefresh?: () => void;
  initialTab?: 'USERS' | 'ROLES' | 'MAPPING' | 'KECAMATAN' | 'DATABASE' | 'VERCEL';
}

export interface RoleMetadata {
  code: RoleCode;
  name: string;
  scope: string;
  description: string;
  badgeClass: string;
  privileges: {
    dash: boolean;
    filter: boolean;
    detail: string;
    imp: boolean | string;
    corr: boolean | string;
    exp: boolean;
    adm: boolean;
  };
}

export const ROLE_DEFINITIONS: RoleMetadata[] = [
  {
    code: 'PIMPINAN',
    name: 'Pimpinan (Kepala Dinas)',
    scope: 'Tingkat Eksekutif',
    description: 'Pemantauan komprehensif seluruh data pelayanan lintas aplikasi, analisis AI Insight, dan ekspor rekapitulasi.',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    privileges: { dash: true, filter: true, detail: 'Terbatas', imp: false, corr: false, exp: true, adm: false }
  },
  {
    code: 'PROJECT_LEADER',
    name: 'Project Leader (Eva Kaparina, S.Sos)',
    scope: 'Manajemen & Aksi Perubahan',
    description: 'Pengendalian proyek monitoring, koordinasi lintas bidang, validasi mutu data, import, dan administrasi.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    privileges: { dash: true, filter: true, detail: 'Penuh', imp: true, corr: true, exp: true, adm: true }
  },
  {
    code: 'DATA_ADMIN',
    name: 'Data Administrator',
    scope: 'Pengolahan & Kualitas Data',
    description: 'Pengolahan data terpadu, validasi anomali data quality, rekonsiliasi batch import, dan audit trail.',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    privileges: { dash: true, filter: true, detail: 'Penuh', imp: true, corr: true, exp: true, adm: true }
  },
  {
    code: 'OPERATOR_OSS',
    name: 'Operator OSS-RBA',
    scope: 'Sektor Perizinan Berusaha',
    description: 'Pengelolaan dan import berkas perizinan berusaha berbasis risiko (OSS NIB, Kegiatan, dan Izin).',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    privileges: { dash: true, filter: true, detail: 'Sesuai OSS', imp: 'Khusus OSS', corr: 'Khusus OSS', exp: true, adm: false }
  },
  {
    code: 'OPERATOR_SICANTIK',
    name: 'Operator SICANTIK',
    scope: 'Sektor Non-Perizinan Daerah',
    description: 'Pengelolaan dataset izin kesehatan, operasional nakes, dan perizinan daerah pada SICANTIK Cloud.',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    privileges: { dash: true, filter: true, detail: 'Sesuai SICANTIK', imp: 'Khusus SICANTIK', corr: 'Khusus SICANTIK', exp: true, adm: false }
  },
  {
    code: 'OPERATOR_SIMBG',
    name: 'Operator SIMBG',
    scope: 'Sektor Bangunan Gedung',
    description: 'Pengelolaan dataset Persetujuan Bangunan Gedung (PBG) dan Sertifikat Laik Fungsi (SLF).',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    privileges: { dash: true, filter: true, detail: 'Sesuai SIMBG', imp: 'Khusus SIMBG', corr: 'Khusus SIMBG', exp: true, adm: false }
  },
  {
    code: 'VIEWER',
    name: 'Viewer / Penyusun Laporan',
    scope: 'Pelaporan & Monitoring',
    description: 'Akses penelusuran data pelayanan dan ekspor rekapitulasi untuk penyusunan laporan berkala.',
    badgeClass: 'bg-slate-50 text-slate-800 border-slate-200',
    privileges: { dash: true, filter: true, detail: 'Kewenangan', imp: false, corr: false, exp: true, adm: false }
  },
  {
    code: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    scope: 'Super Administrator',
    description: 'Akses penuh seluruh modul, manajemen pengguna, RBAC, konfigurasi Supabase, dan master harmonisasi.',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    privileges: { dash: true, filter: true, detail: 'Penuh', imp: true, corr: true, exp: true, adm: true }
  }
];

export const AdministrationView: React.FC<AdministrationViewProps> = ({ currentUser, onDataRefresh, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'MAPPING' | 'KECAMATAN' | 'DATABASE' | 'VERCEL'>(initialTab || 'USERS');

  // Vercel Deployment Tab State
  const [vercelCopied, setVercelCopied] = useState<string | null>(null);
  const [vercelTestStatus, setVercelTestStatus] = useState<{ testing: boolean; result?: any; latency?: number }>({ testing: false });
  const [vercelDomainUrl, setVercelDomainUrl] = useState<string>(
    () => localStorage.getItem('dipta_vercel_url') || 'https://temporary-flying-chestnut-avbarf8.vercel.app'
  );
  const [vercelToken, setVercelToken] = useState<string>(() => localStorage.getItem('dipta_vercel_token') || '');
  const [isDeployingVercel, setIsDeployingVercel] = useState(false);
  const [vercelDeployFeedback, setVercelDeployFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Supabase Management API Token for 1-click Auto-Migration
  const [supabaseAccessToken, setSupabaseAccessToken] = useState<string>(
    () => localStorage.getItem('dipta_supabase_pat') || ''
  );
  const [isAutoMigrating, setIsAutoMigrating] = useState(false);

  const handleCopyVercel = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setVercelCopied(key);
    setTimeout(() => setVercelCopied(null), 2500);
  };

  const handleTestVercel = async () => {
    setVercelTestStatus({ testing: true });
    const start = Date.now();
    try {
      const res = await fetch(`${vercelDomainUrl.replace(/\/$/, '')}/api/health`);
      const data = await res.json();
      const latency = Date.now() - start;
      setVercelTestStatus({ testing: false, result: data, latency });
    } catch (err: any) {
      setVercelTestStatus({ testing: false, result: { error: err?.message || 'Gagal menghubungi server Vercel' } });
    }
  };

  const handleDirectDeployVercel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeployingVercel(true);
    setVercelDeployFeedback(null);
    try {
      if (vercelToken.trim()) {
        localStorage.setItem('dipta_vercel_token', vercelToken.trim());
      }
      const res = await fetch('/api/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vercelToken: vercelToken.trim(),
          projectName: 'dipta-dpmptsp-oki'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal melakukan deploy ke Vercel.');
      }
      if (data.url) {
        setVercelDomainUrl(data.url);
        localStorage.setItem('dipta_vercel_url', data.url);
      }
      setVercelDeployFeedback({
        type: 'success',
        message: `Berhasil! Build terbaru telah dideploy ke Vercel pada domain: ${data.url}`
      });
    } catch (err: any) {
      setVercelDeployFeedback({
        type: 'error',
        message: err?.message || 'Gagal melakukan deploy ke Vercel.'
      });
    } finally {
      setIsDeployingVercel(false);
    }
  };

  const handleAutoMigrateSupabase = async () => {
    setIsAutoMigrating(true);
    setSyncFeedback(null);
    try {
      if (supabaseAccessToken.trim()) {
        localStorage.setItem('dipta_supabase_pat', supabaseAccessToken.trim());
      }
      const projectRef = inputUrl.split('//')[1]?.split('.')[0] || 'lajhgapanricrzlxlniq';
      const res = await fetch('/api/supabase/auto-migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRef,
          accessToken: supabaseAccessToken.trim(),
          sql: fullSeedSql
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengeksekusi migrasi otomatis.');
      }
      // After tables are created and seeded, also run syncAllToSupabase
      const syncRes = await DiptaStorageService.syncAllToSupabase();
      setLastSyncTime(DiptaSupabaseService.getLastSync());
      setSyncFeedback({
        type: 'success',
        message: `Berhasil! Keenam tabel dibuat otomatis di Supabase Cloud (${projectRef}) dan seluruh database (${syncRes.recordsCount} item) telah terkirim!`
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Gagal menjalankan migrasi otomatis.'
      });
    } finally {
      setIsAutoMigrating(false);
    }
  };

  const [users, setUsers] = useState<User[]>(DiptaStorageService.getAllUsers());
  const [mappingRules, setMappingRules] = useState<StatusMappingRule[]>(DiptaStorageService.getStatusMappingRules());

  // User Management State (Master Pengguna & Info Role)
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [filterUserRole, setFilterUserRole] = useState<'SEMUA' | RoleCode>('SEMUA');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<RoleCode | 'SEMUA'>('SEMUA');

  // Form Fields for User Create / Edit
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('dipta2026');
  const [showPassword, setShowPassword] = useState(false);
  const [formNip, setFormNip] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUnitKerja, setFormUnitKerja] = useState('DPMPTSP Kabupaten Ogan Komering Ilir');
  const [formJabatan, setFormJabatan] = useState('');
  const [formRoleCode, setFormRoleCode] = useState<RoleCode>('OPERATOR_OSS');
  const [formIsActive, setFormIsActive] = useState(true);

  // Filtered users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchUserQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.nip && u.nip.includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.jabatan && u.jabatan.toLowerCase().includes(q)) ||
        (u.unit_kerja && u.unit_kerja.toLowerCase().includes(q));

      const matchRole = filterUserRole === 'SEMUA' || u.role_code === filterUserRole;
      return matchSearch && matchRole;
    });
  }, [users, searchUserQuery, filterUserRole]);

  // Supabase Database State
  const [supabaseConfig, setSupabaseConfig] = useState(DiptaSupabaseService.getConfig());
  const [inputUrl, setInputUrl] = useState(supabaseConfig.url || 'https://lajhgapanricrzlxlniq.supabase.co');
  const [inputAnonKey, setInputAnonKey] = useState(supabaseConfig.anonKey || '');
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(DiptaSupabaseService.getLastSync());
  const [includeCloud, setIncludeCloud] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Pagination for Users (Tab 1)
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(5);

  useEffect(() => {
    setCurrentUserPage(1);
  }, [searchUserQuery, filterUserRole]);

  const paginatedUsers = useMemo(() => {
    const start = (currentUserPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, currentUserPage, userPageSize]);

  // Pagination for Mapping Rules (Tab 3)
  const [currentMappingPage, setCurrentMappingPage] = useState(1);
  const [mappingPageSize, setMappingPageSize] = useState(10);

  const paginatedMappingRules = useMemo(() => {
    const start = (currentMappingPage - 1) * mappingPageSize;
    return mappingRules.slice(start, start + mappingPageSize);
  }, [mappingRules, currentMappingPage, mappingPageSize]);

  // Form state for adding new status mapping rule
  const [newSourceApp, setNewSourceApp] = useState<SourceApp>('OSS-RBA');
  const [newOriginalStatus, setNewOriginalStatus] = useState('');
  const [newDiptaStatus, setNewDiptaStatus] = useState<StatusDIPTA>('SELESAI_TERBIT');
  const [newKeterangan, setNewKeterangan] = useState('');
  const [showAddMappingModal, setShowAddMappingModal] = useState(false);

  const canEditAdmin = DiptaStorageService.canUser(currentUser.role_code, 'admin');

  // User Management Actions (PRD Section 4 & 24)
  const openCreateUserModal = (preselectedRole?: RoleCode) => {
    setEditingUser(null);
    setFormFullName('');
    setFormUsername('');
    setFormPassword('dipta2026');
    setShowPassword(false);
    setFormNip('');
    setFormEmail('');
    setFormUnitKerja('DPMPTSP Kabupaten Ogan Komering Ilir');
    setFormJabatan('');
    setFormRoleCode(preselectedRole || 'OPERATOR_OSS');
    setFormIsActive(true);
    setShowUserModal(true);
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setFormFullName(user.full_name);
    setFormUsername(user.username);
    setFormPassword(user.password || 'dipta2026');
    setShowPassword(false);
    setFormNip(user.nip || '');
    setFormEmail(user.email || '');
    setFormUnitKerja(user.unit_kerja || 'DPMPTSP Kabupaten Ogan Komering Ilir');
    setFormJabatan(user.jabatan);
    setFormRoleCode(user.role_code);
    setFormIsActive(user.is_active !== false);
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formUsername.trim()) {
      alert('Nama Lengkap dan Username wajib diisi.');
      return;
    }

    const matchedDef = ROLE_DEFINITIONS.find(r => r.code === formRoleCode);
    const roleName = matchedDef ? matchedDef.name.replace(/\s*\(.*?\)/, '') : formRoleCode;

    try {
      if (editingUser) {
        // Update user
        const updated = DiptaStorageService.updateUser(
          editingUser.user_id,
          {
            full_name: formFullName.trim(),
            username: formUsername.trim().toLowerCase().replace(/\s+/g, '.'),
            password: formPassword.trim() || 'dipta2026',
            nip: formNip.trim() || undefined,
            email: formEmail.trim() || undefined,
            unit_kerja: formUnitKerja.trim(),
            jabatan: formJabatan.trim(),
            role_code: formRoleCode,
            role_name: roleName,
            is_active: formIsActive,
          },
          currentUser
        );

        if (updated) {
          setUsers(DiptaStorageService.getAllUsers());
          setUserFeedback({
            type: 'success',
            message: `Data pengguna "${updated.full_name}" berhasil diperbarui!`
          });
          if (onDataRefresh) onDataRefresh();
        }
      } else {
        // Create user
        const created = DiptaStorageService.addUser(
          {
            full_name: formFullName.trim(),
            username: formUsername.trim().toLowerCase().replace(/\s+/g, '.'),
            password: formPassword.trim() || 'dipta2026',
            nip: formNip.trim() || undefined,
            email: formEmail.trim() || undefined,
            unit_kerja: formUnitKerja.trim() || 'DPMPTSP Kabupaten Ogan Komering Ilir',
            jabatan: formJabatan.trim() || 'Staf Pelayanan',
            role_code: formRoleCode,
            role_name: roleName,
            is_active: formIsActive,
          },
          currentUser
        );

        setUsers(DiptaStorageService.getAllUsers());
        setUserFeedback({
          type: 'success',
          message: `Pengguna baru "${created.full_name}" (${roleName}) berhasil ditambahkan!`
        });
        if (onDataRefresh) onDataRefresh();
      }

      setShowUserModal(false);
      setTimeout(() => setUserFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan data pengguna.');
    }
  };

  const handleToggleUserStatus = (user: User) => {
    const nextStatus = !user.is_active;
    const actionWord = nextStatus ? 'mengaktifkan' : 'menonaktifkan';
    if (confirm(`Apakah Anda yakin ingin ${actionWord} akun pengguna "${user.full_name}"?`)) {
      DiptaStorageService.updateUser(user.user_id, { is_active: nextStatus }, currentUser);
      setUsers(DiptaStorageService.getAllUsers());
      setUserFeedback({
        type: 'success',
        message: `Status akun "${user.full_name}" berhasil diubah menjadi ${nextStatus ? 'Aktif' : 'Nonaktif'}.`
      });
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setUserFeedback(null), 4000);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.user_id === 1) {
      alert('Akun Kepala Dinas tidak dapat dihapus.');
      return;
    }
    if (user.user_id === currentUser.user_id) {
      alert('Anda tidak dapat menghapus akun yang sedang aktif digunakan saat ini.');
      return;
    }

    if (confirm(`Peringatan: Hapus akun pengguna "${user.full_name}" (${user.username}) secara permanen?`)) {
      try {
        DiptaStorageService.deleteUser(user.user_id, currentUser);
        setUsers(DiptaStorageService.getAllUsers());
        setUserFeedback({
          type: 'success',
          message: `Pengguna "${user.full_name}" berhasil dihapus dari sistem.`
        });
        if (onDataRefresh) onDataRefresh();
        setTimeout(() => setUserFeedback(null), 4000);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus pengguna.');
      }
    }
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOriginalStatus.trim()) return;

    const newRule: StatusMappingRule = {
      mapping_id: `RULE-${Date.now()}`,
      source_app: newSourceApp,
      source_status: newOriginalStatus.trim(),
      target_status_dipta: newDiptaStatus,
      description: newKeterangan.trim() || 'Pemetaan kustom oleh administrator',
      is_active: true,
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    const updated = [newRule, ...mappingRules];
    DiptaStorageService.saveStatusMappingRules(updated);
    setMappingRules(updated);
    setNewOriginalStatus('');
    setNewKeterangan('');
    setShowAddMappingModal(false);
  };

  const handleToggleRule = (mappingId: string) => {
    const updated = mappingRules.map(r =>
      r.mapping_id === mappingId ? { ...r, is_active: !r.is_active } : r
    );
    DiptaStorageService.saveStatusMappingRules(updated);
    setMappingRules(updated);
  };

  // Supabase Database Handlers
  const handleSaveSupabaseConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    DiptaSupabaseService.saveConfig(inputUrl, inputAnonKey);
    const updated = DiptaSupabaseService.getConfig();
    setSupabaseConfig(updated);
    setSyncFeedback({ type: 'success', message: 'Kredensial database Supabase berhasil disimpan di sistem!' });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    setSyncFeedback(null);
    try {
      DiptaSupabaseService.saveConfig(inputUrl, inputAnonKey);
      setSupabaseConfig(DiptaSupabaseService.getConfig());
      const res = await DiptaSupabaseService.testConnection();
      setConnectionStatus(res);
    } catch (err: any) {
      setConnectionStatus({
        connected: false,
        statusText: `Gagal terkoneksi: ${err?.message || 'Kesalahan jaringan'}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleUploadToSupabase = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await DiptaStorageService.syncAllToSupabase();
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Berhasil mengunggah & mencadangkan ${res.recordsCount} data konsolidasi ke Supabase Cloud!`
        });
        setLastSyncTime(DiptaSupabaseService.getLastSync());
      } else {
        setSyncFeedback({
          type: 'error',
          message: `Gagal mengunggah ke Supabase: ${res.error}`
        });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: err?.message || 'Gagal sinkronisasi data' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadFromSupabase = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await DiptaStorageService.loadAllFromSupabase();
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Berhasil mengambil ${res.recordsCount} baris data konsolidasi dari Supabase Cloud!`
        });
        setLastSyncTime(DiptaSupabaseService.getLastSync());
        if (onDataRefresh) {
          onDataRefresh();
        }
      } else {
        setSyncFeedback({
          type: 'error',
          message: `Gagal mengambil data dari Supabase: ${res.error}`
        });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: err?.message || 'Gagal mengambil data' });
    } finally {
      setIsSyncing(false);
    }
  };

  const fullSeedSql = useMemo(() => {
    return DiptaSupabaseService.getFullSeedSQL({
      users,
      mappings: mappingRules,
      records: DiptaStorageService.getAllRecords(),
      batches: DiptaStorageService.getAllBatches()
    });
  }, [users, mappingRules]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(fullSeedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleClearDummyData = async () => {
    setIsClearing(true);
    setSyncFeedback(null);
    try {
      const stats = DiptaStorageService.clearAllDummyData();
      let cloudMsg = '';

      if (includeCloud && DiptaSupabaseService.getConfig().isConfigured) {
        const cloudRes = await DiptaSupabaseService.clearAllCloudData();
        if (cloudRes.success) {
          cloudMsg = ' serta seluruh tabel database Supabase Cloud';
        }
      }

      if (onDataRefresh) {
        onDataRefresh();
      }

      setSyncFeedback({
        type: 'success',
        message: `Berhasil! Seluruh data (${stats.recordsDeleted} data perizinan hasil import, ${stats.batchesDeleted} batch import, dan ${stats.issuesDeleted} isu validasi${cloudMsg}) telah berhasil dibersihkan hingga kosong bersih.`
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Gagal membersihkan data: ${err?.message || 'Terjadi kesalahan sistem'}`
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div id="administration-view" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Administrasi, RBAC, & Master Mapping
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Pengelolaan pengguna DPMPTSP Kabupaten Ogan Komering Ilir, matriks kewenangan hak akses, dan aturan standardisasi status.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          id="tab-admin-users"
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'USERS'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pengguna Sistem ({users.length})</span>
        </button>

        <button
          id="tab-admin-roles"
          onClick={() => setActiveTab('ROLES')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'ROLES'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Matriks Hak Akses (RBAC)</span>
        </button>

        <button
          id="tab-admin-mapping"
          onClick={() => setActiveTab('MAPPING')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'MAPPING'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Master Pemetaan Status ({mappingRules.length})</span>
        </button>

        <button
          id="tab-admin-kecamatan"
          onClick={() => setActiveTab('KECAMATAN')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'KECAMATAN'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Master 18 Kecamatan OKI</span>
        </button>

        <button
          id="tab-admin-database"
          onClick={() => setActiveTab('DATABASE')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'DATABASE'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Database Supabase Cloud</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        <button
          id="tab-admin-vercel"
          onClick={() => setActiveTab('VERCEL')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'VERCEL'
              ? 'border-indigo-600 text-indigo-800 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>Deployment & Domain Vercel</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        </button>
      </div>

      {/* TAB 1: DAFTAR PENGGUNA (MASTER USER) */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          {/* User Feedback Alert */}
          {userFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
                userFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {userFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{userFeedback.message}</span>
              </div>
              <button
                onClick={() => setUserFeedback(null)}
                className="text-xs font-semibold underline hover:opacity-75"
              >
                Tutup
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Master Pengguna Sistem DPMPTSP Kabupaten Ogan Komering Ilir
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {filteredUsers.length} Pengguna
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pengelolaan akun aparatur, penugasan hak akses sektoral, dan status verifikasi pengguna.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama, NIP, email..."
                    value={searchUserQuery}
                    onChange={e => setSearchUserQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 w-44 sm:w-56"
                  />
                </div>

                {/* Role Filter */}
                <div className="relative">
                  <select
                    value={filterUserRole}
                    onChange={e => setFilterUserRole(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                  >
                    <option value="SEMUA">Semua Role ({users.length})</option>
                    {ROLE_DEFINITIONS.map(r => (
                      <option key={r.code} value={r.code}>
                        {r.name.replace(/\s*\(.*?\)/, '')} ({users.filter(u => u.role_code === r.code).length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add User Button */}
                <button
                  id="btn-add-user"
                  onClick={() => openCreateUserModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah Pengguna Baru</span>
                </button>
              </div>
            </div>

            {/* Empty Search Result */}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800">Tidak Ada Pengguna yang Cocok</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ubah kata kunci pencarian atau filter role di atas.
                </p>
                <button
                  onClick={() => { setSearchUserQuery(''); setFilterUserRole('SEMUA'); }}
                  className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Reset Filter
                </button>
              </div>
            )}

            {/* Mobile Users Cards */}
            {filteredUsers.length > 0 && (
              <div className="block md:hidden p-4 space-y-3">
                {paginatedUsers.map(u => {
                  const roleDef = ROLE_DEFINITIONS.find(r => r.code === u.role_code);
                  return (
                    <div
                      key={u.user_id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {u.full_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 text-xs">{u.full_name}</h4>
                            <p className="text-[11px] text-slate-500">{u.jabatan}</p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            u.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.is_active !== false ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Role:</span>
                          <span className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${roleDef?.badgeClass || 'bg-slate-100 text-slate-700'}`}>
                            {u.role_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">NIP / Username:</span>
                          <span className="font-mono text-slate-700">{u.nip || `@${u.username}`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Email:</span>
                          <span className="font-mono text-slate-600">{u.email || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                          <span className="text-slate-400">Password:</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            <Key className="w-2.5 h-2.5 text-slate-400" />
                            <span>{u.password || 'dipta2026'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          id={`btn-edit-user-mobile-${u.user_id}`}
                          onClick={() => openEditUserModal(u)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                            u.is_active !== false
                              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active !== false ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          <span>{u.is_active !== false ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>
                        {u.user_id !== 1 && u.user_id !== currentUser.user_id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Desktop Table */}
            {filteredUsers.length > 0 && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs text-left text-slate-700">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Nama & Gelar</th>
                      <th className="px-4 py-3 whitespace-nowrap">NIP / Username</th>
                      <th className="px-4 py-3 whitespace-nowrap">Kata Sandi</th>
                      <th className="px-4 py-3">Jabatan & Unit Kerja</th>
                      <th className="px-4 py-3 whitespace-nowrap">Role Sistem</th>
                      <th className="px-4 py-3 whitespace-nowrap">Email Kedinasan</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Aksi Kelola</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedUsers.map(u => {
                      const roleDef = ROLE_DEFINITIONS.find(r => r.code === u.role_code);
                      return (
                        <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                                {u.full_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-slate-900 font-semibold">{u.full_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">ID: USER-{u.user_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-mono text-slate-700">{u.nip || '-'}</div>
                            <div className="text-[10px] text-indigo-600 font-mono">@{u.username}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              <Key className="w-2.5 h-2.5 text-slate-400" />
                              <span>{u.password || 'dipta2026'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{u.jabatan}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">{u.unit_kerja || 'DPMPTSP OKI'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${roleDef?.badgeClass || 'bg-slate-100 text-slate-700'}`}>
                              {u.role_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {u.email || '-'}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                u.is_active !== false
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {u.is_active !== false ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Aktif</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-slate-400" />
                                  <span>Nonaktif</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                id={`btn-edit-user-${u.user_id}`}
                                onClick={() => openEditUserModal(u)}
                                title="Ubah data pengguna ini"
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              <button
                                id={`btn-toggle-user-${u.user_id}`}
                                onClick={() => handleToggleUserStatus(u)}
                                title={u.is_active !== false ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                                className={`p-1 rounded-md transition-colors ${
                                  u.is_active !== false
                                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              >
                                {u.is_active !== false ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>

                              {u.user_id !== 1 && u.user_id !== currentUser.user_id && (
                                <button
                                  id={`btn-delete-user-${u.user_id}`}
                                  onClick={() => handleDeleteUser(u)}
                                  title="Hapus akun pengguna"
                                  className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredUsers.length > userPageSize && (
              <Pagination
                currentPage={currentUserPage}
                totalItems={filteredUsers.length}
                itemsPerPage={userPageSize}
                onPageChange={setCurrentUserPage}
                onItemsPerPageChange={setUserPageSize}
                pageSizeOptions={[5, 10, 20]}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ROLE & PERMISSIONS MATRIX & ROLE USER MANAGEMENT (PRD Section 24) */}
      {activeTab === 'ROLES' && (
        <div className="space-y-6">
          {/* Section 1: Matriks Hak Akses Pengguna */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Matriks Hak Akses Pengguna & Kewenangan Sistem (PRD Bagian 24)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pembatasan fungsional berdasarkan regulasi internal DPMPTSP Kabupaten Ogan Komering Ilir.
                </p>
              </div>

              <button
                id="btn-add-user-from-roles"
                onClick={() => openCreateUserModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Pengguna Baru</span>
              </button>
            </div>

            {/* Desktop Table Matriks */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[750px] text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 whitespace-nowrap">Role Pengguna</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Dashboard</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Filter Global</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Detail Data</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Import Data</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Koreksi Kualitas</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Ekspor Laporan</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Admin Master</th>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap">Jumlah User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ROLE_DEFINITIONS.map(r => {
                    const count = users.filter(u => u.role_code === r.code).length;
                    return (
                      <tr key={r.code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{r.name}</div>
                          <div className="text-[10px] text-slate-400">{r.scope}</div>
                        </td>
                        <td className="px-3.5 py-3 text-center font-bold text-emerald-600">✓</td>
                        <td className="px-3.5 py-3 text-center font-bold text-emerald-600">✓</td>
                        <td className="px-3.5 py-3 text-center font-medium text-slate-700 whitespace-nowrap">{r.privileges.detail}</td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          {typeof r.privileges.imp === 'boolean' ? (
                            r.privileges.imp ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>
                          ) : (
                            <span className="text-sky-700 font-medium text-[11px]">{r.privileges.imp}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          {typeof r.privileges.corr === 'boolean' ? (
                            r.privileges.corr ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>
                          ) : (
                            <span className="text-sky-700 font-medium text-[11px]">{r.privileges.corr}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center font-bold text-emerald-600">✓</td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          {r.privileges.adm ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
                            {count} User
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Penugasan & Pengelolaan Pengguna per Role (Interaktif Edit & Tambah) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-indigo-600" />
                  <span>Daftar Pengguna & Penugasan Berdasarkan Role</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik 'Edit' untuk memodifikasi profil/role pengguna, atau '+ Tambah Pengguna' untuk menambahkan user baru pada role terkait.
                </p>
              </div>

              {/* Quick Role Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-400">Filter Role:</span>
                <select
                  value={selectedRoleForDetail}
                  onChange={e => setSelectedRoleForDetail(e.target.value as any)}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="SEMUA">Semua Role (8)</option>
                  {ROLE_DEFINITIONS.map(r => (
                    <option key={r.code} value={r.code}>
                      {r.name.replace(/\s*\(.*?\)/, '')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid of Role Management Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {ROLE_DEFINITIONS.filter(
                r => selectedRoleForDetail === 'SEMUA' || r.code === selectedRoleForDetail
              ).map(r => {
                const assignedUsers = users.filter(u => u.role_code === r.code);
                return (
                  <div
                    key={r.code}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50/70 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      {/* Role Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{r.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${r.badgeClass}`}>
                              {r.scope}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                            {r.description}
                          </p>
                        </div>

                        <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                          {assignedUsers.length} User
                        </span>
                      </div>

                      {/* List of Users Assigned */}
                      <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-3">
                        {assignedUsers.length === 0 ? (
                          <div className="p-3 bg-white border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                            Belum ada pengguna yang ditugaskan pada role ini.
                          </div>
                        ) : (
                          assignedUsers.map(u => (
                            <div
                              key={u.user_id}
                              className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {u.full_name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate">{u.full_name}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                    <span>{u.jabatan}</span>
                                    {u.nip && <span>• NIP: {u.nip}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                    u.is_active !== false
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {u.is_active !== false ? 'Aktif' : 'Nonaktif'}
                                </span>

                                <button
                                  id={`btn-role-edit-user-${u.user_id}`}
                                  onClick={() => openEditUserModal(u)}
                                  title="Ubah data pengguna ini"
                                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Quick Add User to this Role Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex justify-end">
                      <button
                        id={`btn-add-user-to-role-${r.code}`}
                        onClick={() => openCreateUserModal(r.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+ Tambah User ke Role {r.name.replace(/\s*\(.*?\)/, '')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER ATURAN STATUS MAPPING */}
      {activeTab === 'MAPPING' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Master Aturan Harmonisasi Status (status_mapping_rules)
              </h3>
              <p className="text-[11px] text-slate-500">
                Memetakan status unik dari tiap aplikasi sumber ke dalam 4 Status Standar DIPTA ({mappingRules.length} Aturan)
              </p>
            </div>

            {canEditAdmin && (
              <button
                id="btn-add-status-mapping"
                onClick={() => setShowAddMappingModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Aturan Mapping</span>
              </button>
            )}
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden p-4 space-y-3">
            {paginatedMappingRules.map(r => (
              <div
                key={r.mapping_id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                    {r.source_app}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {r.is_active ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-xs">
                  <div className="text-[11px] text-slate-500">
                    Status Asli: <span className="font-mono font-bold text-slate-900">{r.source_status}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400">Target DIPTA:</span>
                    <StatusBadge status={r.target_status_dipta} type="dipta" size="sm" />
                  </div>
                  {r.description && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      {r.description}
                    </div>
                  )}
                </div>

                {canEditAdmin && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleToggleRule(r.mapping_id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        r.is_active
                          ? 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {r.is_active ? 'Non-aktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[750px] text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Sumber Aplikasi</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status Asli Sumber</th>
                  <th className="px-4 py-3 whitespace-nowrap">Dipetakan ke Status DIPTA</th>
                  <th className="px-4 py-3">Keterangan / Regulasi</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Status Aturan</th>
                  {canEditAdmin && <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMappingRules.map(r => (
                  <tr key={r.mapping_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.source_app}</td>
                    <td className="px-4 py-3 font-mono text-slate-800 font-medium whitespace-nowrap">{r.source_status}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={r.target_status_dipta} type="dipta" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.description || '-'}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {r.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    {canEditAdmin && (
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleRule(r.mapping_id)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
                        >
                          {r.is_active ? 'Non-aktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentMappingPage}
            totalItems={mappingRules.length}
            itemsPerPage={mappingPageSize}
            onPageChange={setCurrentMappingPage}
            onItemsPerPageChange={setMappingPageSize}
            pageSizeOptions={[5, 10, 20]}
          />
        </div>
      )}

      {/* TAB 4: MASTER KECAMATAN */}
      {activeTab === 'KECAMATAN' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Wilayah Administrasi 18 Kecamatan Kabupaten Ogan Komering Ilir
          </h3>
          <p className="text-xs text-slate-500">
            Digunakan sebagai master standardisasi filtering spasial dan laporan distribusi perizinan.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
            {OKI_KECAMATAN_LIST.map((kec, i) => (
              <div
                key={kec}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800 flex items-center gap-1.5"
              >
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
                <span>{kec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SUPABASE CLOUD DATABASE INTEGRATION */}
      {activeTab === 'DATABASE' && (
        <div id="admin-supabase-database-tab" className="space-y-6">
          {/* Top Banner Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/80">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold tracking-tight">Koneksi Database Cloud Supabase</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        PostgreSQL Cloud
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Penyimpanan persisten cloud & sinkronisasi data konsolidasi perizinan DPMPTSP Kabupaten OKI.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
                  <span className="text-slate-400">Target Endpoint:</span>
                  <code className="px-2 py-0.5 rounded bg-slate-950/80 text-emerald-400 font-mono text-[11px] border border-slate-700">
                    {inputUrl}
                  </code>
                </div>
              </div>

              {/* Status Pill & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus?.connected
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse'
                      : connectionStatus && !connectionStatus.connected
                      ? 'bg-rose-500'
                      : supabaseConfig.anonKey
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`} />
                  <div>
                    <div className="text-[11px] font-bold leading-none">
                      {connectionStatus?.connected
                        ? 'Terhubung ke Supabase'
                        : connectionStatus && !connectionStatus.connected
                        ? 'Gagal Terhubung'
                        : supabaseConfig.anonKey
                        ? 'Siap Diuji'
                        : 'Memerlukan Anon Key'}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-none mt-1">
                      {connectionStatus?.latencyMs !== undefined
                        ? `Latensi: ${connectionStatus.latencyMs} ms`
                        : 'Belum dilakukan tes'}
                    </div>
                  </div>
                </div>

                <a
                  href={`https://supabase.com/dashboard/project/${inputUrl.split('//')[1]?.split('.')[0] || 'lajhgapanricrzlxlniq'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors"
                >
                  <span>Dashboard Supabase</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Feedback message banner if any */}
          {syncFeedback && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed flex-1">
                <strong>{syncFeedback.type === 'success' ? 'Sukses: ' : 'Perhatian: '}</strong>
                {syncFeedback.message}
              </div>
            </div>
          )}

          {/* 2-Columns Grid: Credentials Form & Sync Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Configuration Form (7 Cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span>Konfigurasi Kredensial Supabase</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Masukkan URL dan Anon Public Key dari project Supabase Anda.
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Client-Side Direct
                </span>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    Supabase Project URL:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={e => setInputUrl(e.target.value)}
                      placeholder="https://lajhgapanricrzlxlniq.supabase.co"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-emerald-600"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    URL API REST endpoint proyek Supabase Anda.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-700 block">
                      Supabase Anon / Public Key:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAnonKey(!showAnonKey)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-medium"
                    >
                      {showAnonKey ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sembunyikan Key</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Tampilkan Key</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showAnonKey ? 'text' : 'password'}
                      value={inputAnonKey}
                      onChange={e => setInputAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-emerald-600 pr-10"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Salin dari: <strong>Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API keys &gt; anon / public</strong>.
                  </p>
                </div>

                {/* Connection Status Box if tested */}
                {connectionStatus && (
                  <div
                    className={`p-3 rounded-lg border text-xs leading-snug space-y-1 ${
                      connectionStatus.connected
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {connectionStatus.connected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>Hasil Uji Koneksi:</span>
                    </div>
                    <p className="text-[11px] pl-5">{connectionStatus.statusText}</p>
                    {connectionStatus.latencyMs !== undefined && (
                      <p className="text-[10px] text-slate-500 pl-5">
                        Waktu respon: <strong>{connectionStatus.latencyMs} ms</strong>
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      DiptaSupabaseService.resetConfig();
                      const def = DiptaSupabaseService.getConfig();
                      setInputUrl(def.url);
                      setInputAnonKey('');
                      setConnectionStatus(null);
                      setSyncFeedback({ type: 'success', message: 'Setelan Supabase direset ke setelan awal pabrik.' });
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                  >
                    Reset ke Default URL
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin text-emerald-600' : ''}`} />
                      <span>{isTestingConnection ? 'Menguji...' : 'Uji Koneksi (Test Ping)'}</span>
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Kredensial</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Column 2: Data Synchronization Actions (5 Cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>Sinkronisasi Dua Arah (Cloud Sync)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unggah atau unduh dataset konsolidasi DIPTA secara langsung ke Cloud PostgreSQL.
                  </p>
                </div>

                <div className="space-y-3.5 pt-3">
                  {/* Action 1: Upload to Supabase */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <CloudUpload className="w-4 h-4 text-emerald-600" />
                          <span>Unggah ke Supabase (Upload)</span>
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Menyalin seluruh data konsolidasi lokal, riwayat batch, isu data quality, dan audit trail ke tabel database Supabase.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleUploadToSupabase}
                      disabled={isSyncing}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                      <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan & Unggah Data Lokal'}</span>
                    </button>
                  </div>

                  {/* Action 2: Download from Supabase */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <CloudDownload className="w-4 h-4 text-sky-600" />
                          <span>Tarik dari Supabase (Download)</span>
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Mengambil data konsolidasi terbaru yang ada di cloud Supabase dan menyelaraskannya ke tampilan dashboard aplikasi.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadFromSupabase}
                      disabled={isSyncing}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <CloudDownload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                      <span>{isSyncing ? 'Mengambil Data...' : 'Tarik Data Terbaru dari Cloud'}</span>
                    </button>
                  </div>

                  {/* Action 3: Clear Dummy Data */}
                  <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/70 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span>Hapus / Kosongkan Data Dummy & Hasil Import</span>
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Membersihkan seluruh baris data perizinan hasil import, batch riwayat, dan isu validasi dari penyimpanan lokal agar database siap menerima data operasional riil.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] text-rose-900 font-medium cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={includeCloud}
                        onChange={(e) => setIncludeCloud(e.target.checked)}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                      />
                      <span>Bersihkan juga data di Supabase Cloud (jika terhubung)</span>
                    </label>

                    <button
                      type="button"
                      id="btn-admin-clear-dummy"
                      onClick={handleClearDummyData}
                      disabled={isClearing}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
                      <span>{isClearing ? 'Sedang Membersihkan Data...' : 'Kosongkan Seluruh Data Dummy & Import'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sync Metadata Info */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Sinkronisasi Terakhir:</span>
                <strong className="text-slate-800 font-semibold">{lastSyncTime}</strong>
              </div>
            </div>
          </div>

          {/* Full-width Section: SQL Migration Script & Setup Guide */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span>Skrip SQL Lengkap: Skema 6 Tabel + Kirim Data Awal (Supabase SQL Editor)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jalankan skrip PostgreSQL ini di SQL Editor Supabase untuk membuat 6 tabel utama DIPTA beserta indeks, RLS, dan langsung mengisi data pengguna, aturan pemetaan status, serta rekaman pelayanan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    copiedSql
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                  }`}
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>SQL + Data Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-600" />
                      <span>Salin SQL Lengkap (Skema + Data)</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://supabase.com/dashboard/project/${inputUrl.split('//')[1]?.split('.')[0] || 'lajhgapanricrzlxlniq'}/sql/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <span>Salin & Buka SQL Editor Supabase</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Quick 3-Step Setup Instructions */}
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2.5">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Opsi Instan: Buat Tabel & Kirim Database Otomatis (Tanpa Buka SQL Editor)</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Jika Anda memiliki <strong>Supabase Personal Access Token</strong> (<code className="font-mono">sbp_...</code> dari <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noreferrer" className="underline font-semibold">supabase.com/dashboard/account/tokens</a>), tempelkan di bawah untuk membuat 6 tabel dan mengirim seluruh database secara otomatis dalam 1 klik:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="password"
                  value={supabaseAccessToken}
                  onChange={(e) => setSupabaseAccessToken(e.target.value)}
                  placeholder="sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-emerald-600"
                />
                <button
                  type="button"
                  onClick={handleAutoMigrateSupabase}
                  disabled={isAutoMigrating}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <CloudUpload className={`w-4 h-4 ${isAutoMigrating ? 'animate-bounce' : ''}`} />
                  <span>{isAutoMigrating ? 'Mengeksekusi ke Supabase...' : 'Buat Tabel & Kirim Database Otomatis'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] inline-flex items-center justify-center mb-1.5">
                  1
                </span>
                <div className="font-bold text-slate-800">Buka SQL Editor di Supabase</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik tombol <strong>Salin & Buka SQL Editor Supabase</strong> di atas untuk membuka proyek <code className="text-emerald-700 font-mono">lajhgapanricrzlxlniq</code>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] inline-flex items-center justify-center mb-1.5">
                  2
                </span>
                <div className="font-bold text-slate-800">Tempel & Klik Run</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tempelkan (Ctrl+V) skrip SQL di editor lalu klik <strong>Run</strong>. Keenam tabel beserta seluruh data awal akan langsung masuk ke Supabase.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] inline-flex items-center justify-center mb-1.5">
                  3
                </span>
                <div className="font-bold text-slate-800">Sinkronisasi Dua Arah Aktif</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Setelah tabel terbentuk, tombol <strong>Sinkronkan & Unggah Data Lokal</strong> dan <strong>Tarik dari Supabase</strong> siap digunakan kapan saja.
                </p>
              </div>
            </div>

            {/* SQL Code Preview Container */}
            <div className="relative">
              <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-72 border border-slate-800 scrollbar-thin">
                <pre className="text-[11px] leading-relaxed select-all">
                  {fullSeedSql}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: STATUS & DOMAIN DEPLOYMENT VERCEL */}
      {activeTab === 'VERCEL' && (
        <div id="admin-vercel-tab" className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner: Deployment Overview */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl p-6 text-white border border-indigo-500/30 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Status: Berhasil Dideploy ke Vercel (Online)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edge Network Global • SSL/TLS Otomatis Aktif</span>
                </div>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Globe className="w-6 h-6 text-indigo-400" />
                  <span>Domain Publik Vercel Siap Digunakan</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Aplikasi DIPTA DPMPTSP Kabupaten Ogan Komering Ilir kini dapat diakses secara publik oleh seluruh aparatur, pimpinan, dan pemangku kepentingan melalui domain resmi dari platform Vercel.
                </p>
              </div>

              {/* Main Live Domain Box */}
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">
                    Alamat URL Publik Vercel:
                  </div>
                  <a
                    href={vercelDomainUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm sm:text-base font-bold text-white hover:text-emerald-300 underline underline-offset-4 flex items-center gap-1.5 truncate mt-0.5"
                  >
                    <span>{vercelDomainUrl}</span>
                    <ExternalLink className="w-4 h-4 shrink-0 text-emerald-400" />
                  </a>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyVercel(vercelDomainUrl, 'domain')}
                    className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {vercelCopied === 'domain' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{vercelCopied === 'domain' ? 'Tersalin!' : 'Salin URL'}</span>
                  </button>

                  <a
                    href={vercelDomainUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Buka Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 1-Click Redeploy with Vercel Token */}
              <form onSubmit={handleDirectDeployVercel} className="p-4 bg-white/5 rounded-xl border border-white/15 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-emerald-400" />
                    <span>Deploy Langsung Pembaruan Terbaru ke Akun Vercel Anda (REST API v13)</span>
                  </div>
                  <a
                    href="https://vercel.com/account/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-300 hover:text-white underline flex items-center gap-1"
                  >
                    <span>Buat Vercel Access Token</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    placeholder="Masukkan Vercel Token (dari vercel.com/account/tokens)..."
                    className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-400 focus:outline-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={isDeployingVercel}
                    className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isDeployingVercel ? 'animate-spin' : ''}`} />
                    <span>{isDeployingVercel ? 'Mengunggah & Mem-build di Vercel...' : 'Deploy ke Vercel Sekarang'}</span>
                  </button>
                </div>
                {vercelDeployFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-medium ${
                      vercelDeployFeedback.type === 'success'
                        ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                        : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
                    }`}
                  >
                    {vercelDeployFeedback.message}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* 2-Column Section: Claim Ownership & Custom Domain */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Claim Ownership (7 Cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Klaim Kepemilikan Permanen ke Akun Vercel Anda</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deployment publik di atas saat ini berstatus temporary. Klik tautan klaim resmi di bawah ini untuk menghubungkannya secara permanen ke akun Vercel pribadi atau kedinasan DPMPTSP OKI.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80 space-y-2.5">
                <div className="flex items-start gap-2 text-xs font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Tautan Klaim Resmi Deployment Vercel:</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-amber-200 font-mono text-[11px] text-slate-800 break-all select-all">
                  https://vercel.com/claim-deployment?code=e1e5e66f-c2df-4b94-84e3-b8880bac56e7
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="https://vercel.com/claim-deployment?code=e1e5e66f-c2df-4b94-84e3-b8880bac56e7"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Klaim ke Akun Vercel Sekarang</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyVercel('https://vercel.com/claim-deployment?code=e1e5e66f-c2df-4b94-84e3-b8880bac56e7', 'claim')}
                    className="px-3 py-2 rounded-lg border border-amber-300 hover:bg-amber-100/60 text-amber-900 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {vercelCopied === 'claim' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{vercelCopied === 'claim' ? 'Tautan Tersalin!' : 'Salin Tautan Klaim'}</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Claim Benefits */}
              <div className="space-y-2 pt-2 text-xs text-slate-600">
                <div className="font-semibold text-slate-800">Manfaat Setelah Mengklaim Proyek:</div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 pl-1">
                  <li>Deployment menjadi <strong>permanen</strong> (tidak kedaluwarsa).</li>
                  <li>Dapat mengatur nama domain kustom Vercel gratis (misal: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">dipta-dpmptsp-oki.vercel.app</code>).</li>
                  <li>Dapat dihubungkan ke domain resmi Pemerintah Kabupaten OKI (misal: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">dipta.okikab.go.id</code>).</li>
                  <li>Dapat dihubungkan langsung ke repositori GitHub untuk auto-deploy saat ada pembaruan kode.</li>
                </ul>
              </div>
            </div>

            {/* Column 2: Custom Domain Guide & DNS (5 Cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>Panduan Konfigurasi Domain Kustom</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Langkah mudah menghubungkan domain/subdomain khusus di Vercel Dashboard.
                  </p>
                </div>

                <div className="space-y-3 pt-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">1. Subdomain Gratis Vercel</div>
                    <p className="text-[11px] text-slate-500">
                      Buka menu <strong>Settings &gt; Domains</strong> di Vercel, lalu ketik nama yang diinginkan seperti:
                    </p>
                    <code className="block p-1.5 bg-white rounded border border-slate-200 text-indigo-700 font-mono text-[11px]">
                      dipta-dpmptsp-oki.vercel.app
                    </code>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">2. Domain Resmi Pemkab OKI (DNS)</div>
                    <p className="text-[11px] text-slate-500">
                      Jika menggunakan subdomain dinas (misal <code className="font-mono text-slate-700">dipta.okikab.go.id</code>), tambahkan DNS Record berikut:
                    </p>
                    <div className="bg-white p-2 rounded border border-slate-200 space-y-1 text-[10px] font-mono">
                      <div><strong>Tipe:</strong> CNAME</div>
                      <div><strong>Nama:</strong> dipta</div>
                      <div><strong>Target / Nilai:</strong> cname.vercel-dns.com</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Serverless API Status & Ping Tester */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Uji API Serverless Vercel:</span>
                  <button
                    type="button"
                    onClick={handleTestVercel}
                    disabled={vercelTestStatus.testing}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${vercelTestStatus.testing ? 'animate-spin text-indigo-600' : ''}`} />
                    <span>{vercelTestStatus.testing ? 'Menguji...' : 'Uji Ping API'}</span>
                  </button>
                </div>

                {vercelTestStatus.result && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Endpoint /api/health Berfungsi Normal</span>
                    </div>
                    {vercelTestStatus.latency && (
                      <div className="text-slate-500 text-[10px]">
                        Waktu respon edge: <strong>{vercelTestStatus.latency} ms</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full-width Section: Architecture & Config Files for Vercel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-700" />
                  <span>Konfigurasi Siap-Deploy (vercel.json & Serverless API Functions)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proyek telah dilengkapi berkas konfigurasi <code className="font-mono text-slate-800">vercel.json</code>, folder <code className="font-mono text-slate-800">api/</code> serverless, dan berkas abaikan <code className="font-mono text-slate-800">.vercelignore</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopyVercel(JSON.stringify({
                  version: 2,
                  buildCommand: "vite build",
                  outputDirectory: "dist",
                  rewrites: [
                    { source: "/api/health", destination: "/api/health" },
                    { source: "/api/ai/insight", destination: "/api/ai/insight" },
                    { source: "/(.*)", destination: "/index.html" }
                  ]
                }, null, 2), 'config')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {vercelCopied === 'config' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{vercelCopied === 'config' ? 'Tersalin!' : 'Salin vercel.json'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">Frontend Vite SPA (dist)</div>
                <p className="text-[11px] text-slate-500">
                  Kompilasi React 19 + Tailwind CSS v4 otomatis di-build ke direktori <code className="font-mono text-slate-700">dist/</code> dan di-cache pada CDN edge Vercel.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">Serverless API (/api/*)</div>
                <p className="text-[11px] text-slate-500">
                  Endpoint <code className="font-mono text-slate-700">/api/health</code> dan <code className="font-mono text-slate-700">/api/ai/insight</code> dieksekusi sebagai Vercel Serverless Functions Node.js.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">SPA Rewrites Routing</div>
                <p className="text-[11px] text-slate-500">
                  Seluruh navigasi rute halaman SPA di-rewrite ke <code className="font-mono text-slate-700">/index.html</code> sehingga reload halaman tidak pernah 404.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Status Mapping */}
      {showAddMappingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Tambah Aturan Pemetaan Status Baru
            </h3>

            <form onSubmit={handleAddRule} className="space-y-3.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sumber Aplikasi:</label>
                <select
                  value={newSourceApp}
                  onChange={e => setNewSourceApp(e.target.value as SourceApp)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                >
                  <option value="OSS-RBA">OSS-RBA</option>
                  <option value="SICANTIK">SICANTIK</option>
                  <option value="SIMBG">SIMBG</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Status Asli dari Aplikasi Sumber:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Menunggu Validasi Teknis"
                  value={newOriginalStatus}
                  onChange={e => setNewOriginalStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Dipetakan ke Status Standar DIPTA:
                </label>
                <select
                  value={newDiptaStatus}
                  onChange={e => setNewDiptaStatus(e.target.value as StatusDIPTA)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                >
                  <option value="SELESAI_TERBIT">SELESAI_TERBIT</option>
                  <option value="DALAM_PROSES">DALAM_PROSES</option>
                  <option value="DITOLAK">DITOLAK</option>
                  <option value="BELUM_DIKLASIFIKASIKAN">BELUM_DIKLASIFIKASIKAN</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan / Catatan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Aturan tambahan SK Kadis"
                  value={newKeterangan}
                  onChange={e => setNewKeterangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMappingModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Simpan Aturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / UBAH PENGGUNA (MASTER USER & INFO ROLE) */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  {editingUser ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingUser ? 'Ubah Data Pengguna Sistem' : 'Tambah Pengguna Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingUser
                      ? `Memperbarui akun dan kewenangan hak akses untuk ${editingUser.full_name}`
                      : 'Mendaftarkan aparatur / operator baru ke dalam sistem DIPTA DPMPTSP Kab. OKI'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 mt-4 text-xs">
              {/* Nama Lengkap & Gelar */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Eva Kaparina, S.Sos"
                  value={formFullName}
                  onChange={e => setFormFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Grid: Username & NIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Username Sistem <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">@</span>
                    <input
                      type="text"
                      required
                      placeholder="eva.kaparina"
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    NIP / Identitas Pegawai
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 197904122006042018"
                    value={formNip}
                    onChange={e => setFormNip(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Grid: Email & Jabatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Email Kedinasan
                  </label>
                  <input
                    type="email"
                    placeholder="nama@okikab.go.id"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Jabatan Resmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Operator OSS-RBA"
                    value={formJabatan}
                    onChange={e => setFormJabatan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Unit Kerja */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Unit Kerja / Bidang
                </label>
                <input
                  type="text"
                  placeholder="DPMPTSP Kabupaten Ogan Komering Ilir"
                  value={formUnitKerja}
                  onChange={e => setFormUnitKerja(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Role Sistem */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Role Sistem & Matriks Kewenangan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRoleCode}
                  onChange={e => setFormRoleCode(e.target.value as RoleCode)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  {ROLE_DEFINITIONS.map(r => (
                    <option key={r.code} value={r.code}>
                      {r.name} — {r.scope}
                    </option>
                  ))}
                </select>

                {/* Role Description Preview */}
                {(() => {
                  const currentRoleDef = ROLE_DEFINITIONS.find(r => r.code === formRoleCode);
                  return currentRoleDef ? (
                    <div className="mt-1.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                      <Shield className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-slate-800">{currentRoleDef.name}:</strong> {currentRoleDef.description}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Form Input Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 block">
                    Password / Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormPassword('dipta2026')}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold underline"
                    title="Gunakan kata sandi default sistem"
                  >
                    Reset ke Default (dipta2026)
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="dipta2026"
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Password standar seluruh pengguna: <code className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">dipta2026</code>.
                </p>
              </div>

              {/* Status Akun Aktif / Nonaktif */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Status Akun</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="user-status"
                      checked={formIsActive}
                      onChange={() => setFormIsActive(true)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex items-center gap-1 font-semibold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Aktif (Dapat Login & Akses)</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="user-status"
                      checked={!formIsActive}
                      onChange={() => setFormIsActive(false)}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Nonaktif (Blokir Akses)</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingUser ? 'Simpan Perubahan' : 'Daftarkan Pengguna'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
