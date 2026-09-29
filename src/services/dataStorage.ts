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

    if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_DIPTA_RECORDS));
    } else {
      // Extra safety check: if records still contain previous dummy identifiers, clear them immediately
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS) || '[]');
        const hasDummy = existing.some((r: any) =>
          r.id_dipta?.startsWith('DIPTA-OSS-') ||
          r.id_dipta?.startsWith('DIPTA-SIMBG-') ||
          r.id_dipta?.startsWith('DIPTA-SIC-') ||
          r.id_dipta?.startsWith('DIPTA-ANOMALY-')
        );
        if (hasDummy) {
          this.clearAllDummyData();
        }
      } catch {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.MAPPINGS)) {
      localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(INITIAL_STATUS_MAPPINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BATCHES)) {
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(INITIAL_IMPORT_BATCHES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ISSUES)) {
      localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(INITIAL_DATA_QUALITY_ISSUES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default logged in as Project Leader (Eva Kaparina, S.Sos)
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[1]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LAST_UPDATE)) {
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toLocaleString('id-ID') + ' WIB');
    }
  }

  // Clear all data (records, batches, quality issues, audit logs) to a clean blank state
  static clearAllDummyData(): { recordsDeleted: number; batchesDeleted: number; issuesDeleted: number; auditDeleted: number } {
    let recordsDeleted = 0;
    let batchesDeleted = 0;
    let issuesDeleted = 0;
    let auditDeleted = 0;

    try {
      const rec = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (rec) recordsDeleted = (JSON.parse(rec) || []).length;
      const bat = localStorage.getItem(STORAGE_KEYS.BATCHES);
      if (bat) batchesDeleted = (JSON.parse(bat) || []).length;
      const iss = localStorage.getItem(STORAGE_KEYS.ISSUES);
      if (iss) issuesDeleted = (JSON.parse(iss) || []).length;
      const aud = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (aud) auditDeleted = (JSON.parse(aud) || []).length;
    } catch {
      // Ignore parse errors
    }

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

    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify([]));
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
    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(INITIAL_STATUS_MAPPINGS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[1]));
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toLocaleString('id-ID') + ' WIB');
  }

  // User & RBAC
  static getCurrentUser(): User {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    const user = raw ? JSON.parse(raw) : INITIAL_USERS[1];
    if (user && !user.password) {
      user.password = 'dipta2026';
    }
    return user;
  }

  static setCurrentUser(user: User): void {
    if (!user.password) {
      user.password = 'dipta2026';
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  static getAllUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure every user has password populated with dipta2026
        let changed = false;
        const mapped = parsed.map((u: User) => {
          if (!u.password) {
            changed = true;
            return { ...u, password: 'dipta2026' };
          }
          return u;
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mapped));
        }
        return mapped;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUsers(users: User[]): void {
    // Ensure all users have password
    const safeUsers = users.map(u => ({
      ...u,
      password: u.password || 'dipta2026'
    }));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(safeUsers));
    this.touchLastUpdated();
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
    return localStorage.getItem(STORAGE_KEYS.LAST_UPDATE) || new Date().toLocaleString('id-ID') + ' WIB';
  }

  static touchLastUpdated(): void {
    const now = new Date();
    const formatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, formatted);
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
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return raw ? JSON.parse(raw) : INITIAL_DIPTA_RECORDS;
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
    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(rules));
    this.touchLastUpdated();
  }

  static addBatch(batch: ImportBatch, newRecords: DiptaRecord[]): void {
    this.addImportBatch(batch);
    const existing = this.getRecords();
    const combined = [...newRecords, ...existing];
    this.saveRecords(combined);

    // Also auto-create issues for records that need verification
    const currentIssues = this.getDataQualityIssues();
    const newIssues: DataQualityIssue[] = [];
    newRecords.forEach(r => {
      if (r.status_validasi === 'PERLU_VERIFIKASI' || r.status_validasi === 'DUPLIKAT') {
        newIssues.push({
          issue_id: `ISS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
      this.saveIssues([...newIssues, ...currentIssues]);
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

  static saveRecords(records: DiptaRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    this.touchLastUpdated();
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
    const raw = localStorage.getItem(STORAGE_KEYS.MAPPINGS);
    return raw ? JSON.parse(raw) : INITIAL_STATUS_MAPPINGS;
  }

  static saveStatusMapping(rule: StatusMappingRule, user: User): void {
    const mappings = this.getStatusMappings();
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

    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(mappings));

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
    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(mappings));
  }

  // Automatically update records when status mapping changes
  private static reclassifyRecords(sourceApp: SourceApp, sourceStatus: string, newTarget: StatusDIPTA): void {
    const records = this.getRecords();
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
    const raw = localStorage.getItem(STORAGE_KEYS.ISSUES);
    return raw ? JSON.parse(raw) : INITIAL_DATA_QUALITY_ISSUES;
  }

  static saveIssues(issues: DataQualityIssue[]): void {
    localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(issues));
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

    this.saveIssues(issues);

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

        this.saveRecords(records);

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

  // Import Batches
  static getImportBatches(): ImportBatch[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BATCHES);
    return raw ? JSON.parse(raw) : INITIAL_IMPORT_BATCHES;
  }

  static addImportBatch(batch: ImportBatch): void {
    const batches = this.getImportBatches();
    batches.unshift(batch);
    localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
  }

  // Audit Logs
  static getAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    return raw ? JSON.parse(raw) : INITIAL_AUDIT_LOGS;
  }

  static addAuditLog(log: Omit<AuditLog, 'log_id'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      log_id: `AUD-${Date.now().toString().slice(-6)}`
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logs));
  }

  // Business Validation Engine for File Imports (PRD Sections 15 - 19 & UAT-01 to UAT-05)
  static validateAndMapRow(
    raw: Record<string, any>,
    sourceApp: SourceApp,
    datasetCode: DatasetCode,
    existingRecords: DiptaRecord[],
    statusMappings: StatusMappingRule[],
    duplicateAction: 'ABAIKAN' | 'PERBARUI' | 'TINJAU_PERBEDAAN' = 'TINJAU_PERBEDAAN'
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

    // Normalizing key lookups (case-insensitive & trim)
    const getVal = (...keys: string[]): any => {
      for (const k of keys) {
        for (const [rowKey, val] of Object.entries(raw)) {
          if (rowKey.toLowerCase().replace(/[\s_\-]/g, '') === k.toLowerCase().replace(/[\s_\-]/g, '')) {
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return typeof val === 'string' ? val.trim() : val;
            }
          }
        }
      }
      return undefined;
    };

    // 1. Identifier Check (Mandatory)
    let id_record_sumber = '';
    if (datasetCode === 'OSS_NIB') {
      id_record_sumber = getVal('nib', 'nomornib', 'id') || '';
    } else if (datasetCode === 'OSS_KEGIATAN') {
      id_record_sumber = getVal('idproyek', 'id_proyek', 'kodeproyek', 'id') || '';
    } else if (datasetCode === 'OSS_IZIN') {
      id_record_sumber = getVal('idpermohonanizin', 'id_izin', 'idpermohonan', 'id') || '';
    } else if (datasetCode === 'SICANTIK') {
      id_record_sumber = getVal('id', 'idsicantik', 'nomorpermohonan', 'no_permohonan') || '';
    } else if (datasetCode === 'SIMBG') {
      id_record_sumber = getVal('nomorregistrasi', 'noreg', 'no_registrasi', 'id') || '';
    }

    if (!id_record_sumber) {
      errors.push('id_record_sumber tidak boleh kosong (Missing identifier).');
    }

    // 2. Jenis Layanan Check (Mandatory)
    let jenis_layanan = getVal('jenislayanan', 'jenis_izin', 'namalayanan', 'permohonan', 'jenispermohonan', 'judul_kbli');
    if (!jenis_layanan) {
      if (datasetCode === 'OSS_NIB') jenis_layanan = 'Penerbitan NIB';
      else if (datasetCode === 'SIMBG') jenis_layanan = getVal('jenispermohonan') || 'PBG Bangunan Gedung';
      else {
        errors.push('jenis_layanan tidak boleh kosong.');
        jenis_layanan = 'Layanan Belum Diketahui';
      }
    }

    // 3. Tanggal checks & parse
    const parseDateStr = (rawVal: any): string | undefined => {
      if (!rawVal) return undefined;
      // Handle Excel numeric date
      if (typeof rawVal === 'number') {
        const d = new Date((rawVal - (25567 + 2)) * 86400 * 1000);
        return isNaN(d.getTime()) ? undefined : d.toISOString().split('T')[0];
      }
      const s = String(rawVal).trim();
      // If YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // If DD/MM/YYYY or DD-MM-YYYY
      const parts = s.split(/[\/\-\.]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      const parsed = new Date(s);
      return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split('T')[0];
    };

    const tglPermohonan = parseDateStr(getVal('tanggalpermohonan', 'tglpermohonan', 'tanggalpengajuan', 'tanggal'));
    const tglPenetapan = parseDateStr(getVal('tanggalpenetapan', 'tglpenetapan', 'tanggalterbit', 'tanggalizin'));

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

    // 4. Harmonisasi Status (UAT-03 & UAT-04)
    let status_asli = getVal('status', 'statusasli', 'statusperizinan', 'statuspermohonan') || '';
    const status_slf = getVal('statusslf', 'status_slf');

    // SIMBG Harmonization: Jika status kosong dan status_slf terisi, gunakan status_slf
    if (sourceApp === 'SIMBG' && (!status_asli || status_asli.trim() === '') && status_slf) {
      status_asli = status_slf;
      status_validasi = 'PERLU_VERIFIKASI';
      catatan_validasi = 'Harmonisasi SIMBG: Status utama kosong, menggunakan nilai dari Status SLF.';
    }

    // Determine DIPTA status via mapping lookup
    let status_dipta: StatusDIPTA = 'BELUM_DIKLASIFIKASIKAN';
    const match = statusMappings.find(
      m => m.is_active && m.source_app === sourceApp && m.source_status.toLowerCase() === status_asli.toLowerCase()
    );

    if (match) {
      status_dipta = match.target_status_dipta;
    } else {
      // If status exists but not mapped yet (PRD Section 17 & 10)
      if (status_asli) {
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
    let durasi_hari: number | undefined = undefined;
    if (tglPermohonan && tglPenetapan) {
      const d1 = new Date(tglPermohonan).getTime();
      const d2 = new Date(tglPenetapan).getTime();
      durasi_hari = Math.round((d2 - d1) / (1000 * 3600 * 24));
    }

    // Build Dipta Consolidated Record
    const nama_pemohon = getVal('namaperusahaan', 'namapemohon', 'namapemilik', 'nama') || 'Tanpa Nama';
    const kecamatan = getVal('kecamatan', 'lokasikecamatan') || 'Kayu Agung';
    const kelurahan = getVal('kelurahan', 'desa');
    const nomor_permohonan = getVal('nomorpermohonan', 'no_permohonan', 'nomorregistrasi');
    const nomor_dokumen = getVal('nomordokumen', 'nomorizin', 'no_izin', 'sk_pbg');
    const periode_data = tglPermohonan ? tglPermohonan.substring(0, 7) : new Date().toISOString().substring(0, 7);

    // Domain specific fields
    const investasi = Number(getVal('investasi', 'nilaiinvestasi', 'investasirupiah')) || undefined;
    const tki = Number(getVal('tki', 'tenagakerja', 'jumlah_tenaga_kerja')) || undefined;
    const kbli_code = getVal('kbli', 'kodekbli');
    const kbli_title = getVal('judulkbli', 'nama_kbli');
    const sektor = getVal('sektor', 'bidang');
    const skala_usaha = getVal('skalausaha', 'skala') as any;
    const risiko_usaha = getVal('risiko', 'tingkatrisiko') as any;

    const record: DiptaRecord = {
      id_dipta: `DIPTA-${sourceApp.substring(0, 3)}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
      sumber_aplikasi: sourceApp,
      jenis_dataset: datasetCode,
      id_record_sumber: id_record_sumber,
      nomor_permohonan: nomor_permohonan,
      nib: getVal('nib'),
      id_proyek: getVal('idproyek', 'id_proyek'),
      nama_pemohon_usaha: nama_pemohon,
      kelompok_layanan:
        sourceApp === 'OSS-RBA'
          ? (datasetCode === 'OSS_KEGIATAN' ? 'Kegiatan Usaha / Proyek' : 'Perizinan Berusaha')
          : sourceApp === 'SICANTIK'
          ? 'Pelayanan Non-Perizinan Daerah'
          : 'Persetujuan Bangunan Gedung (PBG)',
      jenis_layanan: jenis_layanan,
      tanggal_permohonan: tglPermohonan,
      tanggal_penetapan_terbit: tglPenetapan,
      nomor_dokumen: nomor_dokumen,
      status_asli: status_asli || 'Status Terdaftar',
      status_dipta: status_dipta,
      kecamatan: kecamatan,
      kelurahan: kelurahan,
      periode_data: periode_data,
      status_validasi: errors.length > 0 ? 'ERROR_IMPORT' : status_validasi,
      catatan_validasi: errors.length > 0 ? errors.join('; ') : catatan_validasi,
      tanggal_update_dipta: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operator_update: 'System Importer',
      investasi_rupiah: investasi,
      tki_count: tki,
      kbli_code: kbli_code,
      kbli_title: kbli_title,
      sektor: sektor,
      skala_usaha: skala_usaha,
      risiko_usaha: risiko_usaha,
      durasi_hari: durasi_hari,
      fungsi_bangunan: getVal('fungsibangunan', 'fungsi') as any,
      subfungsi_bangunan: getVal('subfungsi', 'sub_fungsi'),
      luas_m2: Number(getVal('luas', 'luasbangunan')) || undefined,
      jumlah_lantai: Number(getVal('lantai', 'jumlahlantai')) || undefined,
      jumlah_unit: Number(getVal('unit', 'jumlahunit')) || undefined
    };

    return {
      record,
      isValid: errors.length === 0,
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

    const recordResult = await DiptaSupabaseService.uploadRecordsToSupabase(records);
    if (!recordResult.success) {
      return { success: false, recordsCount: 0, error: recordResult.error };
    }

    // Also upload ancillary tables in background
    await Promise.allSettled([
      DiptaSupabaseService.uploadBatchesToSupabase(batches),
      DiptaSupabaseService.uploadIssuesToSupabase(issues),
      DiptaSupabaseService.uploadAuditLogsToSupabase(logs),
      DiptaSupabaseService.uploadMappingsToSupabase(mappings)
    ]);

    this.touchLastUpdated();
    return { success: true, recordsCount: recordResult.count };
  }

  static async loadAllFromSupabase(): Promise<{ success: boolean; recordsCount: number; error?: string }> {
    const result = await DiptaSupabaseService.fetchRecordsFromSupabase();
    if (!result.success || !result.data) {
      return { success: false, recordsCount: 0, error: result.error };
    }

    if (result.data.length > 0) {
      this.saveRecords(result.data);
      this.touchLastUpdated();
    }
    return { success: true, recordsCount: result.data.length };
  }
}
