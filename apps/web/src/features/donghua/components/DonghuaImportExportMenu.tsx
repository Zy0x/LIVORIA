import ImportExportButton from '@/components/ImportExportButton';
import type { DonghuaItem } from '@/lib/types';

interface DonghuaImportExportMenuProps {
  data: DonghuaItem[];
  onImportComplete: () => void;
  onOpenBulkImport: () => void;
}

export function DonghuaImportExportMenu({ data, onImportComplete, onOpenBulkImport }: DonghuaImportExportMenuProps) {
  return (
    <ImportExportButton
      data={data}
      filename="donghua-livoria"
      mediaType="donghua"
      onImportComplete={onImportComplete}
      onOpenBulkImport={onOpenBulkImport}
    />
  );
}
