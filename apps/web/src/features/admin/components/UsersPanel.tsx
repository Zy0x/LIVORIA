import { ChevronDown, ChevronUp, RefreshCw, User, Users } from 'lucide-react';

interface UsersPanelProps {
  users: any[];
  usersLoading: boolean;
  expandedUser: string | null;
  userDetails: Record<string, any>;
  onRefresh: () => void;
  onToggleUser: (userId: string) => void;
  onDeleteUser: (userId: string, email: string) => void;
}

export function UsersPanel({
  users,
  usersLoading,
  expandedUser,
  userDetails,
  onRefresh,
  onToggleUser,
  onDeleteUser,
}: UsersPanelProps) {
  return (
    <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />Daftar Pengguna
        </h2>
        <button
          onClick={onRefresh}
          disabled={usersLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-accent transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${usersLoading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {usersLoading ? (
        <div className="py-12 text-center">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Memuat data pengguna...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border rounded-xl">
          <p className="text-xs text-muted-foreground">Tidak ada pengguna ditemukan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <UserCard
              key={user.id}
              user={user}
              expanded={expandedUser === user.id}
              details={userDetails[user.id]}
              onToggle={() => onToggleUser(user.id)}
              onDelete={() => onDeleteUser(user.id, user.email)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface UserCardProps {
  user: any;
  expanded: boolean;
  details: any;
  onToggle: () => void;
  onDelete: () => void;
}

function UserCard({ user, expanded, details, onToggle, onDelete }: UserCardProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden transition-all">
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user.email?.[0].toUpperCase() || <User className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{user.email}</p>
            <p className="text-[10px] text-muted-foreground">ID: {user.id.substring(0, 8)}... &bull; Terdaftar: {new Date(user.created_at).toLocaleDateString('id-ID')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${user.last_sign_in_at ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
            {user.last_sign_in_at ? 'Aktif' : 'Baru'}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-card/50">
          {details ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <UserMetric label="Terakhir Login" value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('id-ID') : '-'} />
              <UserMetric label="Total Anime" value={details.anime_count || 0} />
              <UserMetric label="Total Donghua" value={details.donghua_count || 0} />
              <UserMetric label="Total Waifu" value={details.waifu_count || 0} />
              <UserMetric label="Total Tagihan" value={details.tagihan_count || 0} />
              <UserMetric label="Total Obat" value={details.obat_count || 0} />
              <div className="col-span-2 flex items-end">
                <button
                  onClick={onDelete}
                  className="w-full py-2 rounded-xl bg-destructive/10 text-destructive text-[10px] font-bold border border-destructive/20 hover:bg-destructive/20 transition-all"
                >
                  Hapus Pengguna
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <RefreshCw className="w-4 h-4 text-primary animate-spin mx-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
