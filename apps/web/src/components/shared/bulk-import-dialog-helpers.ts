export type Step = 'input' | 'processing' | 'preview' | 'enriching' | 'translating' | 'importing';

export interface LogEntry {
  time: string;
  msg: string;
  type: 'info' | 'ok' | 'skip' | 'err';
}

export interface AiProgress {
  current: number;
  total: number;
  provider: string;
  model: string;
  itemsSoFar: number;
  status?: 'processing' | 'rotating' | 'error' | 'success';
  lastError?: string;
}

export interface ImportProgress {
  current: number;
  err: number;
  ok: number;
  skip: number;
  total: number;
}

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function nowTime() {
  const n = new Date();
  return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}:${n.getSeconds().toString().padStart(2, '0')}`;
}
