export function sanitizeStorageSegment(value: string, fallback: string) {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 96);
  return sanitized || fallback;
}

export function getStorageExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || 'bin';
}

export function buildUserStoragePath(input: {
  userId: string;
  folder: string;
  fileName: string;
  nestedFolder?: string;
  timestamp: number;
  suffix: string;
}) {
  const safeFolder = sanitizeStorageSegment(input.folder, 'files');
  const safeNested = input.nestedFolder ? `${sanitizeStorageSegment(input.nestedFolder, 'item')}/` : '';
  return `${input.userId}/${safeFolder}/${safeNested}${input.timestamp}-${input.suffix}.${getStorageExtension(input.fileName)}`;
}
