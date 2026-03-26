/**
 * Breadcrumb.tsx — LIVORIA
 *
 * Navigasi breadcrumb untuk setiap halaman.
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  tagihan: 'Tagihan',
  anime: 'Anime',
  donghua: 'Donghua',
  waifu: 'Waifu',
  obat: 'Obat',
  settings: 'Pengaturan',
  admin: 'Admin Panel',
};

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumb on dashboard (root)
  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3 overflow-x-auto" aria-label="Breadcrumb">
      <Link
        to="/"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
      >
        <Home className="w-3 h-3" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const label = ROUTE_LABELS[seg] || seg;
        const isLast = i === segments.length - 1;

        return (
          <span key={path} className="inline-flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3 h-3 opacity-40" />
            {isLast ? (
              <span className="font-semibold text-foreground">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
