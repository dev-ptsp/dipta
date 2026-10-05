// DIPTA - Data Storage & Business Logic Service
import * as XLSX from 'xlsx';
import {
  User,
  RoleCode,
  SourceApp,
  DatasetCode,
  DiptaRecord,
  StatusMappingRule,
  ImportBatch,
  DataQualityIssue,
  AuditLog,
  GlobalFilter,
  StatusDIPTA,
  StatusValidasi
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_STATUS_MAPPINGS,
  INITIAL_IMPORT_BATCHES,
  INITIAL_DIPTA_RECORDS,
  INITIAL_DATA_QUALITY_ISSUES,
  INITIAL_AUDIT_LOGS
} from '../data/initialData';
import { DiptaSupabaseService } from './supabaseClient';

const STORAGE_KEYS = {
  RECORDS: 'dipta_records_v2',
  MAPPINGS: 'dipta_status_mappings_v1',
  BATCHES: 'dipta_batches_v2',
  ISSUES: 'dipta_issues_v2',
  AUDIT: 'dipta_audit_v2',
  CURRENT_USER: 'dipta_current_user_v1',
  LAST_UPDATE: 'dipta_last_update_v1',
  USERS: 'dipta_users_v2'
};

// In-memory store so the app works seamlessly with 50,000+ records even when browser localStorage reaches its ~5MB quota
const MEMORY_CACHE: {
  records: DiptaRecord[] | null;
  mappings: StatusMappingRule[] | null;
  batches: ImportBatch[] | null;
  issues: DataQualityIssue[] | null;
  audit: AuditLog[] | null;
  users: User[] | null;
} = {
  records: null,
  mappings: null,
  batches: null,
  issues: null,
  audit: null,
  users: null
};

// Strip undefined/empty properties from records to reduce JSON payload size by ~40%
function compactRecords<T extends Record<string, any>>(items: T[]): T[] {
  return items.map(item => {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v !== undefined && v !== null && v !== '') {
        clean[k] = v;
      }
    }
    return clean as T;
  });
}

// Safe wrapper around localStorage.setItem that never throws QuotaExceededError
function safeSetItem(key: string, value: any): boolean {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, str);
    return true;
  } catch (err: any) {
    // QuotaExceededError fallback: if saving an array, try saving a trimmed slice to localStorage while keeping full array in MEMORY_CACHE
    if (Array.isArray(value)) {
      const limits = [3000, 1500, 500, 100];
      for (const limit of limits) {
        if (value.length > limit) {
          try {
            localStorage.setItem(key, JSON.stringify(value.slice(0, limit)));
            return true;
          } catch {
            // Try smaller slice
          }
        }
      }
    }
    return false;
  }
}

