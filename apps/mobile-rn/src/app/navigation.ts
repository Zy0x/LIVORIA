export type MobileRoute = 'auth' | 'dashboard' | 'obat';

export const routes: Array<{ key: MobileRoute; label: string }> = [
  { key: 'auth', label: 'Auth' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'obat', label: 'Obat' },
];
