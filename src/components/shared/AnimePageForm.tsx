/**
 * AnimePageForm.tsx
 *
 * Form modal untuk Tambah/Edit Anime & Donghua.
 * Mendukung auto-fill semua field dari MAL/AniList via AnimeExtraFields.
 *
 * Auto-fill yang berjalan saat user memilih hasil pencarian:
 * - Judul          → form.title
 * - Cover URL      → form.cover_url + coverPreview (jika tidak ada upload manual)
 * - Genre          → selectedGenres
 * - Total Episode  → form.episodes
 * - Status         → form.status
 * - Sinopsis ID    → form.synopsis (terjemahan Groq AI)
 * - Studio         → extraData.studio
 * - Tahun Rilis    → extraData.release_year
 * - MAL URL        → extraData.mal_url
 * - AniList URL    → extraData.anilist_url
 */

import { useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { ANIME_GENRES, DONGHUA_GENRES, DAYS_OF_WEEK } from '@/lib/genres';
import GenreSelect from '@/components/shared/GenreSelect';
import AnimeExtraFields, { type AnimeExtraData } from '@/components/shared/AnimeExtraFields';

export interface AnimeFormData {
  title: string;
  status: 'on-going' | 'completed' | 'planned';
  genre: string;
  rating: number;
  episodes: number;
  episodes_watched: number;
  cover_url: string;
  synopsis: string;
  notes: string;
  season: number;
  cour: string;
  streaming_url: string;
  schedule: string;
  parent_title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isEdit: boolean;
  type: 'anime' | 'donghua';
  form: AnimeFormData;
  setForm: (f: AnimeFormData | ((prev: AnimeFormData) => AnimeFormData)) => void;
  extraData: AnimeExtraData;
  setExtraData: (d: AnimeExtraData) => void;
  selectedGenres: string[];
  setSelectedGenres: (g: string[]) => void;
  selectedSchedule: string[];
  setSelectedSchedule: (s: string[]) => void;
  coverFile: File | null;
  setCoverFile: (f: File | null) => void;
  coverPreview: string;
  setCoverPreview: (p: string) => void;
  uploading: boolean;
  isPending: boolean;
  parentSearch: string;
  setParentSearch: (s: string) => void;
  showParentDD: boolean;
  setShowParentDD: (v: boolean) => void;
  filteredParentTitles: string[];
  onSubmit: (e: React.FormEvent) => void;
}

export default function AnimePageForm({
  open, onOpenChange, isEdit, type,
  form, setForm, extraData, setExtraData,
  selectedGenres, setSelectedGenres,
  selectedSchedule, setSelectedSchedule,
  coverFile, setCoverFile, coverPreview, setCoverPreview,
  uploading, isPending,
  parentSearch, setParentSearch, showParentDD, setShowParentDD,
  filteredParentTitles,
  onSubmit,
}: Props) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const genres = type === 'anime' ? ANIME_GENRES : DONGHUA_GENRES;
  const typeLabel = type === 'anime' ? 'Anime' : 'Donghua';

  const ic = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {isEdit ? `✏️ Edit ${typeLabel}` : `✨ Tambah ${typeLabel} Baru`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit
              ? `Perbarui informasi ${typeLabel.toLowerCase()}.`
              : `Isi detail atau gunakan pencarian MAL/AniList untuk auto-fill semua field.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-2">

          {/* ── Cari dari MAL/AniList (letakkan di atas agar mudah diakses) ── */}
          <AnimeExtraFields
            value={extraData}
            onChange={setExtraData}
            mediaType={type}
            titleHint={form.title}
            hasCoverOverride={!!coverFile}
            // ── Callbacks auto-fill ke form utama ──
            onTitleChange={v => setForm(prev => ({ ...prev, title: v }))}
            onCoverUrlChange={url => {
              // Hanya set cover dari MAL/AniList jika belum ada upload manual
              if (!coverFile) {
                setCoverPreview(url);
                setForm(prev => ({ ...prev, cover_url: url }));
              }
            }}
            onGenresChange={setSelectedGenres}
            onEpisodesChange={eps => setForm(prev => ({ ...prev, episodes: eps }))}
            onSynopsisChange={synopsis => setForm(prev => ({ ...prev, synopsis }))}
            onStatusChange={status => setForm(prev => ({ ...prev, status }))}
          />

          {/* ── Cover image ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Cover Image
              {coverPreview && !coverFile && (
                <span className="ml-2 text-[10px] text-info font-normal">(dari MAL/AniList — upload untuk mengganti)</span>
              )}
            </label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => coverInputRef.current?.click()}
                className="w-20 h-[120px] rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all shrink-0 relative group"
              >
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">Ganti</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center px-2">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                    <span className="text-[9px] text-muted-foreground">Upload</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Upload Cover Manual
                </button>
                <p className="text-[10px] text-muted-foreground">Format 2:3 · Max 5MB</p>
                <p className="text-[10px] text-muted-foreground">
                  {coverFile ? '✓ File manual dipilih' : coverPreview ? '📥 Cover dari MAL/AniList' : 'Atau gunakan auto-fill di atas'}
                </p>
                {coverPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview('');
                      setForm(prev => ({ ...prev, cover_url: '' }));
                    }}
                    className="text-[11px] text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Hapus cover
                  </button>
                )}
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setCoverFile(f);
                  setCoverPreview(URL.createObjectURL(f));
                  setForm(prev => ({ ...prev, cover_url: '' })); // akan di-set saat upload
                }
              }}
            />
          </div>

          {/* ── Judul ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Judul {typeLabel} *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder={`cth: Solo Leveling Season 2`}
              className={ic}
              required
            />
          </div>

          {/* ── Season & Cour ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Season</label>
              <input
                type="number"
                value={form.season || ''}
                onChange={e => setForm(prev => ({ ...prev, season: Number(e.target.value) }))}
                placeholder="1"
                className={ic}
                min={1}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Cour / Part</label>
              <input
                type="text"
                value={form.cour}
                onChange={e => setForm(prev => ({ ...prev, cour: e.target.value }))}
                placeholder="Part 2"
                className={ic}
              />
            </div>
          </div>

          {/* ── Kelompokkan ── */}
          <div className="relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Kelompokkan Dengan
            </label>
            <input
              type="text"
              value={parentSearch}
              onChange={e => {
                setParentSearch(e.target.value);
                setForm(prev => ({ ...prev, parent_title: e.target.value }));
                setShowParentDD(true);
              }}
              onFocus={() => setShowParentDD(true)}
              placeholder="Ketik atau pilih judul induk..."
              className={ic}
            />
            {showParentDD && filteredParentTitles.length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowParentDD(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-40 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, parent_title: '' }));
                      setParentSearch('');
                      setShowParentDD(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    — Tidak dikelompokkan —
                  </button>
                  {filteredParentTitles.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, parent_title: t }));
                        setParentSearch(t);
                        setShowParentDD(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm truncate hover:bg-muted transition-colors ${form.parent_title === t ? 'text-primary font-semibold' : 'text-foreground'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">Tumpuk beberapa season menjadi satu card.</p>
          </div>

          {/* ── Status & Rating ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                className={ic}
              >
                <option value="on-going">On-Going</option>
                <option value="completed">Selesai</option>
                <option value="planned">Direncanakan</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Rating (0-10)</label>
              <input
                type="number"
                value={form.rating || ''}
                onChange={e => setForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                placeholder="9.5"
                className={ic}
                min={0}
                max={10}
                step={0.1}
              />
            </div>
          </div>

          {/* ── Episode ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Total Episode
                {extraData.episodes && (
                  <span className="ml-1 text-[10px] text-info font-normal">(dari MAL/AniList)</span>
                )}
              </label>
              <input
                type="number"
                value={form.episodes || ''}
                onChange={e => setForm(prev => ({ ...prev, episodes: Number(e.target.value) }))}
                placeholder="24"
                className={ic}
                min={0}
              />
            </div>
            {(form.status === 'on-going' || form.status === 'completed') && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Ditonton</label>
                <input
                  type="number"
                  value={form.episodes_watched || ''}
                  onChange={e => setForm(prev => ({ ...prev, episodes_watched: Number(e.target.value) }))}
                  placeholder="12"
                  className={ic}
                  min={0}
                />
              </div>
            )}
          </div>

          {/* ── Genre ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Genre
              {selectedGenres.length > 0 && extraData.genres_from_search && (
                <span className="ml-1 text-[10px] text-info font-normal">(dari MAL/AniList)</span>
              )}
            </label>
            <GenreSelect genres={genres} selected={selectedGenres} onChange={setSelectedGenres} />
          </div>

          {/* ── Jadwal Tayang ── */}
          {form.status === 'on-going' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Jadwal Tayang</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      setSelectedSchedule(
                        selectedSchedule.includes(day.value)
                          ? selectedSchedule.filter(d => d !== day.value)
                          : [...selectedSchedule, day.value]
                      )
                    }
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedSchedule.includes(day.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Link Streaming ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Link Streaming</label>
            <input
              type="url"
              value={form.streaming_url}
              onChange={e => setForm(prev => ({ ...prev, streaming_url: e.target.value }))}
              placeholder="https://..."
              className={ic}
            />
          </div>

          {/* ── Sinopsis ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Sinopsis
              {form.synopsis && extraData.synopsis_id && (
                <span className="ml-1 text-[10px] text-success font-normal">(terjemahan Groq AI ✓)</span>
              )}
            </label>
            <textarea
              value={form.synopsis}
              onChange={e => setForm(prev => ({ ...prev, synopsis: e.target.value }))}
              placeholder="Ringkasan cerita... (atau biarkan kosong untuk auto-fill dari MAL/AniList)"
              rows={3}
              className={`${ic} resize-none`}
            />
          </div>

          {/* ── Catatan ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Catatan</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className={`${ic} resize-none`}
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending || uploading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {uploading ? 'Mengupload cover...' : isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}