export class DiptaStorageService {
  // Initialize storage: purge old mock records and ensure clean state
  static init(): void {
    try {
      // Purge old mock storage keys from browser cache
      localStorage.removeItem('dipta_records_v1');
      localStorage.removeItem('dipta_batches_v1');
      localStorage.removeItem('dipta_issues_v1');
      localStorage.removeItem('dipta_audit_v1');
    } catch {
      // Ignore if localStorage unavailable
    }

    try {
      if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
        safeSetItem(STORAGE_KEYS.RECORDS, INITIAL_DIPTA_RECORDS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.MAPPINGS)) {
        safeSetItem(STORAGE_KEYS.MAPPINGS, INITIAL_STATUS_MAPPINGS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.BATCHES)) {
        safeSetItem(STORAGE_KEYS.BATCHES, INITIAL_IMPORT_BATCHES);
      }
      if (!localStorage.getItem(STORAGE_KEYS.ISSUES)) {
        safeSetItem(STORAGE_KEYS.ISSUES, INITIAL_DATA_QUALITY_ISSUES);
      }
      if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
        safeSetItem(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        safeSetItem(STORAGE_KEYS.USERS, INITIAL_USERS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
        // Default logged in as Project Leader (Eva Kaparina, S.Sos)
        safeSetItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[1]);
      }
      if (!localStorage.getItem(STORAGE_KEYS.LAST_UPDATE)) {
        safeSetItem(STORAGE_KEYS.LAST_UPDATE, new Date().toLocaleString('id-ID') + ' WIB');
      }
    } catch {
      // Ignore storage initialization errors
    }
  }

  // Clear all data (records, batches, quality issues, audit logs) to a clean blank state
  static clearAllDummyData(): { recordsDeleted: number; batchesDeleted: number; issuesDeleted: number; auditDeleted: number } {
    const recordsDeleted = this.getRecords().length;
    const batchesDeleted = this.getImportBatches().length;
    const issuesDeleted = this.getDataQualityIssues().length;
    const auditDeleted = this.getAuditLogs().length;

    MEMORY_CACHE.records = [];
    MEMORY_CACHE.batches = [];
    MEMORY_CACHE.issues = [];
    MEMORY_CACHE.audit = [];

    try {
      localStorage.removeItem('dipta_records_v1');
      localStorage.removeItem('dipta_batches_v1');
      localStorage.removeItem('dipta_issues_v1');
      localStorage.removeItem('dipta_audit_v1');
      localStorage.removeItem('dipta_records');
      localStorage.removeItem('dipta_batches');
      localStorage.removeItem('dipta_issues');
      localStorage.removeItem('dipta_audit');
    } catch {
      // Ignore
    }

    safeSetItem(STORAGE_KEYS.RECORDS, []);
    safeSetItem(STORAGE_KEYS.BATCHES, []);
    safeSetItem(STORAGE_KEYS.ISSUES, []);
    safeSetItem(STORAGE_KEYS.AUDIT, []);
    this.touchLastUpdated();

    return {
      recordsDeleted,
      batchesDeleted,
      issuesDeleted,
      auditDeleted
    };
  }

  static resetToDefault(): void {
    this.clearAllDummyData();
    MEMORY_CACHE.mappings = INITIAL_STATUS_MAPPINGS;
    MEMORY_CACHE.users = INITIAL_USERS;
    safeSetItem(STORAGE_KEYS.MAPPINGS, INITIAL_STATUS_MAPPINGS);
    safeSetItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    safeSetItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[1]);
    safeSetItem(STORAGE_KEYS.LAST_UPDATE, new Date().toLocaleString('id-ID') + ' WIB');
  }

  // User & RBAC
  static getCurrentUser(): User {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const user = raw ? JSON.parse(raw) : INITIAL_USERS[1];
      if (user && !user.password) {
        user.password = 'dipta2026';
      }
      return user;
    } catch {
      return INITIAL_USERS[1];
    }
  }

  static setCurrentUser(user: User): void {
    if (!user.password) {
      user.password = 'dipta2026';
    }
    safeSetItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  static authenticate(identifier: string, password: string): { success: boolean; user?: User; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId) {
      return { success: false, error: 'Silakan masukkan username, email, atau NIP Anda.' };
    }

    if (!cleanPass) {
      return { success: false, error: 'Silakan masukkan password akun Anda.' };
    }

    const users = this.getAllUsers();
    const user = users.find(u =>
      u.username.toLowerCase() === cleanId ||
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.nip && u.nip.replace(/\s+/g, '') === cleanId.replace(/\s+/g, ''))
    );

    if (!user) {
      return { success: false, error: 'Akun dengan username atau NIP tersebut tidak ditemukan di sistem DPMPTSP OKI.' };
    }

    if (user.is_active === false) {
      return { success: false, error: 'Akun Anda sedang dinonaktifkan. Hubungi Administrator Sistem IT DPMPTSP OKI.' };
    }

    const expectedPassword = user.password || 'dipta2026';
    if (cleanPass !== expectedPassword) {
      return { success: false, error: 'Password yang Anda masukkan tidak sesuai.' };
    }

    // Update last_login_at
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    user.last_login_at = nowStr;
    this.saveUsers(users.map(u => u.user_id === user.user_id ? { ...u, last_login_at: nowStr } : u));
    this.setCurrentUser(user);
    safeSetItem('dipta_auth_session', {
      user_id: user.user_id,
      login_at: nowStr,
      expires_at: Date.now() + 86400000 // 24 hours
    });

    return { success: true, user };
  }

  static isAuthenticated(): boolean {
    try {
      const sessionRaw = localStorage.getItem('dipta_auth_session');
      if (!sessionRaw) {
        return false;
      }
      const session = JSON.parse(sessionRaw);
      return Boolean(session && session.user_id);
    } catch {
      return false;
    }
  }

  static logout(): void {
    try {
      localStorage.removeItem('dipta_auth_session');
    } catch {
      // Ignore
    }
  }

  static getAllUsers(): User[] {
    if (MEMORY_CACHE.users && MEMORY_CACHE.users.length > 0) {
      return MEMORY_CACHE.users;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!raw) {
        MEMORY_CACHE.users = INITIAL_USERS;
        safeSetItem(STORAGE_KEYS.USERS, INITIAL_USERS);
        return INITIAL_USERS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;
        const mapped = parsed.map((u: User) => {
          if (!u.password) {
            changed = true;
            return { ...u, password: 'dipta2026' };
          }
          return u;
        });
        MEMORY_CACHE.users = mapped;
        if (changed) {
          safeSetItem(STORAGE_KEYS.USERS, mapped);
        }
        return mapped;
      }
      MEMORY_CACHE.users = INITIAL_USERS;
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUsers(users: User[]): void {
    const safeUsers = users.map(u => ({
      ...u,
      password: u.password || 'dipta2026'
    }));
    MEMORY_CACHE.users = safeUsers;
    safeSetItem(STORAGE_KEYS.USERS, safeUsers);
    this.touchLastUpdated();
    if (DiptaSupabaseService.getConfig().isConfigured) {
      DiptaSupabaseService.uploadUsersToSupabase(safeUsers).catch(() => {});
    }
  }

  static addUser(userData: Omit<User, 'user_id'>, actor?: User): User {
    const users = this.getAllUsers();
    const maxId = users.reduce((max, u) => Math.max(max, u.user_id), 0);
    const newUser: User = {
      ...userData,
      user_id: maxId + 1,
      password: userData.password || 'dipta2026',
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      last_login_at: userData.last_login_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    const updated = [...users, newUser];
    this.saveUsers(updated);

    this.addAuditLog({
      waktu: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: actor?.full_name || 'System Admin',
      actor_user_id: actor?.user_id || 1,
      action_type: 'MAPPING_UPDATE',
      entity_type: 'USER',
      entity_id: `USER-${newUser.user_id}`,
      nilai_baru: `${newUser.full_name} (${newUser.role_name || newUser.role_code})`,
      alasan: `Penambahan akun pengguna baru: ${newUser.username}`
    });

    return newUser;
  }

  static updateUser(userId: number, updatedFields: Partial<User>, actor?: User): User | null {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.user_id === userId);
    if (index === -1) return null;

    const oldUser = users[index];
    const updatedUser: User = {
      ...oldUser,
      ...updatedFields,
      user_id: oldUser.user_id, // ensure ID is preserved
    };

    users[index] = updatedUser;
    this.saveUsers(users);

    // If current logged-in user was modified, keep session in sync
    const current = this.getCurrentUser();
    if (current.user_id === userId) {
      this.setCurrentUser(updatedUser);
    }

    this.addAuditLog({
      waktu: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: actor?.full_name || 'System Admin',
      actor_user_id: actor?.user_id || 1,
      action_type: 'KOREKSI',
      entity_type: 'USER',
      entity_id: `USER-${userId}`,
      nilai_lama: `${oldUser.full_name} (${oldUser.role_name || oldUser.role_code}, ${oldUser.jabatan})`,
      nilai_baru: `${updatedUser.full_name} (${updatedUser.role_name || updatedUser.role_code}, ${updatedUser.jabatan})`,
      alasan: `Pembaruan data pengguna: ${updatedUser.username}`
    });

    return updatedUser;
  }

  static deleteUser(userId: number, actor?: User): boolean {
    const users = this.getAllUsers();
    const target = users.find(u => u.user_id === userId);
    if (!target) return false;

    // Safety protections
    if (target.user_id === 1) {
      throw new Error('Akun Pengguna Utama (Kepala Dinas) tidak dapat dihapus.');
    }

    const current = this.getCurrentUser();
    if (current.user_id === userId) {
      throw new Error('Anda tidak dapat menghapus akun yang sedang aktif digunakan saat ini.');
    }

    const updated = users.filter(u => u.user_id !== userId);
    this.saveUsers(updated);

    this.addAuditLog({
      waktu: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: actor?.full_name || 'System Admin',
      actor_user_id: actor?.user_id || 1,
      action_type: 'KOREKSI',
      entity_type: 'USER',
      entity_id: `USER-${userId}`,
      nilai_lama: `${target.full_name} (${target.username})`,
      alasan: `Penghapusan akun pengguna: ${target.username}`
    });

    return true;
  }

  static getLastUpdated(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_UPDATE) || new Date().toLocaleString('id-ID') + ' WIB';
    } catch {
      return new Date().toLocaleString('id-ID') + ' WIB';
    }
  }

  static touchLastUpdated(): void {
    const now = new Date();
    const formatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    safeSetItem(STORAGE_KEYS.LAST_UPDATE, formatted);
  }

  // RBAC Permission Checking based on PRD Section 24 & DB
  static canUser(
    role: RoleCode,
    action: 'dashboard' | 'import' | 'edit' | 'validate' | 'quality' | 'export' | 'admin' | 'audit',
    targetSource?: SourceApp
  ): boolean {
    switch (role) {
      case 'SYSTEM_ADMIN':
        return true;
      case 'PROJECT_LEADER':
        return true;
      case 'DATA_ADMIN':
        return true;
      case 'PIMPINAN':
        return action === 'dashboard' || action === 'export';
      case 'VIEWER':
        return action === 'dashboard' || action === 'export';
      case 'OPERATOR_OSS':
        if (action === 'import' || action === 'validate' || action === 'quality') {
          return !targetSource || targetSource === 'OSS-RBA';
        }
        return action === 'dashboard';
      case 'OPERATOR_SICANTIK':
        if (action === 'import' || action === 'validate' || action === 'quality') {
          return !targetSource || targetSource === 'SICANTIK';
        }
        return action === 'dashboard';
      case 'OPERATOR_SIMBG':
        if (action === 'import' || action === 'validate' || action === 'quality') {
          return !targetSource || targetSource === 'SIMBG';
        }
        return action === 'dashboard';
      default:
        return false;
    }
  }

  // Records
  static getRecords(): DiptaRecord[] {
    if (MEMORY_CACHE.records !== null) {
      return MEMORY_CACHE.records;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
      const parsed = raw ? JSON.parse(raw) : INITIAL_DIPTA_RECORDS;
      MEMORY_CACHE.records = Array.isArray(parsed) ? parsed : INITIAL_DIPTA_RECORDS;
      return MEMORY_CACHE.records;
    } catch {
      return INITIAL_DIPTA_RECORDS;
    }
  }

  static getAllRecords(): DiptaRecord[] {
    return this.getRecords();
  }

  static getAllIssues(): DataQualityIssue[] {
    return this.getDataQualityIssues();
  }

  static getAllBatches(): ImportBatch[] {
    return this.getImportBatches();
  }

  static resetToInitialSeed(): void {
    this.resetToDefault();
  }

  static getStatusMappingRules(): StatusMappingRule[] {
    return this.getStatusMappings();
  }

  static saveStatusMappingRules(rules: StatusMappingRule[]): void {
    MEMORY_CACHE.mappings = rules;
    safeSetItem(STORAGE_KEYS.MAPPINGS, rules);
    this.touchLastUpdated();
    if (DiptaSupabaseService.getConfig().isConfigured) {
      DiptaSupabaseService.uploadMappingsToSupabase(rules).catch(() => {});
    }
  }

  static addBatch(batch: ImportBatch, newRecords: DiptaRecord[]): void {
    this.addImportBatch(batch);
    const existing = this.getRecords();
    const combined = [...newRecords, ...existing];
    this.saveRecords(combined, newRecords);

    // Also auto-create issues for records that need verification
    const currentIssues = this.getDataQualityIssues();
    const newIssues: DataQualityIssue[] = [];
    newRecords.forEach(r => {
      if (r.status_validasi === 'PERLU_VERIFIKASI' || r.status_validasi === 'DUPLIKAT') {
        newIssues.push({
          issue_id: `ISS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          id_dipta: r.id_dipta,
          sumber_aplikasi: r.sumber_aplikasi,
          dataset_code: r.jenis_dataset,
          id_record_sumber: r.id_record_sumber,
          jenis_error: r.status_validasi === 'DUPLIKAT' ? 'DUPLIKASI' : 'ANOMALI_TANGGAL',
          deskripsi: r.catatan_validasi || 'Terdeteksi anomali pada saat proses import',
          nilai_saat_ini: `Tgl Permohonan: ${r.tanggal_permohonan || '-'}, Tgl Terbit: ${r.tanggal_penetapan_terbit || '-'}`,
          status_isu: 'TERBUKA',
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        });
      }
    });

    if (newIssues.length > 0) {
      this.saveIssues([...newIssues, ...currentIssues], newIssues);
    }

    this.addAuditLog({
      waktu: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: batch.imported_by_name,
      actor_user_id: batch.imported_by_user_id,
      action_type: 'IMPORT',
      entity_type: 'BATCH',
      entity_id: batch.batch_id,
      sumber_aplikasi: batch.source_app,
      nilai_baru: `${batch.row_valid} valid, ${batch.row_invalid} invalid dari ${batch.row_total} baris`,
      alasan: `Import berkas ${batch.file_name} (${batch.dataset_code})`
    });
  }

  static saveRecords(records: DiptaRecord[], deltaRecords?: DiptaRecord[]): void {
    const compacted = compactRecords(records);
    MEMORY_CACHE.records = compacted;
    safeSetItem(STORAGE_KEYS.RECORDS, compacted);
    this.touchLastUpdated();
    if (DiptaSupabaseService.getConfig().isConfigured) {
      const toUpload = deltaRecords && deltaRecords.length > 0 ? deltaRecords : compacted;
      DiptaSupabaseService.uploadRecordsToSupabase(toUpload).catch(() => {});
    }
  }

  // Filtered records
  static filterRecords(filter: GlobalFilter): DiptaRecord[] {
    let records = this.getRecords();

    if (filter.sumber_aplikasi && filter.sumber_aplikasi !== 'SEMUA') {
      records = records.filter(r => r.sumber_aplikasi === filter.sumber_aplikasi);
    }
    if (filter.status_dipta && filter.status_dipta !== 'SEMUA') {
      records = records.filter(r => r.status_dipta === filter.status_dipta);
    }
    if (filter.jenis_layanan && filter.jenis_layanan !== 'SEMUA') {
      records = records.filter(r => r.jenis_layanan === filter.jenis_layanan);
    }
    if (filter.kecamatan && filter.kecamatan !== 'SEMUA') {
      records = records.filter(r => r.kecamatan === filter.kecamatan);
    }
    if (filter.periode_start) {
      records = records.filter(r => r.periode_data >= filter.periode_start!);
    }
    if (filter.periode_end) {
      records = records.filter(r => r.periode_data <= filter.periode_end!);
    }
    if (filter.search_query && filter.search_query.trim() !== '') {
      const q = filter.search_query.toLowerCase().trim();
      records = records.filter(r =>
        (r.id_record_sumber && r.id_record_sumber.toLowerCase().includes(q)) ||
        (r.nomor_permohonan && r.nomor_permohonan.toLowerCase().includes(q)) ||
        (r.nib && r.nib.toLowerCase().includes(q)) ||
        (r.nomor_dokumen && r.nomor_dokumen.toLowerCase().includes(q)) ||
        (r.nama_pemohon_usaha && r.nama_pemohon_usaha.toLowerCase().includes(q)) ||
        (r.jenis_layanan && r.jenis_layanan.toLowerCase().includes(q))
      );
    }

    return records;
  }

  // Status Mappings
  static getStatusMappings(): StatusMappingRule[] {
    if (MEMORY_CACHE.mappings !== null) {
      return MEMORY_CACHE.mappings;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MAPPINGS);
      const parsed = raw ? JSON.parse(raw) : INITIAL_STATUS_MAPPINGS;
      MEMORY_CACHE.mappings = Array.isArray(parsed) ? parsed : INITIAL_STATUS_MAPPINGS;
      return MEMORY_CACHE.mappings;
    } catch {
      return INITIAL_STATUS_MAPPINGS;
    }
  }

  static saveStatusMapping(rule: StatusMappingRule, user: User): void {
    const mappings = [...this.getStatusMappings()];
    const idx = mappings.findIndex(m => m.mapping_id === rule.mapping_id);
    const oldRule = idx >= 0 ? mappings[idx] : null;

    if (idx >= 0) {
      mappings[idx] = {
        ...rule,
        validated_by_user_id: user.user_id,
        validated_by_name: user.full_name,
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    } else {
      mappings.push({
        ...rule,
        mapping_id: `MAP-${rule.source_app.substring(0, 3)}-${Date.now().toString().slice(-4)}`,
        validated_by_user_id: user.user_id,
        validated_by_name: user.full_name,
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      });
    }

    MEMORY_CACHE.mappings = mappings;
    safeSetItem(STORAGE_KEYS.MAPPINGS, mappings);
    if (DiptaSupabaseService.getConfig().isConfigured) {
      DiptaSupabaseService.uploadMappingsToSupabase(mappings).catch(() => {});
    }

    // Audit log
    this.addAuditLog({
      waktu: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: user.full_name,
      actor_user_id: user.user_id,
      action_type: 'MAPPING_UPDATE',
      entity_type: 'MAPPING',
      entity_id: rule.mapping_id,
      sumber_aplikasi: rule.source_app,
      nilai_lama: oldRule ? oldRule.target_status_dipta : 'BARU',
      nilai_baru: rule.target_status_dipta,
      alasan: `Pembaruan mapping status ${rule.source_status} -> ${rule.target_status_dipta}`
    });

    // Re-evaluate unclassified / existing records with this source status
    this.reclassifyRecords(rule.source_app, rule.source_status, rule.target_status_dipta);
  }

  static deleteStatusMapping(mapping_id: string): void {
    const mappings = this.getStatusMappings().filter(m => m.mapping_id !== mapping_id);
    MEMORY_CACHE.mappings = mappings;
    safeSetItem(STORAGE_KEYS.MAPPINGS, mappings);
  }

  // Automatically update records when status mapping changes
  private static reclassifyRecords(sourceApp: SourceApp, sourceStatus: string, newTarget: StatusDIPTA): void {
    const records = [...this.getRecords()];
    let updated = false;
    records.forEach(r => {
      if (r.sumber_aplikasi === sourceApp && r.status_asli === sourceStatus) {
        r.status_dipta = newTarget;
        if (r.status_validasi === 'PERLU_VERIFIKASI' && r.catatan_validasi?.includes('Master Mapping')) {
          r.status_validasi = 'VALID';
          r.catatan_validasi = undefined;
        }
        updated = true;
      }
    });
    if (updated) {
      this.saveRecords(records);
    }
  }

  // Data Quality Issues
  static getDataQualityIssues(): DataQualityIssue[] {
    if (MEMORY_CACHE.issues !== null) {
      return MEMORY_CACHE.issues;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ISSUES);
      const parsed = raw ? JSON.parse(raw) : INITIAL_DATA_QUALITY_ISSUES;
      MEMORY_CACHE.issues = Array.isArray(parsed) ? parsed : INITIAL_DATA_QUALITY_ISSUES;
      return MEMORY_CACHE.issues;
    } catch {
      return INITIAL_DATA_QUALITY_ISSUES;
    }
  }

  static saveIssues(issues: DataQualityIssue[], deltaIssues?: DataQualityIssue[]): void {
    const compacted = compactRecords(issues);
    MEMORY_CACHE.issues = compacted;
    safeSetItem(STORAGE_KEYS.ISSUES, compacted);
    if (DiptaSupabaseService.getConfig().isConfigured) {
      const toUpload = deltaIssues && deltaIssues.length > 0 ? deltaIssues : compacted;
      DiptaSupabaseService.uploadIssuesToSupabase(toUpload).catch(() => {});
    }
  }

  static resolveIssue(
    issueId: string,
    action: 'TANDAI_VALID' | 'KOREKSI' | 'ABAIKAN',
    user: User,
    catatan?: string,
    koreksiData?: Partial<DiptaRecord>
  ): void {
    const issues = this.getDataQualityIssues();
    const idx = issues.findIndex(i => i.issue_id === issueId);
    if (idx < 0) return;

    const issue = issues[idx];
    issue.status_isu = action === 'TANDAI_VALID' ? 'TERVERIFIKASI' : action === 'KOREKSI' ? 'DIKOREKSI' : 'DIABAIKAN';
    issue.resolved_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    issue.resolved_by_name = user.full_name;
    issue.catatan_petugas = catatan;

    this.saveIssues(issues, [issue]);

    // If correction was made to the underlying record
    if (koreksiData || action === 'TANDAI_VALID') {
      const records = this.getRecords();
      const recIdx = records.findIndex(r => r.id_dipta === issue.id_dipta);
      if (recIdx >= 0) {
        const oldVal = JSON.stringify({
          status_validasi: records[recIdx].status_validasi,
          status_dipta: records[recIdx].status_dipta,
          tanggal_permohonan: records[recIdx].tanggal_permohonan,
          tanggal_penetapan_terbit: records[recIdx].tanggal_penetapan_terbit
        });

        if (action === 'TANDAI_VALID') {
          records[recIdx].status_validasi = 'VALID';
          records[recIdx].catatan_validasi = `Diverifikasi valid oleh ${user.full_name}: ${catatan || 'Telah dikonfirmasi sesuai berkas'}`;
        } else if (koreksiData) {
          records[recIdx] = {
            ...records[recIdx],
            ...koreksiData,
            status_validasi: 'VALID',
            tanggal_update_dipta: new Date().toISOString().replace('T', ' ').substring(0, 19),
            operator_update: user.full_name
          };
        }

        this.saveRecords(records, [records[recIdx]]);

        // Add audit trail for correction (PRD Section 21)
        this.addAuditLog({
          waktu: new Date().toISOString().replace('T', ' ').substring(0, 19),
          actor: user.full_name,
          actor_user_id: user.user_id,
          action_type: 'KOREKSI',
          entity_type: 'RECORD',
          entity_id: issue.id_dipta,
          sumber_aplikasi: issue.sumber_aplikasi,
          nilai_lama: oldVal,
          nilai_baru: JSON.stringify(koreksiData || { status_validasi: 'VALID' }),
          alasan: catatan || `Penyelesaian isu kualitas data: ${issue.jenis_error}`
        });
      }
    }
  }

  // Direct Action: Update Status DIPTA on a record with full validation, audit trail & issue sync
  static updateRecordStatusDipta(
    idDipta: string,
    newStatusDipta: StatusDIPTA,
    user: User,
    options?: {
      alasanPerubahan?: string;
      nomorDokumen?: string;
      tanggalPenetapanTerbit?: string;
      catatanValidasi?: string;
    }
  ): { success: boolean; record?: DiptaRecord; error?: string } {
    const records = this.getRecords();
    const idx = records.findIndex(r => r.id_dipta === idDipta);
    if (idx === -1) {
      return { success: false, error: 'Data berkas perizinan tidak ditemukan di sistem DIPTA.' };
    }

    const targetRecord = records[idx];

    // Permission check based on Role
    const role = user.role_code;
    const isGlobalAdmin = role === 'SYSTEM_ADMIN' || role === 'PROJECT_LEADER' || role === 'DATA_ADMIN';
    const isSourceOperator = 
      (role === 'OPERATOR_OSS' && targetRecord.sumber_aplikasi === 'OSS-RBA') ||
      (role === 'OPERATOR_SICANTIK' && targetRecord.sumber_aplikasi === 'SICANTIK') ||
      (role === 'OPERATOR_SIMBG' && targetRecord.sumber_aplikasi === 'SIMBG');

    if (!isGlobalAdmin && !isSourceOperator) {
      return {
        success: false,
        error: `Anda tidak memiliki hak akses untuk mengubah status permohonan dari aplikasi ${targetRecord.sumber_aplikasi}. Role Anda: ${user.role_name || user.role_code}`
      };
    }

    const oldStatus = targetRecord.status_dipta;
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const updatedRecord: DiptaRecord = {
      ...targetRecord,
      status_dipta: newStatusDipta,
      tanggal_update_dipta: nowIso,
      operator_update: user.full_name,
    };

    if (options?.nomorDokumen !== undefined) {
      updatedRecord.nomor_dokumen = options.nomorDokumen;
    }

    if (options?.tanggalPenetapanTerbit !== undefined && options.tanggalPenetapanTerbit !== '') {
      updatedRecord.tanggal_penetapan_terbit = options.tanggalPenetapanTerbit;
    } else if (newStatusDipta === 'SELESAI_TERBIT' && !updatedRecord.tanggal_penetapan_terbit) {
      updatedRecord.tanggal_penetapan_terbit = new Date().toISOString().substring(0, 10);
    }

    if (options?.catatanValidasi !== undefined) {
      updatedRecord.catatan_validasi = options.catatanValidasi;
    }

    // If status changed to valid completed state, mark validasi as VALID if previously unclassified
    if (targetRecord.status_validasi === 'PERLU_VERIFIKASI' && (newStatusDipta === 'SELESAI_TERBIT' || newStatusDipta === 'DALAM_PROSES')) {
      updatedRecord.status_validasi = 'VALID';
      updatedRecord.catatan_validasi = `Diverifikasi & disesuaikan oleh ${user.full_name}: ${options?.alasanPerubahan || 'Status DIPTA diperbarui'}`;
    }

    records[idx] = updatedRecord;
    this.saveRecords(records, [updatedRecord]);

    // Audit Log entry (PRD Section 21 - Audit Trail)
    this.addAuditLog({
      waktu: nowIso,
      actor: user.full_name,
      actor_user_id: user.user_id,
      action_type: 'KOREKSI',
      entity_type: 'RECORD',
      entity_id: targetRecord.id_dipta,
      sumber_aplikasi: targetRecord.sumber_aplikasi,
      nilai_lama: `Status DIPTA: ${oldStatus}`,
      nilai_baru: `Status DIPTA: ${newStatusDipta}`,
      alasan: options?.alasanPerubahan || `Perubahan status DIPTA menjadi ${newStatusDipta} oleh ${user.full_name}`
    });

    // Auto-resolve any pending data quality issue for this record if it was about status unclassified
    try {
      const issues = this.getDataQualityIssues();
      const updatedIssues: DataQualityIssue[] = [];
      issues.forEach(iss => {
        if (iss.id_dipta === idDipta && iss.status_isu === 'TERBUKA') {
          iss.status_isu = 'DIKOREKSI';
          iss.resolved_at = nowIso;
          iss.resolved_by_name = user.full_name;
          iss.catatan_petugas = `Status DIPTA disesuaikan menjadi ${newStatusDipta}. ${options?.alasanPerubahan || ''}`;
          updatedIssues.push(iss);
        }
      });
      if (updatedIssues.length > 0) {
        this.saveIssues(issues, updatedIssues);
      }
    } catch {
      // Non-blocking issue resolution
    }

    return { success: true, record: updatedRecord };
  }

  // Import Batches
  static getImportBatches(): ImportBatch[] {
    if (MEMORY_CACHE.batches !== null) {
      return MEMORY_CACHE.batches;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BATCHES);
      const parsed = raw ? JSON.parse(raw) : INITIAL_IMPORT_BATCHES;
      MEMORY_CACHE.batches = Array.isArray(parsed) ? parsed : INITIAL_IMPORT_BATCHES;
      return MEMORY_CACHE.batches;
    } catch {
      return INITIAL_IMPORT_BATCHES;
    }
  }

  static addImportBatch(batch: ImportBatch): void {
    const batches = [batch, ...this.getImportBatches()];
    MEMORY_CACHE.batches = batches;
    safeSetItem(STORAGE_KEYS.BATCHES, batches);
    if (DiptaSupabaseService.getConfig().isConfigured) {
      DiptaSupabaseService.uploadBatchesToSupabase([batch]).catch(() => {});
    }
  }

  // Audit Logs
  static getAuditLogs(): AuditLog[] {
    if (MEMORY_CACHE.audit !== null) {
      return MEMORY_CACHE.audit;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
      const parsed = raw ? JSON.parse(raw) : INITIAL_AUDIT_LOGS;
      MEMORY_CACHE.audit = Array.isArray(parsed) ? parsed : INITIAL_AUDIT_LOGS;
      return MEMORY_CACHE.audit;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  static addAuditLog(log: Omit<AuditLog, 'log_id'>): void {
    const newLog: AuditLog = {
      ...log,
      log_id: `AUD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`
    };
    const logs = [newLog, ...this.getAuditLogs()];
    MEMORY_CACHE.audit = logs;
    safeSetItem(STORAGE_KEYS.AUDIT, logs);
    if (DiptaSupabaseService.getConfig().isConfigured) {
      DiptaSupabaseService.uploadAuditLogsToSupabase([newLog]).catch(() => {});
    }
  }

  // Business Validation Engine for File Imports (PRD Sections 15 - 19 & UAT-01 to UAT-05)
  static validateAndMapRow(
    raw: Record<string, any>,
    sourceApp: SourceApp,
    datasetCode: DatasetCode,
    existingRecords: DiptaRecord[],
    statusMappings: StatusMappingRule[],
    duplicateAction: 'ABAIKAN' | 'PERBARUI' | 'TINJAU_PERBEDAAN' = 'TINJAU_PERBEDAAN',
    rowIndex: number = 0,
    fallbackPeriode?: string
  ): {
    record?: DiptaRecord;
    isValid: boolean;
    isDuplicate: boolean;
    isAnomalousDate: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isAnomalousDate = false;

    // Check if the entire row is empty
    const nonEmptyEntries = Object.entries(raw).filter(
      ([k, v]) => !k.startsWith('__EMPTY') || (v !== undefined && v !== null && String(v).trim() !== '')
    ).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');

    if (nonEmptyEntries.length === 0) {
      return {
        isValid: false,
        isDuplicate: false,
        isAnomalousDate: false,
        errors: ['Baris kosong (tidak memiliki nilai data).'],
        warnings: []
      };
    }

    // Normalize key helper (strip all non-alphanumeric chars: spaces, underscores, hyphens, dots, slashes, parens)
    const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Exact normalized key lookup
    const getVal = (...keys: string[]): any => {
      for (const k of keys) {
        const nk = normKey(k);
        for (const [rowKey, val] of Object.entries(raw)) {
          if (normKey(rowKey) === nk) {
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return typeof val === 'string' ? val.trim() : val;
            }
          }
        }
      }
      return undefined;
    };

    // 2. Partial/substring key lookup fallback (for varied export headers like "Nomor Permohonan (SICANTIK)")
    const getValFuzzy = (...substrings: string[]): any => {
      for (const sub of substrings) {
        const nsub = normKey(sub);
        for (const [rowKey, val] of Object.entries(raw)) {
          const nrow = normKey(rowKey);
          if (nrow.includes(nsub) && val !== undefined && val !== null && String(val).trim() !== '') {
            return typeof val === 'string' ? val.trim() : val;
          }
        }
      }
      return undefined;
    };

    // Helper to parse clean numbers (handles "Rp 35.000.000", "35,000,000", etc.)
    const parseCleanNumber = (val: any): number | undefined => {
      if (val === undefined || val === null || String(val).trim() === '') return undefined;
      if (typeof val === 'number') return isNaN(val) ? undefined : val;
      let s = String(val).trim().replace(/[Rp\s]/gi, '');
      // If format is 35.000.000,00 -> remove dots, replace comma with dot
      if (s.includes('.') && s.includes(',')) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          s = s.replace(/,/g, '');
        }
      } else if ((s.match(/\./g) || []).length > 1) {
        s = s.replace(/\./g, '');
      } else if ((s.match(/,/g) || []).length > 1) {
        s = s.replace(/,/g, '');
      } else if (s.includes('.') && /\.\d{3}$/.test(s)) {
        s = s.replace(/\./g, '');
      } else if (s.includes(',') && /,\d{3}$/.test(s)) {
        s = s.replace(/,/g, '');
      }
      const num = Number(s);
      return isNaN(num) ? undefined : num;
    };

    // 1. Identifier Extraction (Comprehensive for all 5 datasets + fallback auto-ID so valid rows never fail)
    let id_record_sumber = '';
    if (datasetCode === 'OSS_NIB') {
      id_record_sumber = String(
        getVal('nib', 'nomornib', 'nonib', 'idnib', 'nomorindukberusaha', 'id', 'no', 'nomor') ||
        getValFuzzy('nib', 'indukberusaha', 'id') ||
        ''
      );
    } else if (datasetCode === 'OSS_KEGIATAN') {
      id_record_sumber = String(
        getVal('idproyek', 'id_proyek', 'kodeproyek', 'nomorproyek', 'noproyek', 'idkegiatan', 'id_kegiatan', 'nib', 'nomornib', 'id', 'no', 'nomor') ||
        getValFuzzy('proyek', 'kegiatan', 'nib', 'id') ||
        ''
      );
    } else if (datasetCode === 'OSS_IZIN') {
      id_record_sumber = String(
        getVal('idperizinan', 'id_perizinan', 'idpermohonanizin', 'id_izin', 'idizin', 'idpermohonan', 'nomorizin', 'noizin', 'nomordokumen', 'nodokumen', 'nosk', 'idproyek', 'nib', 'id', 'no', 'nomor') ||
        getValFuzzy('perizinan', 'izin', 'dokumen', 'permohonan', 'proyek', 'nib', 'id') ||
        ''
      );
    } else if (datasetCode === 'SICANTIK') {
      id_record_sumber = String(
        getVal('idpermohonan', 'id_permohonan', 'idsicantik', 'id_sicantik', 'nomorpermohonan', 'nopermohonan', 'nomorregistrasi', 'noregistrasi', 'noagenda', 'nomoragenda', 'nomorizin', 'noizin', 'nosk', 'nomorsk', 'id', 'no', 'nomor') ||
        getValFuzzy('permohonan', 'registrasi', 'agenda', 'sicantik', 'izin', 'id') ||
        ''
      );
    } else if (datasetCode === 'SIMBG') {
      id_record_sumber = String(
        getVal('nomorregistrasi', 'noreg', 'no_registrasi', 'idpermohonan', 'nomorpermohonan', 'nomordokumen', 'skpbg', 'noskpbg', 'id', 'no', 'nomor') ||
        getValFuzzy('registrasi', 'pbg', 'slf', 'permohonan', 'dokumen', 'id') ||
        ''
      );
    }

    // If still empty, generate a deterministic ID so the row can still be imported
    if (!id_record_sumber || id_record_sumber.trim() === '') {
      const prefix =
        datasetCode === 'OSS_NIB' ? 'NIB' :
        datasetCode === 'OSS_KEGIATAN' ? 'PRJ' :
        datasetCode === 'OSS_IZIN' ? 'IZN' :
        datasetCode === 'SICANTIK' ? 'SC' : 'PBG';
      id_record_sumber = `${prefix}-OKI-${Date.now().toString().slice(-4)}-${rowIndex + 1}`;
      warnings.push(`ID Sumber otomatis dibuat (${id_record_sumber}) karena kolom ID utama kosong.`);
    }

    // 2. Jenis Layanan Extraction (Comprehensive for OSS Kegiatan Usaha, OSS Produk, SICANTIK, OSS NIB, SIMBG)
    let jenis_layanan = '';
    if (datasetCode === 'OSS_NIB') {
      jenis_layanan = String(
        getVal('jenislayanan', 'namalayanan', 'jenisusaha', 'bidangusaha', 'kbli', 'judulkbli', 'sektor') ||
        'Penerbitan Nomor Induk Berusaha (NIB)'
      );
    } else if (datasetCode === 'OSS_KEGIATAN') {
      jenis_layanan = String(
        getVal('judulkbli', 'judul_kbli', 'uraiankbli', 'uraianusaha', 'namausaha', 'nama_usaha', 'kegiatanusaha', 'bidangusaha', 'jenislayanan', 'namalayanan', 'sektor', 'kbli') ||
        getValFuzzy('kbli', 'uraian', 'kegiatan', 'usaha', 'layanan', 'sektor') ||
        'Kegiatan Usaha & Investasi OSS-RBA'
      );
    } else if (datasetCode === 'OSS_IZIN') {
      jenis_layanan = String(
        getVal('jenisdokumen', 'jenis_dokumen', 'namadokumen', 'nama_dokumen', 'jenisperizinan', 'jenis_perizinan', 'namaperizinan', 'jenisizin', 'jenis_izin', 'namaizin', 'jenislayanan', 'namalayanan', 'kategoridokumen', 'kategori_dokumen', 'produkperizinan', 'uraianizin', 'judulkbli', 'sektor') ||
        getValFuzzy('dokumen', 'perizinan', 'izin', 'layanan', 'produk', 'kbli') ||
        'Dokumen Perizinan Berusaha (OSS-RBA)'
      );
    } else if (datasetCode === 'SICANTIK') {
      jenis_layanan = String(
        getVal('jenislayanan', 'jenis_layanan', 'jenisizin', 'jenis_izin', 'namaizin', 'nama_izin', 'namalayanan', 'nama_layanan', 'jenispermohonan', 'permohonan', 'perihal', 'layanan', 'izin', 'kelompokizin') ||
        getValFuzzy('layanan', 'izin', 'permohonan', 'perihal') ||
        'Layanan Perizinan Non-Berusaha (SICANTIK)'
      );
    } else if (datasetCode === 'SIMBG') {
      jenis_layanan = String(
        getVal('jenispermohonan', 'jenis_permohonan', 'jenislayanan', 'jenisizin', 'fungsibangunan', 'subfungsibangunan', 'permohonan') ||
        getValFuzzy('permohonan', 'layanan', 'pbg', 'slf', 'fungsi') ||
        'Persetujuan Bangunan Gedung (PBG)'
      );
    }

    // 3. Tanggal checks & parse (supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Excel serial, Indonesian month names)
    const ID_MONTHS: Record<string, string> = {
      januari: '01', jan: '01',
      februari: '02', feb: '02', pebruari: '02',
      maret: '03', mar: '03',
      april: '04', apr: '04',
      mei: '05', may: '05',
      juni: '06', jun: '06',
      juli: '07', jul: '07',
      agustus: '08', agu: '08', agt: '08', aug: '08',
      september: '09', sep: '09', sept: '09',
      oktober: '10', okt: '10', oct: '10',
      november: '11', nov: '11', nopember: '11',
      desember: '12', des: '12', dec: '12'
    };

    const parseDateStr = (rawVal: any): string | undefined => {
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '' || String(rawVal).trim() === '-') return undefined;
      if (typeof rawVal === 'number') {
        const d = new Date(Math.round((rawVal - 25569) * 86400 * 1000));
        return isNaN(d.getTime()) ? undefined : d.toISOString().split('T')[0];
      }
      const s = String(rawVal).trim().split(' ')[0]; // strip time if YYYY-MM-DD HH:mm:ss
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

      // Check Indonesian date like "12 September 2026" or "12-Agu-2026"
      const fullStr = String(rawVal).trim().toLowerCase();
      const idMatch = fullStr.match(/^(\d{1,2})[\s\-\/]+([a-z]+)[\s\-\/]+(\d{4})/);
      if (idMatch) {
        const day = idMatch[1].padStart(2, '0');
        const mon = ID_MONTHS[idMatch[2]];
        const yr = idMatch[3];
        if (mon) return `${yr}-${mon}-${day}`;
      }

      const parts = s.split(/[\/\-\.]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      const parsed = new Date(String(rawVal).trim());
      return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split('T')[0];
    };

    const rawTglPermohonan =
      getVal('tanggalpermohonan', 'tglpermohonan', 'tanggalpengajuan', 'tglpengajuan', 'tanggaldaftar', 'tgldaftar', 'tanggalmasuk', 'tglmasuk', 'tanggalregistrasi', 'tanggal') ||
      getValFuzzy('permohonan', 'pengajuan', 'daftar', 'masuk');

    const rawTglPenetapan =
      getVal('tanggalpenetapan', 'tglpenetapan', 'tanggalterbit', 'tglterbit', 'tanggalterbitoss', 'tglterbitoss', 'tanggalizin', 'tglizin', 'tanggalselesai', 'tglselesai', 'tanggalsk', 'tglsk') ||
      getValFuzzy('penetapan', 'terbit', 'selesai');

    let tglPermohonan = parseDateStr(rawTglPermohonan);
    const tglPenetapan = parseDateStr(rawTglPenetapan);

    // For OSS_NIB or OSS_IZIN where only tanggal_terbit_oss / tanggal_izin is provided, also use it as tanggal_permohonan if tglPermohonan is empty
    if (!tglPermohonan && tglPenetapan) {
      tglPermohonan = tglPenetapan;
    }

    // UAT-05: Validasi tanggal jika tanggal_penetapan < tanggal_permohonan
    let status_validasi: StatusValidasi = 'VALID';
    let catatan_validasi: string | undefined = undefined;

    if (tglPermohonan && tglPenetapan) {
      if (tglPenetapan < tglPermohonan) {
        isAnomalousDate = true;
        status_validasi = 'PERLU_VERIFIKASI';
        catatan_validasi = 'Tanggal penetapan lebih awal daripada tanggal permohonan.';
        warnings.push('Tanggal penetapan lebih awal daripada tanggal permohonan.');
      }
    }

    // 4. Harmonisasi Status (UAT-03 & UAT-04) across all datasets
    let status_asli = String(
      getVal('status', 'statusasli', 'statusperizinan', 'statuskegiatan', 'statuspermohonan', 'statusizin', 'statusdokumen', 'statusproyek', 'statuspelayanan', 'statusakhir', 'prosesterakhir', 'tahapan') ||
      getValFuzzy('status', 'tahapan', 'proses') ||
      ''
    ).trim();

    const status_slf = getVal('statusslf', 'status_slf');

    // SIMBG Harmonization: Jika status kosong dan status_slf terisi, gunakan status_slf
    if (sourceApp === 'SIMBG' && !status_asli && status_slf) {
      status_asli = String(status_slf).trim();
      status_validasi = 'PERLU_VERIFIKASI';
      catatan_validasi = 'Harmonisasi SIMBG: Status utama kosong, menggunakan nilai dari Status SLF.';
    }

    if (!status_asli) {
      // Sensible default per dataset if status column is blank
      status_asli =
        datasetCode === 'OSS_NIB' ? 'Terbit otomatis' :
        datasetCode === 'OSS_KEGIATAN' ? 'Terverifikasi Teknis' :
        datasetCode === 'OSS_IZIN' ? 'Izin terbit / SS terverifikasi' :
        datasetCode === 'SICANTIK' ? 'Selesai Ditetapkan' :
        'SK PBG Terbit';
    }

    // Determine DIPTA status via mapping lookup + smart keyword matching
    let status_dipta: StatusDIPTA = 'BELUM_DIKLASIFIKASIKAN';
    const match = statusMappings.find(
      m => m.is_active && m.source_app === sourceApp && m.source_status.toLowerCase().trim() === status_asli.toLowerCase().trim()
    );

    if (match) {
      status_dipta = match.target_status_dipta;
    } else {
      const lowerStatus = status_asli.toLowerCase();
      if (
        lowerStatus.includes('terbit') ||
        lowerStatus.includes('selesai') ||
        lowerStatus.includes('terverifikasi') ||
        lowerStatus.includes('disetujui') ||
        lowerStatus.includes('ditetapkan') ||
        lowerStatus.includes('aktif') ||
        lowerStatus.includes('lunas')
      ) {
        status_dipta = 'SELESAI_TERBIT';
      } else if (
        lowerStatus.includes('proses') ||
        lowerStatus.includes('menunggu') ||
        lowerStatus.includes('verifikasi') ||
        lowerStatus.includes('konsultasi') ||
        lowerStatus.includes('perbaikan') ||
        lowerStatus.includes('tinjau') ||
        lowerStatus.includes('validasi') ||
        lowerStatus.includes('penugasan') ||
        lowerStatus.includes('pemeriksaan') ||
        lowerStatus.includes('evaluasi')
      ) {
        status_dipta = 'DALAM_PROSES';
      } else if (
        lowerStatus.includes('tolak') ||
        lowerStatus.includes('ditolak') ||
        lowerStatus.includes('batal') ||
        lowerStatus.includes('gugur')
      ) {
        status_dipta = 'DITOLAK';
      } else {
        status_dipta = 'BELUM_DIKLASIFIKASIKAN';
        status_validasi = 'PERLU_VERIFIKASI';
        catatan_validasi = `Status sumber "${status_asli}" belum terdapat di Master Mapping Status.`;
        warnings.push(`Status "${status_asli}" belum terpetakan di master status.`);
      }
    }

    // 5. Duplicate Check (Kombinasi: sumber_aplikasi + jenis_dataset + id_record_sumber)
    const existingIndex = existingRecords.findIndex(
      r => r.sumber_aplikasi === sourceApp && r.jenis_dataset === datasetCode && r.id_record_sumber === id_record_sumber
    );
    const isDuplicate = existingIndex >= 0;

    if (isDuplicate) {
      if (duplicateAction === 'ABAIKAN') {
        warnings.push('Data duplikat diabaikan.');
      } else if (duplicateAction === 'PERBARUI') {
        warnings.push('Data duplikat akan diperbarui.');
      } else {
        status_validasi = 'DUPLIKAT';
        catatan_validasi = `ID ${id_record_sumber} sudah ada di database. Butuh tinjau perbedaan.`;
        warnings.push(`Duplikasi terdeteksi pada ID ${id_record_sumber}.`);
      }
    }

    // Calculate duration for SICANTIK if dates are available
    let durasi_hari: number | undefined = parseCleanNumber(getVal('durasihari', 'durasi', 'lamaproses', 'sla'));
    if (durasi_hari === undefined && tglPermohonan && tglPenetapan) {
      const d1 = new Date(tglPermohonan).getTime();
      const d2 = new Date(tglPenetapan).getTime();
      const diff = Math.round((d2 - d1) / (1000 * 3600 * 24));
      if (!isNaN(diff) && diff >= 0) {
        durasi_hari = diff;
      }
    }

    // Build Dipta Consolidated Record
    const nama_pemohon = String(
      getVal('namaperusahaan', 'nama_perusahaan', 'namausaha', 'nama_usaha', 'namapemohon', 'nama_pemohon', 'namapelakuusaha', 'pelakuusaha', 'pemohon', 'perusahaan', 'namapemilik', 'pemilik', 'namalengkap', 'badanusaha', 'nama') ||
      getValFuzzy('perusahaan', 'pemohon', 'usaha', 'pemilik', 'nama') ||
      'Pemohon Terdata'
    );

    const rawKecamatan = String(
      getVal('kecamatan', 'lokasikecamatan', 'namakecamatan', 'lokasi', 'wilayah') ||
      getValFuzzy('kecamatan', 'lokasi') ||
      'Kayu Agung'
    ).replace(/^kec\.?\s*/i, '').trim();
    const kecamatan = rawKecamatan || 'Kayu Agung';

    const kelurahan = String(
      getVal('kelurahan', 'desa', 'kelurahandesa', 'namakelurahan', 'namadesa') ||
      getValFuzzy('kelurahan', 'desa') ||
      ''
    );

    const nomor_permohonan = getVal('nomorpermohonan', 'nopermohonan', 'nomorregistrasi', 'noregistrasi', 'noagenda', 'idpermohonan', 'idproyek');
    const nomor_dokumen = getVal('nomordokumen', 'nodokumen', 'nomorizin', 'noizin', 'nomorsk', 'nosk', 'skpbg', 'namadokumen');
    const periode_data = tglPermohonan
      ? tglPermohonan.substring(0, 7)
      : tglPenetapan
      ? tglPenetapan.substring(0, 7)
      : (fallbackPeriode || new Date().toISOString().substring(0, 7));

    // Domain specific fields
    const investasi = parseCleanNumber(getVal('investasi', 'nilaiinvestasi', 'investasirupiah', 'jumlahinvestasi', 'totalinvestasi', 'modalusaha') || getValFuzzy('investasi', 'modal'));
    const tki = parseCleanNumber(getVal('tki', 'tenagakerja', 'jumlahtenagakerja', 'tkicount', 'pekerja', 'jumlahtki') || getValFuzzy('tki', 'tenagakerja'));
    const kbli_code = getVal('kbli', 'kodekbli', 'kblicode') ? String(getVal('kbli', 'kodekbli', 'kblicode')) : undefined;
    const kbli_title = getVal('judulkbli', 'namakbli', 'uraiankbli', 'uraianusaha', 'kblititle');
    const sektor = getVal('sektor', 'sektorusaha', 'sektorpembina', 'bidang', 'bidangusaha');
    const skala_usaha = getVal('skalausaha', 'skala') as any;
    const risiko_usaha = getVal('risiko', 'tingkatrisiko', 'risikousaha') as any;
    const status_penanaman_modal = getVal('statuspenanamanmodal', 'penanamanmodal', 'modal') as any;
    const jenis_perusahaan = getVal('jenisperusahaan', 'bentukusaha', 'badanusaha') as any;

    // Normalize kategori_dokumen_oss for OSS_IZIN
    const rawKategoriDok = String(getVal('kategoridokumen', 'kategori_dokumen', 'kategoridokumenoss', 'jenisdokumen', 'jenisperizinan') || '');
    let kategori_dokumen_oss: DiptaRecord['kategori_dokumen_oss'] = undefined;
    if (datasetCode === 'OSS_IZIN') {
      const lk = rawKategoriDok.toLowerCase();
      if (lk.includes('sertifikat standar') || lk.includes('ss')) kategori_dokumen_oss = 'Sertifikat Standar';
      else if (lk.includes('umku') || lk.includes('pbumku')) kategori_dokumen_oss = 'UMKU';
      else if (lk.includes('dasar') || lk.includes('kkpr') || lk.includes('lingkungan')) kategori_dokumen_oss = 'Persyaratan Dasar';
      else kategori_dokumen_oss = 'Izin';
    }

    // Normalize SIMBG jenis permohonan
    const rawJenisSimbg = String(getVal('jenispermohonan', 'jenispermohonansimbg') || '');
    let jenis_permohonan_simbg: DiptaRecord['jenis_permohonan_simbg'] = undefined;
    if (datasetCode === 'SIMBG') {
      const ls = rawJenisSimbg.toLowerCase();
      if (ls.includes('slf')) jenis_permohonan_simbg = 'SLF Baru';
      else if (ls.includes('sbkbg')) jenis_permohonan_simbg = 'SBKBG';
      else jenis_permohonan_simbg = 'PBG';
    }

    const record: DiptaRecord = {
      id_dipta: `DIPTA-${Date.now()}-${rowIndex + 1}-${Math.floor(Math.random() * 900 + 100)}`,
      sumber_aplikasi: sourceApp,
      jenis_dataset: datasetCode,
      id_record_sumber: id_record_sumber,
      nomor_permohonan: nomor_permohonan ? String(nomor_permohonan) : undefined,
      nib: getVal('nib', 'nomornib') ? String(getVal('nib', 'nomornib')) : undefined,
      id_proyek: getVal('idproyek', 'id_proyek', 'kodeproyek') ? String(getVal('idproyek', 'id_proyek', 'kodeproyek')) : undefined,
      nama_pemohon_usaha: nama_pemohon,
      kelompok_layanan:
        sourceApp === 'OSS-RBA'
          ? (datasetCode === 'OSS_KEGIATAN'
              ? 'Kegiatan Usaha / Proyek'
              : datasetCode === 'OSS_IZIN'
              ? 'Produk & Dokumen Perizinan'
              : 'Perizinan Berusaha (NIB)')
          : sourceApp === 'SICANTIK'
          ? 'Pelayanan Perizinan & Non-Perizinan Daerah'
          : 'Persetujuan Bangunan Gedung (PBG/SLF)',
      jenis_layanan: jenis_layanan,
      tanggal_permohonan: tglPermohonan,
      tanggal_penetapan_terbit: tglPenetapan,
      nomor_dokumen: nomor_dokumen ? String(nomor_dokumen) : undefined,
      status_asli: status_asli || 'Terbit',
      status_dipta: status_dipta,
      kecamatan: kecamatan,
      kelurahan: kelurahan || undefined,
      periode_data: periode_data,
      status_validasi: status_validasi,
      catatan_validasi: catatan_validasi,
      tanggal_update_dipta: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operator_update: 'System Importer',
      investasi_rupiah: investasi,
      tki_count: tki,
      kbli_code: kbli_code,
      kbli_title: kbli_title ? String(kbli_title) : undefined,
      sektor: sektor ? String(sektor) : undefined,
      skala_usaha: skala_usaha,
      risiko_usaha: risiko_usaha,
      status_penanaman_modal: status_penanaman_modal,
      jenis_perusahaan: jenis_perusahaan,
      kategori_dokumen_oss: kategori_dokumen_oss,
      durasi_hari: durasi_hari,
      jenis_permohonan_simbg: jenis_permohonan_simbg,
      fungsi_bangunan: getVal('fungsibangunan', 'fungsi') as any,
      subfungsi_bangunan: getVal('subfungsibangunan', 'subfungsi', 'sub_fungsi') ? String(getVal('subfungsibangunan', 'subfungsi', 'sub_fungsi')) : undefined,
      luas_m2: parseCleanNumber(getVal('luasm2', 'luas', 'luasbangunan')),
      jumlah_lantai: parseCleanNumber(getVal('jumlahlantai', 'lantai')),
      jumlah_unit: parseCleanNumber(getVal('jumlahunit', 'unit'))
    };

    return {
      record,
      isValid: true,
      isDuplicate,
      isAnomalousDate,
      errors,
      warnings
    };
  }

  // Export to Real XLSX File (PRD Section 20 & 23)
  // File naming: DIPTA_[JenisLaporan]_[Tanggal].xlsx
  // Data Minimization: strictly no NIK, phone number, email
  static exportToExcel(
    records: DiptaRecord[],
    jenisLaporan: string = 'Rekapitulasi_Pelayanan'
  ): void {
    const cleanRows = records.map((r, i) => ({
      No: i + 1,
      ID_DIPTA: r.id_dipta,
      Sumber_Aplikasi: r.sumber_aplikasi,
      Jenis_Dataset: r.jenis_dataset,
      ID_Sumber: r.id_record_sumber,
      Nomor_Permohonan: r.nomor_permohonan || '-',
      NIB: r.nib || '-',
      Nama_Pemohon_Perusahaan: r.nama_pemohon_usaha,
      Kelompok_Layanan: r.kelompok_layanan,
      Jenis_Layanan: r.jenis_layanan,
      Tanggal_Permohonan: r.tanggal_permohonan || '-',
      Tanggal_Penetapan_Terbit: r.tanggal_penetapan_terbit || '-',
      Nomor_Dokumen: r.nomor_dokumen || '-',
      Status_Asli: r.status_asli,
      Status_DIPTA: r.status_dipta,
      Kecamatan: r.kecamatan || '-',
      Kelurahan: r.kelurahan || '-',
      Periode: r.periode_data,
      Status_Validasi: r.status_validasi,
      Catatan: r.catatan_validasi || '-',
      // Domain additions
      Investasi_Rp: r.investasi_rupiah || 0,
      Tenaga_Kerja: r.tki_count || 0,
      Fungsi_Bangunan: r.fungsi_bangunan || '-',
      Durasi_Hari: r.durasi_hari !== undefined ? r.durasi_hari : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(cleanRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DIPTA_Konsolidasi');

    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `DIPTA_${jenisLaporan}_${todayStr}.xlsx`;

    XLSX.writeFile(workbook, filename);
  }

  // Generate Sample Datasets for instant testing (PRD UAT-01 to UAT-05)
  static getSampleImportData(datasetCode: DatasetCode): Record<string, any>[] {
    switch (datasetCode) {
      case 'OSS_NIB':
        return [
          {
            NIB: '9120008889901',
            NamaPerusahaan: 'PT OKI Sawit Sejahtera Baru',
            TanggalTerbit: '2026-09-19',
            StatusPenanamanModal: 'PMDN',
            JenisPerusahaan: 'PT',
            SkalaUsaha: 'Besar',
            Kecamatan: 'Mesuji Makmur',
            Kelurahan: 'Bina Karsa',
            Status: 'Terbit otomatis'
          },
          {
            NIB: '9120008889902',
            NamaPerusahaan: 'CV Berkah Kayu Agung Mandiri',
            TanggalTerbit: '2026-09-20',
            StatusPenanamanModal: 'PMDN',
            JenisPerusahaan: 'CV',
            SkalaUsaha: 'Kecil',
            Kecamatan: 'Kayu Agung',
            Kelurahan: 'Kedaton',
            Status: 'Terbit otomatis'
          },
          // UAT-02: Test duplicate record
          {
            NIB: '9120001234567', // existing duplicate!
            NamaPerusahaan: 'PT Sawit Makmur Lempuing (Re-upload)',
            TanggalTerbit: '2026-09-21',
            StatusPenanamanModal: 'PMDN',
            JenisPerusahaan: 'PT',
            SkalaUsaha: 'Besar',
            Kecamatan: 'Lempuing',
            Kelurahan: 'Tugumulyo',
            Status: 'Terbit otomatis'
          }
        ];
      case 'OSS_KEGIATAN':
        return [
          {
            IdProyek: 'PRJ-OKI-2026-99',
            NIB: '9120008889901',
            NamaPerusahaan: 'PT OKI Sawit Sejahtera Baru',
            TanggalPengajuan: '2026-09-18',
            Risiko: 'Menengah Tinggi',
            SkalaUsaha: 'Besar',
            KBLI: '01262',
            JudulKBLI: 'Perkebunan Buah Kelapa Sawit',
            Sektor: 'Perkebunan & Pertanian',
            Kecamatan: 'Mesuji Makmur',
            Kelurahan: 'Bina Karsa',
            Investasi: 45000000000,
            TKI: 180,
            Status: 'Terbit otomatis'
          }
        ];
      case 'OSS_IZIN':
        return [
          {
            IdPermohonanIzin: 'IZIN-OSS-2026-88',
            IdProyek: 'PRJ-OKI-2026-99',
            NIB: '9120008889901',
            NamaPerusahaan: 'PT OKI Sawit Sejahtera Baru',
            TanggalIzin: '2026-09-20',
            JenisPerizinan: 'Sertifikat Standar Pengelolaan Limbah',
            NamaDokumen: 'SS-OSS-1602-2026-88',
            StatusPerizinan: 'Izin terbit / SS terverifikasi',
            KBLI: '01262',
            Risiko: 'Menengah Tinggi',
            Sektor: 'Lingkungan Hidup',
            Kecamatan: 'Mesuji Makmur',
            Kelurahan: 'Bina Karsa'
          }
        ];
      case 'SICANTIK':
        return [
          {
            ID: 'SIC-1602-01040',
            NomorPermohonan: 'REQ-SIC-2026-1040',
            JenisIzin: 'Surat Izin Praktik Dokter Gigi',
            TanggalPermohonan: '2026-09-12',
            TanggalPenetapan: '2026-09-17',
            NomorIzin: '446/092/SIP-DG/DPMPTSP-OKI/2026',
            Pemohon: 'drg. Annisa Fitriani',
            Lokasi: 'Kayu Agung',
            Status: 'Selesai Ditetapkan'
          },
          // UAT-05: Test Date Anomaly case
          {
            ID: 'SIC-1602-01041',
            NomorPermohonan: 'REQ-SIC-2026-1041',
            JenisIzin: 'Izin Operasional Lembaga Kursus',
            TanggalPermohonan: '2026-09-22',
            TanggalPenetapan: '2026-09-10', // Anomaly: penetapan < permohonan!
            NomorIzin: '421/014/IO-LK/DPMPTSP-OKI/2026',
            Pemohon: 'LKP Bina Prestasi Mandiri',
            Lokasi: 'Lempuing Jaya',
            Status: 'Selesai Ditetapkan'
          }
        ];
      case 'SIMBG':
        return [
          {
            NomorRegistrasi: 'SIMBG-160201-20260920-025',
            JenisPermohonan: 'PBG Bangunan Gedung Baru',
            Tanggal: '2026-09-18',
            NomorDokumen: 'SK-PBG-160201-20092026-025',
            Status: 'SK PBG Terbit',
            NamaPemilik: 'Hendra Gunawan',
            Kecamatan: 'Kayu Agung',
            Kelurahan: 'Perigi',
            FungsiBangunan: 'Hunian',
            Subfungsi: 'Rumah Tinggal',
            Luas: 180,
            Unit: 1,
            Lantai: 2
          },
          // UAT-04: Test SIMBG Harmonization case (Status kosong, Status SLF terisi)
          {
            NomorRegistrasi: 'SIMBG-160205-20260921-030',
            JenisPermohonan: 'SLF Bangunan Gudang',
            Tanggal: '2026-09-15',
            NomorDokumen: 'SLF-160205-21092026-030',
            Status: '', // Kosong!
            StatusSLF: 'Sertifikat SLF Terbit', // Fallback!
            NamaPemilik: 'PT OKI Logistik Raya',
            Kecamatan: 'Pedamaran Timur',
            Kelurahan: 'Pulau Gemantung',
            FungsiBangunan: 'Usaha',
            Subfungsi: 'Gudang Distribusi',
            Luas: 1500,
            Unit: 1,
            Lantai: 1
          }
        ];
    }
  }

  // Supabase Cloud Synchronization Helpers
  static async syncAllToSupabase(): Promise<{ success: boolean; recordsCount: number; error?: string }> {
    const records = this.getAllRecords();
    const batches = this.getAllBatches();
    const issues = this.getAllIssues();
    const logs = this.getAuditLogs();
    const mappings = this.getStatusMappingRules();
    const users = this.getAllUsers();

    // First test or upload users & mappings + records
    const [recordResult, mappingResult, userResult] = await Promise.all([
      DiptaSupabaseService.uploadRecordsToSupabase(records),
      DiptaSupabaseService.uploadMappingsToSupabase(mappings),
      DiptaSupabaseService.uploadUsersToSupabase(users)
    ]);

    if (!recordResult.success) {
      return { success: false, recordsCount: 0, error: recordResult.error };
    }
    if (!mappingResult.success && records.length === 0) {
      return {
        success: false,
        recordsCount: 0,
        error: mappingResult.error?.includes('PGRST205') || mappingResult.error?.includes('schema cache')
          ? 'Tabel database belum dibuat di proyek Supabase Anda. Klik tombol "Salin SQL Lengkap (Skema + Data)" di bawah lalu jalankan (Run) di Supabase SQL Editor.'
          : mappingResult.error
      };
    }

    // Also upload ancillary tables
    await Promise.allSettled([
      DiptaSupabaseService.uploadBatchesToSupabase(batches),
      DiptaSupabaseService.uploadIssuesToSupabase(issues),
      DiptaSupabaseService.uploadAuditLogsToSupabase(logs)
    ]);

    this.touchLastUpdated();
    return {
      success: true,
      recordsCount: records.length > 0 ? recordResult.count : users.length + mappings.length
    };
  }

  static async loadAllFromSupabase(): Promise<{ success: boolean; recordsCount: number; error?: string }> {
    const [recordsRes, batchesRes, issuesRes, logsRes, mappingsRes, usersRes] = await Promise.all([
      DiptaSupabaseService.fetchRecordsFromSupabase(),
      DiptaSupabaseService.fetchBatchesFromSupabase(),
      DiptaSupabaseService.fetchIssuesFromSupabase(),
      DiptaSupabaseService.fetchAuditLogsFromSupabase(),
      DiptaSupabaseService.fetchMappingsFromSupabase(),
      DiptaSupabaseService.fetchUsersFromSupabase()
    ]);

    if (!recordsRes.success) {
      return { success: false, recordsCount: 0, error: recordsRes.error };
    }

    if (recordsRes.data && recordsRes.data.length > 0) {
      const compacted = compactRecords(recordsRes.data);
      MEMORY_CACHE.records = compacted;
      safeSetItem(STORAGE_KEYS.RECORDS, compacted);
    }
    if (batchesRes.success && batchesRes.data && batchesRes.data.length > 0) {
      MEMORY_CACHE.batches = batchesRes.data;
      safeSetItem(STORAGE_KEYS.BATCHES, batchesRes.data);
    }
    if (issuesRes.success && issuesRes.data && issuesRes.data.length > 0) {
      const compactedIssues = compactRecords(issuesRes.data);
      MEMORY_CACHE.issues = compactedIssues;
      safeSetItem(STORAGE_KEYS.ISSUES, compactedIssues);
    }
    if (logsRes.success && logsRes.data && logsRes.data.length > 0) {
      MEMORY_CACHE.audit = logsRes.data;
      safeSetItem(STORAGE_KEYS.AUDIT, logsRes.data);
    }
    if (mappingsRes.success && mappingsRes.data && mappingsRes.data.length > 0) {
      MEMORY_CACHE.mappings = mappingsRes.data;
      safeSetItem(STORAGE_KEYS.MAPPINGS, mappingsRes.data);
    }
    if (usersRes.success && usersRes.data && usersRes.data.length > 0) {
      MEMORY_CACHE.users = usersRes.data;
      safeSetItem(STORAGE_KEYS.USERS, usersRes.data);
    }

    this.touchLastUpdated();
    return { success: true, recordsCount: (recordsRes.data || []).length };
  }
}
