// DIPTA - Modul Import Data 5 Dataset (PRD Section 15, 16, UAT-01 s/d UAT-05)
import React, { useState, useMemo, useEffect } from 'react';
import { SourceApp, DatasetCode, User, DiptaRecord, ImportBatch } from '../../types';
import { DiptaStorageService } from '../../services/dataStorage';
import { SAMPLE_RAW_DATASETS } from '../../data/initialData';
import { DiptaTemplateExcelService, DATASET_TEMPLATES, DatasetTemplateMeta } from '../../services/templateExcelService';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Layers,
  ArrowRight,
  RefreshCw,
  Eye,
  Check,
  X,
  FileCheck,
  Download,
  FileDown,
  Table,
  Info,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

interface ImportModuleViewProps {
  currentUser: User;
  onImportSuccess: () => void;
}

export const ImportModuleView: React.FC<ImportModuleViewProps> = ({
  currentUser,
  onImportSuccess
}) => {
  // Wizard Steps: 1: Select Dataset & File, 2: Preview & Validation, 3: Success Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Configuration
  const [selectedSource, setSelectedSource] = useState<SourceApp>('OSS-RBA');
  const [selectedDataset, setSelectedDataset] = useState<DatasetCode>('OSS_NIB');
  const [periodeData, setPeriodeData] = useState('2026-09');

  // File & Raw Data State
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [unrecognizedHeaders, setUnrecognizedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  // Validation Results
  const [validationResults, setValidationResults] = useState<{
    validRecords: Partial<DiptaRecord>[];
    issuesCount: number;
    duplicateCount: number;
    invalidRows: { row: number; reason: string; data: any }[];
  }>({
    validRecords: [],
    issuesCount: 0,
    duplicateCount: 0,
    invalidRows: []
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedBatch, setCompletedBatch] = useState<ImportBatch | null>(null);
  const [inspectingTemplate, setInspectingTemplate] = useState<DatasetTemplateMeta | null>(null);

  // Template download notification feedback
  const [templateDownloadMsg, setTemplateDownloadMsg] = useState<string | null>(null);

  const handleDownloadSingleTemplate = (code: DatasetCode) => {
    DiptaTemplateExcelService.downloadSingleTemplate(code);
    const meta = DATASET_TEMPLATES[code];
    setTemplateDownloadMsg(`Template "${meta.fileName}" berhasil diunduh!`);
    setTimeout(() => setTemplateDownloadMsg(null), 4000);
  };

  const handleDownloadAllTemplates = () => {
    DiptaTemplateExcelService.downloadAllTemplatesBundle();
    setTemplateDownloadMsg('Paket Komplit 5 Template Excel (Workbook 5 Sheet) berhasil diunduh!');
    setTimeout(() => setTemplateDownloadMsg(null), 4000);
  };

  // Pagination for Preview Table (Step 2)
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(5);

  useEffect(() => {
    setCurrentPreviewPage(1);
  }, [validationResults.validRecords]);

  const paginatedPreviewRecords = useMemo(() => {
    const start = (currentPreviewPage - 1) * previewPageSize;
    return validationResults.validRecords.slice(start, start + previewPageSize);
  }, [validationResults.validRecords, currentPreviewPage, previewPageSize]);

  // Available datasets based on selected source
  const datasetOptions: { type: DatasetCode; label: string; source: SourceApp }[] = [
    { type: 'OSS_NIB', label: '1. OSS-RBA — Master NIB Pelaku Usaha', source: 'OSS-RBA' },
    { type: 'OSS_KEGIATAN', label: '2. OSS-RBA — Kegiatan Usaha & Investasi', source: 'OSS-RBA' },
    { type: 'OSS_IZIN', label: '3. OSS-RBA — Produk & Dokumen Perizinan', source: 'OSS-RBA' },
    { type: 'SICANTIK', label: '4. SICANTIK Cloud — Pelayanan Perizinan Daerah', source: 'SICANTIK' },
    { type: 'SIMBG', label: '5. SIMBG — Persetujuan Bangunan Gedung (PBG & SLF)', source: 'SIMBG' }
  ];

  const handleSourceChange = (src: SourceApp) => {
    setSelectedSource(src);
    const firstMatch = datasetOptions.find(d => d.source === src);
    if (firstMatch) setSelectedDataset(firstMatch.type);
  };

  // Process uploaded or sample rows
  const processDataRows = (headers: string[], rows: any[], name: string) => {
    setFileName(name);
    setRawHeaders(headers);
    setParsedRows(rows);

    // Identify unrecognized columns
    const standardColumns = [
      'nib', 'id_proyek', 'id_perizinan', 'id_permohonan', 'nomor_registrasi',
      'nama_perusahaan', 'nama_pemohon', 'nama_usaha', 'status_penanaman_modal',
      'jenis_perusahaan', 'skala_usaha', 'kab_kota', 'kecamatan', 'kelurahan',
      'tanggal_terbit_oss', 'tanggal_permohonan', 'tgl_penetapan', 'tgl_permohonan',
      'status', 'status_izin', 'status_permohonan', 'investasi', 'tki', 'kbli',
      'judul_kbli', 'risiko', 'sektor', 'jenis_layanan', 'jenis_izin', 'jenis_dokumen',
      'nomor_izin', 'nomor_dokumen', 'fungsi_bangunan', 'subfungsi_bangunan', 'luas_m2', 'jumlah_lantai'
    ];
    const unrecognized = headers.filter(
      h => !standardColumns.some(sc => sc.toLowerCase() === h.toLowerCase().trim())
    );
    setUnrecognizedHeaders(unrecognized);

    // Run Validation via Storage Service
    const existingRecords = DiptaStorageService.getAllRecords();
    const rules = DiptaStorageService.getStatusMappingRules();

    const validRecords: Partial<DiptaRecord>[] = [];
    const invalidRows: { row: number; reason: string; data: any }[] = [];
    let duplicateCount = 0;
    let issuesCount = 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const res = DiptaStorageService.validateAndMapRow(
        row,
        selectedSource,
        selectedDataset,
        existingRecords,
        rules,
        'TINJAU_PERBEDAAN',
        idx,
        periodeData
      );

      if (res.isValid && res.record) {
        validRecords.push(res.record);
        if (res.record.status_validasi === 'PERLU_VERIFIKASI') issuesCount++;
        if (res.record.status_validasi === 'DUPLIKAT') duplicateCount++;
      } else {
        // Ignore completely empty trailing Excel rows from counting as invalid errors
        const isBlankRow = res.errors.some(e => e.includes('Baris kosong'));
        if (!isBlankRow) {
          invalidRows.push({
            row: rowNum,
            reason: res.errors.length > 0 ? res.errors.join(', ') : 'Data tidak memenuhi syarat mandatory',
            data: row
          });
        }
      }
    });

    setValidationResults({
      validRecords,
      issuesCount,
      duplicateCount,
      invalidRows
    });

    setCurrentStep(2);
  };

  // Smart Excel sheet & header detector (handles multi-sheet workbooks and title rows above table headers)
  const extractRowsFromWorkbook = (workbook: XLSX.WorkBook, targetDataset: DatasetCode): { headers: string[]; rows: any[] } => {
    // 1. Pick the best matching sheet if workbook has multiple sheets (e.g. Master Bundle 5 Sheet)
    const sheetHints: Record<DatasetCode, string[]> = {
      OSS_NIB: ['nib', '1_oss_nib', 'data_oss_nib'],
      OSS_KEGIATAN: ['kegiatan', 'proyek', '2_oss_kegiatan', 'data_oss_kegiatan'],
      OSS_IZIN: ['izin', 'produk', 'dokumen', '3_oss_izin', 'data_oss_izin'],
      SICANTIK: ['sicantik', '4_sicantik', 'data_sicantik'],
      SIMBG: ['simbg', 'pbg', 'bangunan', '5_simbg', 'data_simbg']
    };

    const hints = sheetHints[targetDataset] || [];
    let chosenSheetName = workbook.SheetNames[0];

    for (const sName of workbook.SheetNames) {
      const lower = sName.toLowerCase();
      if (lower.includes('panduan')) continue;
      if (hints.some(h => lower.includes(h))) {
        chosenSheetName = sName;
        break;
      }
    }

    // Also avoid picking PANDUAN sheet if it happens to be first
    if (chosenSheetName.toLowerCase().includes('panduan') && workbook.SheetNames.length > 1) {
      const nonGuide = workbook.SheetNames.find(s => !s.toLowerCase().includes('panduan'));
      if (nonGuide) chosenSheetName = nonGuide;
    }

    const worksheet = workbook.Sheets[chosenSheetName];

    // 2. Read as 2D array first to find the actual header row (in case exported files have title rows on row 1-5)
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) {
      return { headers: [], rows: [] };
    }

    const knownHeaderKeywords = [
      'nib', 'proyek', 'perizinan', 'permohonan', 'registrasi', 'perusahaan', 'usaha',
      'pemohon', 'kbli', 'kecamatan', 'status', 'tanggal', 'tgl', 'izin', 'dokumen', 'lokasi', 'sektor', 'investasi'
    ];

    let headerRowIndex = 0;
    let bestScore = -1;

    for (let r = 0; r < Math.min(rawMatrix.length, 12); r++) {
      const rowCells = (rawMatrix[r] || []).map(c => String(c || '').trim().toLowerCase());
      const nonEmptyCount = rowCells.filter(Boolean).length;
      if (nonEmptyCount < 2) continue;

      let matchCount = 0;
      rowCells.forEach(cell => {
        if (knownHeaderKeywords.some(kw => cell.includes(kw))) {
          matchCount++;
        }
      });

      const score = matchCount * 3 + nonEmptyCount;
      if (matchCount >= 1 && score > bestScore) {
        bestScore = score;
        headerRowIndex = r;
      }
    }

    const rawHeaderCells = (rawMatrix[headerRowIndex] || []).map((c, idx) => {
      const val = String(c || '').trim();
      return val || `Kolom_${idx + 1}`;
    });

    const dataRows: any[] = [];
    for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
      const rowArr = rawMatrix[r] || [];
      // Check if row has at least one non-empty value
      const hasValue = rowArr.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
      if (!hasValue) continue;

      const rowObj: Record<string, any> = {};
      rawHeaderCells.forEach((hKey, cIdx) => {
        rowObj[hKey] = rowArr[cIdx] !== undefined && rowArr[cIdx] !== null ? rowArr[cIdx] : '';
      });
      dataRows.push(rowObj);
    }

    return { headers: rawHeaderCells, rows: dataRows };
  };

  // Upload file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const { headers, rows } = extractRowsFromWorkbook(workbook, selectedDataset);

        if (rows.length === 0) {
          setTemplateDownloadMsg('Berkas Excel yang dipilih kosong atau tidak memiliki baris data.');
          return;
        }

        processDataRows(headers, rows, file.name);
      } catch (err: any) {
        setTemplateDownloadMsg(`Gagal membaca berkas Excel: ${err?.message || 'Format tidak didukung'}`);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input value so the same file can be re-selected if needed
    e.target.value = '';
  };

  // Preloaded Sample Data (For immediate interactive testing of UAT scenarios)
  const handleLoadSampleData = () => {
    const sample = DiptaStorageService.getSampleImportData(selectedDataset) || SAMPLE_RAW_DATASETS[selectedDataset];
    if (!sample || sample.length === 0) return;
    const headers = Object.keys(sample[0]);
    processDataRows(headers, sample, `sample_${selectedDataset.toLowerCase()}_kab_oki.xlsx`);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (validationResults.validRecords.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      const newBatchId = `BATCH-${Date.now()}`;
      const countValid = validationResults.validRecords.length;
      const countInvalid = validationResults.invalidRows.length;
      const countDuplicate = validationResults.duplicateCount;

      const newBatch: ImportBatch = {
        batch_id: newBatchId,
        source_app: selectedSource,
        dataset_code: selectedDataset,
        file_name: fileName,
        imported_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        imported_by_user_id: currentUser.user_id,
        imported_by_name: currentUser.full_name,
        row_total: parsedRows.length,
        row_valid: countValid,
        row_invalid: countInvalid,
        row_duplicate: countDuplicate,
        import_status: countInvalid === 0 ? 'BERHASIL' : countValid > 0 ? 'SEBAGIAN' : 'GAGAL',
        notes: `Import melalui modul wizard DIPTA (${selectedDataset})`
      };

      // Add records into storage (preserve nib, id_proyek, and all domain fields!)
      const fullRecordsToSave: DiptaRecord[] = validationResults.validRecords.map((partial, i) => ({
        id_dipta: partial.id_dipta || `DIPTA-${Date.now()}-${i + 1}`,
        batch_id: newBatchId,
        sumber_aplikasi: selectedSource,
        jenis_dataset: selectedDataset,
        id_record_sumber: partial.id_record_sumber || `REC-${i + 1}`,
        nomor_permohonan: partial.nomor_permohonan,
        nib: partial.nib,
        id_proyek: partial.id_proyek,
        nama_pemohon_usaha: partial.nama_pemohon_usaha || 'Pemohon Terdata',
        kelompok_layanan: partial.kelompok_layanan || 'Perizinan',
        jenis_layanan: partial.jenis_layanan || 'Layanan Standar',
        kecamatan: partial.kecamatan || 'Kayu Agung',
        kelurahan: partial.kelurahan || '',
        tanggal_permohonan: partial.tanggal_permohonan,
        tanggal_penetapan_terbit: partial.tanggal_penetapan_terbit,
        nomor_dokumen: partial.nomor_dokumen,
        status_asli: partial.status_asli || 'TERBIT',
        status_dipta: partial.status_dipta || 'SELESAI_TERBIT',
        status_validasi: partial.status_validasi || 'VALID',
        catatan_validasi: partial.catatan_validasi,
        periode_data: partial.periode_data || periodeData,
        durasi_hari: partial.durasi_hari,
        investasi_rupiah: partial.investasi_rupiah,
        tki_count: partial.tki_count,
        kbli_code: partial.kbli_code,
        kbli_title: partial.kbli_title,
        risiko_usaha: partial.risiko_usaha,
        sektor: partial.sektor,
        skala_usaha: partial.skala_usaha,
        status_penanaman_modal: partial.status_penanaman_modal,
        jenis_perusahaan: partial.jenis_perusahaan,
        kategori_dokumen_oss: partial.kategori_dokumen_oss,
        jenis_permohonan_simbg: partial.jenis_permohonan_simbg,
        fungsi_bangunan: partial.fungsi_bangunan,
        subfungsi_bangunan: partial.subfungsi_bangunan,
        luas_m2: partial.luas_m2,
        jumlah_lantai: partial.jumlah_lantai,
        jumlah_unit: partial.jumlah_unit,
        tanggal_update_dipta: new Date().toISOString().replace('T', ' ').substring(0, 19),
        operator_update: currentUser.full_name
      }));

      DiptaStorageService.addBatch(newBatch, fullRecordsToSave);
      setCompletedBatch(newBatch);
      setIsProcessing(false);
      setCurrentStep(3);
    }, 400);
  };

  return (
    <div id="import-module-view" className="space-y-6">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Modul Import & Harmonisasi Data
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Integrasi file dataset dari OSS-RBA, SICANTIK Cloud, dan SIMBG dengan validasi otomatis sesuai PRD.
        </p>
      </div>

      {/* Wizard Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              1
            </div>
            <span className={`text-xs font-semibold ${currentStep >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              Pilih Sumber & File
            </span>
          </div>

          <div className={`flex-1 h-0.5 mx-4 ${currentStep >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </div>
            <span className={`text-xs font-semibold ${currentStep >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
              Hasil Validasi & Mapping
            </span>
          </div>

          <div className={`flex-1 h-0.5 mx-4 ${currentStep >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </div>
            <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-slate-900' : 'text-slate-400'}`}>
              Selesai & Tersimpan
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: SELECT DATASET & FILE */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900">1. Konfigurasi Sumber Dataset</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sumber Aplikasi */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Sumber Aplikasi:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['OSS-RBA', 'SICANTIK', 'SIMBG'] as SourceApp[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSourceChange(s)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                        selectedSource === s
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jenis Dataset */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Jenis Dataset:
                </label>
                <select
                  value={selectedDataset}
                  onChange={e => setSelectedDataset(e.target.value as DatasetCode)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium"
                >
                  {datasetOptions
                    .filter(d => d.source === selectedSource)
                    .map(d => (
                      <option key={d.type} value={d.type}>
                        {d.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Periode Data */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Periode Data:
                </label>
                <input
                  type="month"
                  value={periodeData}
                  onChange={e => setPeriodeData(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Upload Area */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                2. Unggah Berkas File (.xlsx / .csv):
              </label>

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center transition-colors bg-slate-50/50">
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800">
                  Tarik & Lepas File Excel / CSV di Sini
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Mendukung berkas ekspor resmi OSS-RBA, SICANTIK Cloud, atau SIMBG
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors inline-block">
                    <span>Pilih Berkas dari Komputer</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <span className="text-xs text-slate-400">atau</span>

                  <button
                    id="btn-use-sample-dataset"
                    type="button"
                    onClick={handleLoadSampleData}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Gunakan Dataset Sampel Uji DPMPTSP OKI</span>
                  </button>

                  <button
                    id="btn-download-selected-template"
                    type="button"
                    onClick={() => handleDownloadSingleTemplate(selectedDataset)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                    title={`Unduh Template Excel untuk ${selectedDataset}`}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh Template Excel ({selectedDataset})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Toast Notification when template is downloaded */}
          {templateDownloadMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{templateDownloadMsg}</span>
              </div>
              <button
                onClick={() => setTemplateDownloadMsg(null)}
                className="text-[11px] underline font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Tutup
              </button>
            </div>
          )}

          {/* SECTION: TEMPLATE EXCEL RESMI 5 DATASET DIPTA */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Template Berkas Excel Resmi (5 Dataset DIPTA DPMPTSP OKI)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unduh template standar berisi kolom resmi, validasi format, dan contoh data riil 18 Kecamatan Kabupaten Ogan Komering Ilir.
                </p>
              </div>

              {/* Master Download Bundle Button */}
              <button
                id="btn-download-all-templates"
                type="button"
                onClick={handleDownloadAllTemplates}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Paket 5 Template Sekaligus (.xlsx 5 Sheet)</span>
              </button>
            </div>

            {/* 5 Dataset Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(DATASET_TEMPLATES) as DatasetCode[]).map(code => {
                const meta = DATASET_TEMPLATES[code];
                const mandatoryCount = meta.columns.filter(c => c.mandatory).length;
                const totalCount = meta.columns.length;
                const isCurrentActive = selectedDataset === code;

                return (
                  <div
                    key={code}
                    className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
                      isCurrentActive
                        ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeClass}`}>
                          {meta.sourceApp}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {mandatoryCount} Wajib / {totalCount} Kolom
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {meta.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {meta.description}
                      </p>

                      {/* Columns Preview Tag List */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold block mb-1.5 uppercase">
                          Kolom Utama Template:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {meta.columns.slice(0, 5).map(c => (
                            <span
                              key={c.key}
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                c.mandatory
                                  ? 'bg-slate-100 text-slate-800 font-semibold border-slate-300'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                            >
                              {c.key}{c.mandatory ? '*' : ''}
                            </span>
                          ))}
                          {meta.columns.length > 5 && (
                            <span className="text-[9px] text-slate-400 font-mono self-center">
                              +{meta.columns.length - 5} lainnya
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-download-tpl-${code.toLowerCase()}`}
                          type="button"
                          onClick={() => handleDownloadSingleTemplate(code)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh .xlsx</span>
                        </button>

                        <button
                          id={`btn-inspect-tpl-${code.toLowerCase()}`}
                          type="button"
                          onClick={() => setInspectingTemplate(meta)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Lihat rincian seluruh kolom dan aturan pengisian"
                        >
                          <Table className="w-3.5 h-3.5 text-slate-500" />
                          <span>Aturan</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleSourceChange(meta.sourceApp);
                          setSelectedDataset(code);
                        }}
                        className={`w-full py-1 text-[11px] font-semibold rounded-md transition-colors text-center ${
                          isCurrentActive
                            ? 'text-emerald-800 bg-emerald-100 font-bold'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {isCurrentActive ? '✓ Sedang Dipilih pada Wizard' : 'Pilih Dataset Ini untuk Diimport'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reference Information Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-slate-800">Catatan Validasi Format Wilayah & Tanggal:</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Pastikan kolom nama kecamatan diisi sesuai salah satu dari 18 Kecamatan resmi Kab. OKI (misal: <strong>Kayu Agung</strong>, <strong>Pedamaran</strong>, <strong>Mesuji Raya</strong>, <strong>Lempuing</strong>). Format tanggal yang disarankan adalah <code className="font-mono text-slate-800 bg-white px-1 py-0.5 rounded border">YYYY-MM-DD</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & VALIDATION RESULTS (PRD Section 16 & UAT Requirements) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ringkasan Validasi Berkas Import</h3>
                <p className="text-xs text-slate-500">
                  File: <span className="font-mono font-semibold text-slate-800">{fileName}</span> ({selectedSource} - {selectedDataset})
                </p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-1 rounded-md border border-emerald-200">
                Periode: {periodeData}
              </span>
            </div>

            {/* Validation KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Baris File</span>
                <span className="text-xl font-bold text-slate-900">{parsedRows.length}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[11px] text-emerald-800 block">Baris Valid</span>
                <span className="text-xl font-bold text-emerald-700">{validationResults.validRecords.length}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-[11px] text-amber-800 block">Perlu Verifikasi / Anomali</span>
                <span className="text-xl font-bold text-amber-700">{validationResults.issuesCount}</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-[11px] text-orange-800 block">Potensi Duplikat</span>
                <span className="text-xl font-bold text-orange-700">{validationResults.duplicateCount}</span>
              </div>
            </div>

            {/* Unrecognized columns notice (PRD Section 16) */}
            {unrecognizedHeaders.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 block mb-1">
                  Kolom Tidak Dikenali (Diabaikan secara aman):
                </span>
                <div className="flex flex-wrap gap-1">
                  {unrecognizedHeaders.map(h => (
                    <span key={h} className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview of Mapped Data */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900">
                Preview Data Hasil Transformasi & Harmonisasi Status
              </h3>
              <span className="text-[11px] text-slate-500">
                Total {validationResults.validRecords.length} baris valid siap diimpor
              </span>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden p-4 space-y-3">
              {paginatedPreviewRecords.map((rec, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{rec.id_record_sumber}</span>
                    <StatusBadge status={rec.status_dipta || 'SELESAI_TERBIT'} type="dipta" size="sm" />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-slate-800">{rec.nama_pemohon_usaha}</div>
                    <div className="text-slate-500 text-[11px]">{rec.jenis_layanan}</div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      Asli: {rec.status_asli}
                    </span>
                    <StatusBadge status={rec.status_validasi || 'VALID'} type="validasi" size="sm" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[650px] text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">ID Sumber</th>
                    <th className="px-3.5 py-2.5">Pemohon</th>
                    <th className="px-3.5 py-2.5">Layanan</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Status Asli</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Status Standar DIPTA</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap">Status Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPreviewRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2 font-mono font-semibold text-slate-900 whitespace-nowrap">{rec.id_record_sumber}</td>
                      <td className="px-3.5 py-2 max-w-[180px] truncate" title={rec.nama_pemohon_usaha}>{rec.nama_pemohon_usaha}</td>
                      <td className="px-3.5 py-2 max-w-[200px] truncate" title={rec.jenis_layanan}>{rec.jenis_layanan}</td>
                      <td className="px-3.5 py-2 text-slate-600 whitespace-nowrap">{rec.status_asli}</td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <StatusBadge status={rec.status_dipta || 'SELESAI_TERBIT'} type="dipta" size="sm" />
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <StatusBadge status={rec.status_validasi || 'VALID'} type="validasi" size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPreviewPage}
              totalItems={validationResults.validRecords.length}
              itemsPerPage={previewPageSize}
              onPageChange={setCurrentPreviewPage}
              onItemsPerPageChange={setPreviewPageSize}
              pageSizeOptions={[5, 10, 20]}
            />
          </div>

          {/* Action CTAs: Batalkan, Lihat Detail Error, Import Data Valid */}
          <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batalkan / Pilih File Lain
            </button>

            <div className="flex items-center gap-3">
              <button
                id="btn-confirm-import-data"
                onClick={handleConfirmImport}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Harmonisasi...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan & Import {validationResults.validRecords.length} Data Konsolidasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS CONFIRMATION */}
      {currentStep === 3 && completedBatch && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            Import Data Berhasil Disimpan!
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sebanyak <strong>{completedBatch.row_valid} data</strong> dari file{' '}
            <span className="font-mono text-slate-800 font-semibold">{completedBatch.file_name}</span> telah
            berhasil diintegrasikan dan dipetakan ke dalam database DIPTA DPMPTSP OKI.
          </p>

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1 text-left">
            <div>Batch ID: <span className="font-mono font-semibold text-slate-900">{completedBatch.batch_id}</span></div>
            <div>Sumber: <strong>{completedBatch.source_app}</strong> ({completedBatch.dataset_code})</div>
            <div>Petugas Import: {completedBatch.imported_by_name}</div>
            <div>Waktu Import: {completedBatch.imported_at}</div>
          </div>

          <div className="pt-3 flex justify-center gap-3">
            <button
              onClick={() => {
                setCurrentStep(1);
                setFileName('');
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Import Berkas Lain
            </button>
            <button
              onClick={onImportSuccess}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Buka Dashboard Eksekutif
            </button>
          </div>
        </div>
      )}

      {/* MODAL: STRUKTUR KOLOM & ATURAN PENGISIAN TEMPLATE */}
      {inspectingTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Struktur Kolom: {inspectingTemplate.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${inspectingTemplate.badgeClass}`}>
                      {inspectingTemplate.sourceApp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nama Berkas: <span className="font-mono font-semibold text-slate-700">{inspectingTemplate.fileName}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingTemplate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {inspectingTemplate.description}
            </p>

            {/* Table of Columns */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 whitespace-nowrap">Header Kolom Excel</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Label / Keterangan</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Sifat</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Format Data</th>
                    <th className="px-3 py-2.5">Penjelasan & Contoh Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectingTemplate.columns.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {col.key}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                        {col.label}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {col.mandatory ? (
                          <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                            Wajib
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                            Opsional
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {col.format}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[11px]">
                        {col.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Total <strong>{inspectingTemplate.columns.length} kolom</strong> ({inspectingTemplate.columns.filter(c => c.mandatory).length} kolom wajib diisi)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingTemplate(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadSingleTemplate(inspectingTemplate.code);
                    setInspectingTemplate(null);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template .xlsx Ini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
