import { ChevronRight, ClipboardPaste, FileSpreadsheet, Sparkles, Zap } from 'lucide-react';

export function BulkImportInputStep(props: any) {
  const { step, mediaType, defaultStatus, setDefaultStatus, enrichDelay, setEnrichDelay, rawText, setRawText, fileInputRef, handleFileImport, processWithAI } = props;
  return (
    <>
              {/* ══ STEP 1: INPUT ══════════════════════════════════════════════════ */}
              {step === 'input' && (
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Status Default</label>
                      <select value={defaultStatus} onChange={e => setDefaultStatus(e.target.value as any)}
                        className="w-full px-2.5 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20">
                        <option value="completed">Completed</option>
                        <option value="planned">Planned</option>
                        <option value="on-going">On-Going</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Jeda antar Auto-Fill (ms)</label>
                      <input type="number" value={enrichDelay} onChange={e => setEnrichDelay(parseInt(e.target.value)||2000)}
                        min={1500} step={500}
                        className="w-full px-2.5 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <ClipboardPaste className="w-3 h-3" /> Data
                    </label>
                    <textarea
                      value={rawText} onChange={e => setRawText(e.target.value)}
                      placeholder={`Format bebas!\n[\n  {"title":"Overlord","season":4,"rating":9.5,"note":"*"},\n  {"title":"Re Zero","season":2,"rating":8.5,"note":"**"}\n]\n\nAtau CSV:\nOverlord, 4, 9.5, *\nRe Zero, 2, 8.5, **`}
                      rows={8}
                      className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y min-h-[150px]"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <input ref={fileInputRef} type="file" accept=".json,.csv,.txt,.tsv,.xlsx,.xls" onChange={handleFileImport} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-input bg-background text-muted-foreground text-xs font-semibold hover:bg-muted transition-all">
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Upload File
                    </button>
                    <span className="text-[10px] text-muted-foreground">JSON, CSV, TXT, Excel (.xlsx)</span>
                    {rawText && (
                      <span className="text-[10px] text-primary font-semibold ml-auto">
                        ~{rawText.split('\n').filter(l => l.trim()).length} baris
                      </span>
                    )}
                  </div>

                  {/* ── Format & Field Documentation Accordion ── */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center gap-1.5 px-3 py-2.5 cursor-pointer select-none hover:bg-primary/10 transition-colors">
                        <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-[11px] font-bold text-foreground flex-1">Format & Field yang Didukung</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="px-3 pb-3 space-y-2 border-t border-primary/15">
                        {/* Format section */}
                        <div className="pt-2 space-y-1.5">
                          <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Format yang Didukung</p>
                          <div className="space-y-1 text-[10px] text-muted-foreground">
                            <p>· <strong className="text-foreground">Hasil Ekspor LIVORIA</strong> — File JSON/CSV dari tombol Ekspor langsung di-restore 100% tanpa perlu AI. Semua field, cover, genre, sinopsis, nama alternatif, status tonton — semuanya dikembalikan persis.</p>
                            <p>· <strong className="text-foreground">JSON Array</strong> — Array of objects: <code className="text-[9px] bg-muted px-1 rounded">[{'{'}title, season, ...{'}'}]</code></p>
                            <p>· <strong className="text-foreground">NDJSON</strong> — Satu JSON object per baris (newline-delimited).</p>
                            <p>· <strong className="text-foreground">CSV/TSV</strong> — Dengan header baris pertama: <code className="text-[9px] bg-muted px-1 rounded">title,season,rating,note,...</code> atau tanpa header: <code className="text-[9px] bg-muted px-1 rounded">judul, season, rating, note</code> (kolom 1–4).</p>
                            <p>· <strong className="text-foreground">Excel (.xlsx)</strong> — Kolom bebas, header auto-detect dari baris pertama.</p>
                            <p>· <strong className="text-foreground">Teks Bebas / Prompt</strong> — AI Groq akan memparse teks bebas menjadi daftar anime/donghua secara otomatis.</p>
                          </div>
                        </div>

                        {/* Field section */}
                        <details className="group/field">
                          <summary className="flex items-center gap-1.5 py-1.5 cursor-pointer select-none text-[10px] font-bold text-foreground uppercase tracking-wider">
                            <ChevronRight className="w-3 h-3 text-muted-foreground transition-transform group-open/field:rotate-90" />
                            Field yang Didukung (detail)
                          </summary>
                          <div className="pl-4 pt-1 space-y-0.5 text-[9px]">
                            <p><code className="bg-muted px-0.5 rounded font-bold text-primary">title</code> <span className="text-destructive font-bold">(wajib)</span> — Judul anime/donghua. Contoh: <code className="bg-muted px-0.5 rounded">"Attack on Titan"</code></p>
                            <p><code className="bg-muted px-0.5 rounded">status</code> — Status rilis: <code className="bg-muted px-0.5 rounded">on-going</code> | <code className="bg-muted px-0.5 rounded">completed</code> | <code className="bg-muted px-0.5 rounded">planned</code>. Default: sesuai pilihan di atas.</p>
                            <p><code className="bg-muted px-0.5 rounded">season</code> — Nomor musim (angka). Default: 1.</p>
                            <p><code className="bg-muted px-0.5 rounded">cour</code> — Part/Cour: misal <code className="bg-muted px-0.5 rounded">"Part 2"</code>.</p>
                            <p><code className="bg-muted px-0.5 rounded">rating</code> — Rating 0–10 (desimal). Contoh: <code className="bg-muted px-0.5 rounded">8.5</code></p>
                            <p><code className="bg-muted px-0.5 rounded">episodes</code> — Total episode (angka).</p>
                            <p><code className="bg-muted px-0.5 rounded">episodes_watched</code> — Jumlah episode yang sudah ditonton.</p>
                            <p><code className="bg-muted px-0.5 rounded">genre</code> — Genre pisah koma: <code className="bg-muted px-0.5 rounded">"Action, Fantasy, Isekai"</code></p>
                            <p><code className="bg-muted px-0.5 rounded">synopsis</code> — Sinopsis/ringkasan cerita.</p>
                            <p><code className="bg-muted px-0.5 rounded">notes</code> — Catatan pribadi. Pola khusus: <code className="bg-muted px-0.5 rounded">*</code>=fav+bookmark, <code className="bg-muted px-0.5 rounded">**</code>=bookmark, <code className="bg-muted px-0.5 rounded">OP</code>=fav.</p>
                            <p><code className="bg-muted px-0.5 rounded">cover_url</code> — URL gambar cover (https://...).</p>
                            <p><code className="bg-muted px-0.5 rounded">is_movie</code> — <code className="bg-muted px-0.5 rounded">true</code>/<code className="bg-muted px-0.5 rounded">false</code>. Tandai sebagai movie/film.</p>
                            <p><code className="bg-muted px-0.5 rounded">is_favorite</code> — <code className="bg-muted px-0.5 rounded">true</code>/<code className="bg-muted px-0.5 rounded">false</code>. Masuk favorit.</p>
                            <p><code className="bg-muted px-0.5 rounded">is_bookmarked</code> — <code className="bg-muted px-0.5 rounded">true</code>/<code className="bg-muted px-0.5 rounded">false</code>. Di-bookmark.</p>
                            <p><code className="bg-muted px-0.5 rounded">is_hentai</code> — <code className="bg-muted px-0.5 rounded">true</code>/<code className="bg-muted px-0.5 rounded">false</code>. Konten 18+/HAnime.</p>
                            <p><code className="bg-muted px-0.5 rounded">parent_title</code> — Judul induk untuk pengelompokan multi-season.</p>
                            <p><code className="bg-muted px-0.5 rounded">studio</code> — Nama studio produksi.</p>
                            <p><code className="bg-muted px-0.5 rounded">release_year</code> — Tahun rilis (angka). Contoh: <code className="bg-muted px-0.5 rounded">2024</code></p>
                            <p><code className="bg-muted px-0.5 rounded">duration_minutes</code> — Durasi film dalam menit (khusus movie).</p>
                            <p><code className="bg-muted px-0.5 rounded">streaming_url</code> — URL streaming/nonton.</p>
                            <p><code className="bg-muted px-0.5 rounded">schedule</code> — Jadwal tayang: <code className="bg-muted px-0.5 rounded">"senin,kamis"</code></p>
                            <p><code className="bg-muted px-0.5 rounded">mal_id</code> — ID MyAnimeList (angka).</p>
                            <p><code className="bg-muted px-0.5 rounded">anilist_id</code> — ID AniList (angka).</p>
                            <p><code className="bg-muted px-0.5 rounded">mal_url</code> — URL halaman MyAnimeList.</p>
                            <p><code className="bg-muted px-0.5 rounded">anilist_url</code> — URL halaman AniList.</p>
                            <p><code className="bg-muted px-0.5 rounded">alternative_titles</code> — JSON string nama alternatif (dari ekspor).</p>
                            <p><code className="bg-muted px-0.5 rounded">watch_status</code> — Status tonton: <code className="bg-muted px-0.5 rounded">none</code> | <code className="bg-muted px-0.5 rounded">want_to_watch</code> | <code className="bg-muted px-0.5 rounded">watching</code> | <code className="bg-muted px-0.5 rounded">watched</code></p>
                            <p><code className="bg-muted px-0.5 rounded">watched_at</code> — Timestamp kapan ditonton (ISO 8601).</p>
                          </div>
                        </details>

                        {/* CSV schema example */}
                        <details className="group/csv">
                          <summary className="flex items-center gap-1.5 py-1.5 cursor-pointer select-none text-[10px] font-bold text-foreground uppercase tracking-wider">
                            <ChevronRight className="w-3 h-3 text-muted-foreground transition-transform group-open/csv:rotate-90" />
                            Contoh Format CSV/TSV
                          </summary>
                          <div className="pl-4 pt-1 text-[9px] text-muted-foreground">
                            <p className="mb-1">Baris pertama <strong className="text-foreground">harus berupa header</strong> agar field dikenali dengan benar:</p>
                            <pre className="bg-muted p-2 rounded-lg text-[8px] font-mono overflow-x-auto whitespace-pre">title,season,rating,status,genre,notes,is_movie,is_favorite{'\n'}Attack on Titan,4,9.5,completed,"Action, Fantasy",*,false,true{'\n'}Suzume,1,8.8,completed,,OP,true,false</pre>
                            <p className="mt-1.5">Tanpa header, kolom dibaca sebagai: judul, season, rating, note.</p>
                          </div>
                        </details>
                      </div>
                    </details>
                  </div>

                  <button onClick={processWithAI} disabled={!rawText.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                    <Sparkles className="w-4 h-4" />
                    Proses & Parse Data
                  </button>
                </div>
              )}

    </>
  );
}
