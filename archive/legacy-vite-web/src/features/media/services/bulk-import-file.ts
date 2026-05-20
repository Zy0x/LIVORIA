import { MAX_IMPORT_FILE_SIZE_BYTES, MAX_IMPORT_ROWS } from '@/lib/import-export';

export type BulkImportFileResult = {
  description?: string;
  text: string;
  title?: string;
};

function readAsArrayBuffer(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file.'));
    reader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file.'));
    reader.onload = (event) => resolve(String(event.target?.result ?? '').replace(/^\uFEFF/, ''));
    reader.readAsText(file);
  });
}

function assertFileSize(file: File) {
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new Error(`Maksimal ${(MAX_IMPORT_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB per import.`);
  }
}

function assertRowCount(count: number) {
  if (count > MAX_IMPORT_ROWS) {
    throw new Error(`Maksimal ${MAX_IMPORT_ROWS} baris data per import.`);
  }
}

export async function readBulkImportFile(file: File): Promise<BulkImportFileResult> {
  assertFileSize(file);

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx');
    const buffer = await readAsArrayBuffer(file);
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    assertRowCount(rows.length);
    return {
      description: `${rows.length} baris`,
      text: JSON.stringify(rows, null, 2),
      title: 'Excel loaded',
    };
  }

  const text = await readAsText(file);
  const rowCount = text.split(/\r?\n/).filter((line) => line.trim()).length;
  assertRowCount(Math.max(0, rowCount - 1));
  return { text };
}
