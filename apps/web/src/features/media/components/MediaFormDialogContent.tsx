import { Suspense, type ChangeEvent, type ComponentType, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Bookmark as BookmarkIcon, BookmarkPlus, CheckCircle, Clock, Film, ImageIcon, PlayCircle } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GenreSelect from '@/components/shared/GenreSelect';
import LoadingState from '@/shared/components/LoadingState';

type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';

interface MediaFormDialogContentProps {
  mediaType: 'anime' | 'donghua';
  editItem: any | null;
  form: any;
  setForm: (updater: any) => void;
  extraData: any;
  setExtraData: (value: any) => void;
  coverFile: File | null;
  coverPreview: string;
  coverInputRef: RefObject<HTMLInputElement>;
  setCoverFile: (file: File | null) => void;
  setCoverPreview: (value: string) => void;
  selectedGenres: string[];
  setSelectedGenres: (value: string[]) => void;
  genreOptions: readonly string[];
  daysOfWeek: readonly { value: string; label: string }[];
  parentSearch: string;
  setParentSearch: (value: string) => void;
  showParentDD: boolean;
  setShowParentDD: (value: boolean) => void;
  filteredParentTitles: string[];
  formWatchStatus: WatchStatus;
  setFormWatchStatus: (value: WatchStatus) => void;
  selectedSchedule: string[];
  setSelectedSchedule: (updater: any) => void;
  ic: string;
  createPending: boolean;
  updatePending: boolean;
  uploading: boolean;
  isTranslatingSync: boolean;
  setIsTranslatingSync: (value: boolean) => void;
  setTranslationErrorSync: (value: string | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  AnimeExtraFields: ComponentType<any>;
}

export function MediaFormDialogContent({
  mediaType,
  editItem,
  form,
  setForm,
  extraData,
  setExtraData,
  coverFile,
  coverPreview,
  coverInputRef,
  setCoverFile,
  setCoverPreview,
  selectedGenres,
  setSelectedGenres,
  genreOptions,
  daysOfWeek,
  parentSearch,
  setParentSearch,
  showParentDD,
  setShowParentDD,
  filteredParentTitles,
  formWatchStatus,
  setFormWatchStatus,
  selectedSchedule,
  setSelectedSchedule,
  ic,
  createPending,
  updatePending,
  uploading,
  isTranslatingSync,
  setIsTranslatingSync,
  setTranslationErrorSync,
  onSubmit,
  onCancel,
  AnimeExtraFields,
}: MediaFormDialogContentProps) {
  const label = mediaType === 'anime' ? 'Anime' : 'Donghua';
  const adultLabel = mediaType === 'anime' ? 'HAnime' : 'HDonghua';
  const movieWord = mediaType === 'anime' ? 'Movie' : 'Film';

  const setField = (field: string, value: any) => setForm((prev: any) => ({ ...prev, [field]: value }));
  const onCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-lg flex flex-wrap items-center gap-2 pr-7">
          {editItem ? `Edit ${label}` : `Tambah ${label} / ${movieWord}`}
          {form.is_movie && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20"><Film className="w-2.5 h-2.5" />{mediaType === 'anime' ? 'MOVIE' : 'FILM'}</span>}
        </DialogTitle>
        <DialogDescription className="text-xs">{editItem ? 'Perbarui informasi.' : 'Gunakan pencarian MAL/AniList untuk auto-fill. Status rilis dan status tonton diisi terpisah.'}</DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="min-w-0 space-y-4 mt-2">
        <Suspense fallback={<LoadingState label="Memuat form tambahan..." />}>
          <AnimeExtraFields
            mediaType={mediaType === 'donghua' ? 'donghua' : undefined}
            value={extraData}
            onChange={setExtraData}
            titleHint={form.title}
            hasCoverOverride={!!coverFile}
            onTitleChange={(v: string) => setField('title', v)}
            onCoverUrlChange={(url: string) => {
              if (!coverFile) { setCoverPreview(url); setField('cover_url', url); }
            }}
            onGenresChange={setSelectedGenres}
            onEpisodesChange={(episodes: number) => setField('episodes', episodes)}
            onSynopsisChange={(synopsis: string) => setField('synopsis', synopsis)}
            onStatusChange={(status: string) => setField('status', status)}
            onSeasonChange={(season: number) => setField('season', season)}
            onCourChange={(cour: string) => setField('cour', cour)}
            onParentTitleChange={(parentTitle: string) => { setField('parent_title', parentTitle); setParentSearch(parentTitle); }}
            onRatingChange={(rating: number) => setField('rating', rating)}
            onIsMovieChange={(isMovie: boolean) => {
              setForm((prev: any) => ({ ...prev, is_movie: isMovie, season: isMovie ? 0 : (prev.season || 1), duration_minutes: isMovie ? prev.duration_minutes : null }));
            }}
            onDurationMinutesChange={(mins: number) => setField('duration_minutes', mins)}
            onTranslatingChange={setIsTranslatingSync}
            onTranslationErrorChange={setTranslationErrorSync}
          />
        </Suspense>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Cover Image
            {coverPreview && !coverFile && <span className="ml-2 text-[10px] text-info font-normal">(dari MAL/AniList - upload untuk mengganti)</span>}
          </label>
          <div className="flex min-w-0 items-center gap-4">
            <div onClick={() => coverInputRef.current?.click()} className="w-20 h-[120px] rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all shrink-0 relative group">
              {coverPreview ? <><img src={coverPreview} alt="Cover" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white text-[9px] font-bold">Ganti</span></div></> : <div className="flex flex-col items-center gap-1.5 text-center px-2"><ImageIcon className="w-6 h-6 text-muted-foreground/40" /><span className="text-[9px] text-muted-foreground">Upload</span></div>}
            </div>
            <div className="min-w-0 space-y-1.5">
              <button type="button" onClick={() => coverInputRef.current?.click()} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Upload Cover Manual</button>
              <p className="text-[10px] text-muted-foreground">{coverFile ? 'File dipilih' : coverPreview ? 'Cover dari MAL/AniList' : 'Atau gunakan auto-fill di atas'}</p>
              {coverPreview && <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); setField('cover_url', ''); }} className="text-[11px] text-destructive hover:text-destructive/80">Hapus cover</button>}
            </div>
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onCoverChange} />
        </div>

        <Field label={`Judul ${form.is_movie ? 'Film' : label} *`}><input type="text" value={form.title} onChange={e => setField('title', e.target.value)} placeholder={form.is_movie ? 'cth: Dragon Ball Super: Broly' : 'cth: Solo Leveling Season 2'} className={ic} required /></Field>
        <TogglePanel active={form.is_movie} icon={<Film className={`w-4 h-4 ${form.is_movie ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`} />} title={form.is_movie ? `Ini adalah ${movieWord}${mediaType === 'donghua' ? ' Donghua' : '/Film'}` : `Tandai sebagai ${movieWord}`} subtitle={form.is_movie ? 'Matikan untuk beralih ke mode serial' : 'Aktifkan jika ini film bukan serial'} onClick={() => setForm((prev: any) => ({ ...prev, is_movie: !prev.is_movie, season: !prev.is_movie ? 0 : (prev.season || 1), duration_minutes: !prev.is_movie ? prev.duration_minutes : null }))} color="violet" />
        <TogglePanel active={form.is_hentai} icon={<span className={`text-sm font-bold ${form.is_hentai ? 'text-pink-600 dark:text-pink-400' : 'text-muted-foreground'}`}>18+</span>} title={form.is_hentai ? `${adultLabel} (18+)` : `Tandai sebagai ${adultLabel}`} subtitle="Konten dewasa / hentai" onClick={() => setField('is_hentai', !form.is_hentai)} color="pink" />

        {!form.is_movie && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Season"><input type="number" value={form.season || ''} onChange={e => setField('season', Number(e.target.value))} placeholder="1" className={ic} min={1} /></Field><Field label="Cour / Part"><input type="text" value={form.cour} onChange={e => setField('cour', e.target.value)} placeholder="Part 2" className={ic} /></Field></div>}
        {!form.is_movie && <ParentTitleField parentSearch={parentSearch} setParentSearch={setParentSearch} setForm={setForm} showParentDD={showParentDD} setShowParentDD={setShowParentDD} filteredParentTitles={filteredParentTitles} currentParent={form.parent_title} ic={ic} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Status Rilis"><select value={form.status} onChange={e => setField('status', e.target.value)} className={ic}><option value="on-going">{form.is_movie ? 'Sedang Tayang' : 'On-Going'}</option><option value="completed">{form.is_movie ? 'Sudah Rilis' : 'Selesai Rilis'}</option><option value="planned">{form.is_movie ? 'Belum Rilis' : 'Akan Rilis'}</option></select></Field><Field label="Rating (0-10)"><input type="number" value={form.rating || ''} onChange={e => setField('rating', Number(e.target.value))} placeholder="9.5" className={ic} min={0} max={10} step={0.1} /></Field></div>
        <WatchStatusPicker value={formWatchStatus} onChange={setFormWatchStatus} />
        {form.is_movie ? <Field label="Durasi Film (menit)"><input type="number" value={form.duration_minutes || ''} onChange={e => setField('duration_minutes', e.target.value ? Number(e.target.value) : null)} placeholder="cth: 90, 120" className={ic} min={1} max={600} /></Field> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Total Episode"><input type="number" value={form.episodes || ''} onChange={e => setField('episodes', Number(e.target.value))} placeholder="24" className={ic} min={0} /></Field>{(form.status === 'on-going' || form.status === 'completed') && <Field label="Ditonton"><input type="number" value={form.episodes_watched || ''} onChange={e => setField('episodes_watched', Number(e.target.value))} placeholder="12" className={ic} min={0} /></Field>}</div>}
        <Field label="Genre"><GenreSelect genres={genreOptions} selected={selectedGenres} onChange={setSelectedGenres} /></Field>
        {form.status === 'on-going' && !form.is_movie && <SchedulePicker daysOfWeek={daysOfWeek} selectedSchedule={selectedSchedule} setSelectedSchedule={setSelectedSchedule} />}
        <Field label={form.is_movie ? 'Link Nonton Film' : 'Link Streaming'}><input type="url" value={form.streaming_url} onChange={e => setField('streaming_url', e.target.value)} placeholder="https://..." className={ic} /></Field>
        <Field label="Sinopsis"><textarea value={form.synopsis} onChange={e => setField('synopsis', e.target.value)} placeholder="Ringkasan cerita..." rows={3} className={`${ic} resize-none`} /></Field>
        <Field label="Catatan"><textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} className={`${ic} resize-none`} /></Field>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
          <button type="submit" disabled={createPending || updatePending || uploading || isTranslatingSync} className={`px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all ${form.is_movie ? 'bg-violet-500 text-white' : 'bg-primary text-primary-foreground'}`}>
            {uploading ? 'Mengupload...' : isTranslatingSync ? 'Menerjemahkan...' : createPending || updatePending ? 'Menyimpan...' : editItem ? 'Simpan' : (form.is_movie ? `Tambah ${movieWord}` : 'Tambah')}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{label}</label>{children}</div>;
}

function TogglePanel({ active, icon, title, subtitle, onClick, color }: { active: boolean; icon: ReactNode; title: string; subtitle: string; onClick: () => void; color: 'violet' | 'pink' }) {
  const activeClass = color === 'violet' ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20' : 'border-pink-300 dark:border-pink-700 bg-pink-50/50 dark:bg-pink-950/20';
  const textClass = color === 'violet' ? 'text-violet-700 dark:text-violet-300' : 'text-pink-700 dark:text-pink-300';
  const knobClass = color === 'violet' ? 'bg-violet-500' : 'bg-pink-500';
  return <div className={`flex min-w-0 items-center justify-between gap-3 p-3 rounded-xl border transition-all ${active ? activeClass : 'border-border bg-muted/20'}`}><div className="flex min-w-0 items-center gap-2">{icon}<div className="min-w-0"><p className={`break-words text-sm font-semibold ${active ? textClass : 'text-foreground'}`}>{title}</p><p className="break-words text-[10px] text-muted-foreground">{subtitle}</p></div></div><button type="button" onClick={onClick} className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${active ? knobClass : 'bg-muted-foreground/30'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${active ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>;
}

function ParentTitleField({ parentSearch, setParentSearch, setForm, showParentDD, setShowParentDD, filteredParentTitles, currentParent, ic }: any) {
  return <div className="relative"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Kelompokkan Dengan</label><input type="text" value={parentSearch} onChange={e => { setParentSearch(e.target.value); setForm((prev: any) => ({ ...prev, parent_title: e.target.value })); setShowParentDD(true); }} onFocus={() => setShowParentDD(true)} placeholder="Ketik atau pilih judul induk..." className={ic} />{showParentDD && filteredParentTitles.length > 0 && <><div className="fixed inset-0 z-40" onClick={() => setShowParentDD(false)} /><div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-40 overflow-y-auto"><button type="button" onClick={() => { setForm((prev: any) => ({ ...prev, parent_title: '' })); setParentSearch(''); setShowParentDD(false); }} className="w-full text-left px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted">- Tidak dikelompokkan -</button>{filteredParentTitles.map((t: string) => <button key={t} type="button" onClick={() => { setForm((prev: any) => ({ ...prev, parent_title: t })); setParentSearch(t); setShowParentDD(false); }} className={`w-full text-left px-3.5 py-2.5 text-sm truncate hover:bg-muted ${currentParent === t ? 'text-primary font-semibold' : 'text-foreground'}`}>{t}</button>)}</div></>}<p className="text-[10px] text-muted-foreground mt-1">Tumpuk beberapa season menjadi satu card.</p></div>;
}

function WatchStatusPicker({ value, onChange }: { value: WatchStatus; onChange: (value: WatchStatus) => void }) {
  const options = [
    { value: 'none' as WatchStatus, label: 'Belum Ditandai', icon: BookmarkIcon, cls: 'border-border text-muted-foreground' },
    { value: 'want_to_watch' as WatchStatus, label: 'Mau Nonton', icon: BookmarkPlus, cls: 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' },
    { value: 'watching' as WatchStatus, label: 'Sedang Nonton', icon: PlayCircle, cls: 'border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' },
    { value: 'watched' as WatchStatus, label: 'Sudah Ditonton', icon: CheckCircle, cls: 'border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20' },
  ];
  return <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Status Tonton Saya <span className="text-[9px] font-normal normal-case text-muted-foreground">(tidak mempengaruhi status rilis)</span></label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{options.map(opt => { const Icon = opt.icon; const isActive = value === opt.value; return <button key={opt.value} type="button" onClick={() => onChange(opt.value)} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center transition-all ${isActive ? `${opt.cls} shadow-sm ring-2 ring-primary/20` : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground bg-muted/20'}`}><Icon className={`w-4 h-4 ${isActive ? '' : 'text-muted-foreground'}`} /><span className="text-[9px] font-semibold leading-tight">{opt.label}</span></button>; })}</div></div>;
}

function SchedulePicker({ daysOfWeek, selectedSchedule, setSelectedSchedule }: any) {
  return <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Jadwal Tayang</label><div className="flex flex-wrap gap-2">{daysOfWeek.map((day: any) => <button key={day.value} type="button" onClick={() => setSelectedSchedule((prev: string[]) => prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value])} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedSchedule.includes(day.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'}`}>{day.label}</button>)}</div></div>;
}
