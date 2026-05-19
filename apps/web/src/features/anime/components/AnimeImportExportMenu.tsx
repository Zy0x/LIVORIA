import ImportExportButton from '@/components/ImportExportButton';
import type { AnimeItem } from '@/lib/types';

interface AnimeImportExportMenuProps {
  data: AnimeItem[];
  onImportComplete: () => void;
  onOpenBulkImport: () => void;
}

export function AnimeImportExportMenu({ data, onImportComplete, onOpenBulkImport }: AnimeImportExportMenuProps) {
  return (
    <ImportExportButton
      data={data}
      filename="anime-livoria"
      mediaType="anime"
      onImportComplete={onImportComplete}
      onOpenBulkImport={onOpenBulkImport}
    />
  );
}
