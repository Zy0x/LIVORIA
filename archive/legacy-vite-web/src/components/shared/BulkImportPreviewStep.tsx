import { AlertTriangle, ArrowRight, BookOpen, Bookmark, Building2, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Clapperboard, Edit2, Eye, EyeOff, Film, Filter, Globe, HelpCircle, Image, Languages, Link2, Loader2, RefreshCw, Search, Star, Trash2, Upload } from 'lucide-react';
import { AltTitlesInline, ConfidenceBadge, InlineTitleEditor, ParentTitleField } from './BulkImportDialogPrimitives';
import { interpretNote } from '@/features/media/services/bulk-import-normalization';

export function BulkImportPreviewStep(props: any) {
  const { step, setStep, parsedItems, setParsedItems, enrichedCount, uncertainCount, noMatchCount, watchingCount, needsTranslation, aiProcessing, running, filterNeedVerify, setFilterNeedVerify, displayedItems, mediaType, expandedItems, editingTitleIdx, setEditingTitleIdx, updateItem, reEnrichItem, pickerLoading, translateAllSynopses, startImport, enrichAllItems, applyCandidate, toggleExpand, toggleReviewed, removeItem } = props;
  return (
    <>
              {/* ══ STEP 3: PREVIEW ════════════════════════════════════════════════ */}
              {step === 'preview' && (
                <div className="space-y-3 mt-2">
                  {/* Header bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">
                        {parsedItems.length} item{enrichedCount > 0 && ` · ${enrichedCount} enriched`}
                      </p>
                      {watchingCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/10 text-info text-[10px] font-bold border border-info/20">
                          👁 {watchingCount} watch tracked
                        </span>
                      )}
                      {uncertainCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />{uncertainCount} perlu verifikasi
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => { setStep('input'); setParsedItems([]); setFilterNeedVerify(false); }}
                        className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-[10px] font-semibold text-muted-foreground hover:bg-muted transition-all">
                        ← Kembali
                      </button>
                      <button onClick={enrichAllItems}
                        className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all flex items-center gap-1">
                        <Search className="w-3 h-3" /> Auto-Fill Semua
                      </button>
                      {enrichedCount > 0 && needsTranslation > 0 && (
                        <button onClick={translateAllSynopses}
                          className="px-2.5 py-1.5 rounded-lg bg-info/10 border border-info/30 text-info text-[10px] font-bold hover:bg-info/20 transition-all flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Terjemahkan Sinopsis ({needsTranslation})
                        </button>
                      )}
                      <button onClick={startImport}
                        className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-all flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Import {parsedItems.length}
                      </button>
                    </div>
                  </div>

                  {/* Legend */}
                  {enrichedCount > 0 && (
                    <div className="flex items-center gap-3 flex-wrap p-2 rounded-xl bg-muted/30 border border-border/50 text-[9px]">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider">Keterangan:</span>
                      <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-2.5 h-2.5" />Akurat ≥75%</span>
                      <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="w-2.5 h-2.5" />Perlu Cek 45–74%</span>
                      <span className="flex items-center gap-1 text-red-500"><HelpCircle className="w-2.5 h-2.5" />Tidak Yakin &lt;45%</span>
                      <span className="flex items-center gap-1 text-info ml-auto">👁 watch_status dari DB</span>
                    </div>
                  )}

                  {/* Filter bar */}
                  {enrichedCount > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-muted-foreground flex-1">Filter tampilan:</span>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => setFilterNeedVerify(false)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            !filterNeedVerify
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          Semua ({parsedItems.length})
                        </button>
                        <button
                          onClick={() => setFilterNeedVerify(true)}
                          disabled={uncertainCount === 0}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            filterNeedVerify
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Perlu Verifikasi ({uncertainCount})
                        </button>
                      </div>
                      {filterNeedVerify && uncertainCount > 0 && (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium ml-1">
                          Menampilkan {uncertainCount} dari {parsedItems.length} item
                        </span>
                      )}
                    </div>
                  )}

                  {/* Empty state saat filter aktif tapi tidak ada yang perlu diverifikasi */}
                  {filterNeedVerify && uncertainCount === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl border border-border bg-muted/20">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <p className="text-sm font-semibold text-foreground">Semua item sudah terverifikasi!</p>
                      <p className="text-xs text-muted-foreground">Tidak ada item yang perlu perhatian lebih.</p>
                      <button onClick={() => setFilterNeedVerify(false)}
                        className="mt-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                        Lihat Semua Item
                      </button>
                    </div>
                  )}

                  {/* Item list */}
                  <div className="max-h-[52vh] overflow-y-auto space-y-1.5 pr-0.5">
                    {displayedItems.map(({ item, originalIdx: idx }) => (
                      <div
                        key={idx}
                        className={`rounded-xl border transition-colors ${
                          item.reviewed
                            ? 'bg-blue-500/5 border-blue-500/20'
                            : item.matchConfidence === 'high'   ? 'bg-emerald-500/5 border-emerald-500/30' :
                              item.matchConfidence === 'medium' ? 'bg-amber-500/5 border-amber-500/35' :
                              item.matchConfidence === 'low'    ? 'bg-red-500/5 border-red-500/35' :
                              'bg-card border-border'
                        } p-2 sm:p-2.5`}
                      >
                        <div className="flex items-start gap-2">
                          {item.cover_url ? (
                            <img src={item.cover_url} alt="" className="w-8 h-11 sm:w-10 sm:h-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-11 sm:w-10 sm:h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Image className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-1">
                              <span className="text-[9px] font-bold text-muted-foreground shrink-0 mt-0.5">{idx+1}.</span>
                              <div className="min-w-0 flex-1">
                                {editingTitleIdx === idx ? (
                                  <InlineTitleEditor
                                    item={item}
                                    onTitleChange={title => updateItem(idx, { title })}
                                    onApply={c => applyCandidate(idx, c)}
                                    onClose={() => setEditingTitleIdx(null)}
                                  />
                                ) : (
                                  <>
                                    <p className="text-xs font-semibold leading-snug break-words whitespace-normal">
                                      {item.title}
                                    </p>
                                    {item.enriched && item.originalTitle && item.originalTitle !== item.title && (
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[8px] text-muted-foreground/60 font-medium shrink-0">dari:</span>
                                        <span className="text-[9px] text-muted-foreground/70 italic break-words whitespace-normal">
                                          "{item.originalTitle}"
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {editingTitleIdx !== idx && (
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    <span className="text-[9px] text-muted-foreground">S{item.season}</span>
                                    {item.cour && <span className="text-[9px] text-muted-foreground">· {item.cour}</span>}
                                    {item.rating > 0 && <span className="text-[9px] text-amber-500">★{item.rating}</span>}
                                    {item.is_favorite  && <span className="text-[9px]" title="Favorite">❤️</span>}
                                    {item.is_bookmarked && <span className="text-[9px]" title="Bookmark">🔖</span>}
                                    {item.is_movie && (
                                      <span className="text-[8px] px-1 py-0.5 rounded bg-accent text-accent-foreground font-bold">🎬</span>
                                    )}
                                    {/* Watch status badge */}
                                    {item.watch_status && item.watch_status !== 'none' && (
                                      <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                                        item.watch_status === 'watched'      ? 'bg-success/15 text-success' :
                                        item.watch_status === 'watching'     ? 'bg-info/15 text-info' :
                                        item.watch_status === 'want_to_watch'? 'bg-primary/15 text-primary' :
                                        'bg-muted text-muted-foreground'
                                      }`}>
                                        {item.watch_status === 'watched'       ? '✓ Ditonton' :
                                         item.watch_status === 'watching'      ? '▶ Sedang' :
                                         item.watch_status === 'want_to_watch' ? '♡ Mau' : item.watch_status}
                                      </span>
                                    )}
                                    {item.enriched && (
                                      <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary font-bold">{item.enrichSource}</span>
                                    )}
                                    {item.matchConfidence && (
                                      <ConfidenceBadge
                                        confidence={item.matchConfidence}
                                        score={item.matchScore}
                                        reviewed={item.reviewed}
                                      />
                                    )}
                                    {item.parent_title && (
                                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50 break-words max-w-[150px]" title={`Grup: ${item.parent_title}`}>
                                        📁 {item.parent_title}
                                      </span>
                                    )}
                                    {item.synopsis && item.enriched && (
                                      <span className="text-[8px] px-1 py-0.5 rounded bg-success/10 text-success font-bold">📝 ID</span>
                                    )}
                                    {item.alternative_titles && (
                                      <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-500 font-bold flex items-center gap-0.5">
                                        <Globe className="w-2 h-2" />Alt
                                      </span>
                                    )}
                                    {item.genre && (
                                      <span className="text-[8px] text-muted-foreground break-words max-w-[160px]">{item.genre.split(',').slice(0,2).join(', ')}{item.genre.split(',').length > 2 ? '…' : ''}</span>
                                    )}
                                  </div>
                                )}

                                {editingTitleIdx !== idx && item.alternative_titles && item.enriched && (
                                  <AltTitlesInline altJson={item.alternative_titles} mediaType={mediaType} />
                                )}
                              </div>
                            </div>
                          </div>

                          {editingTitleIdx !== idx && (
                            <div className="flex gap-0.5 shrink-0">
                              <button onClick={() => reEnrichItem(idx)} disabled={pickerLoading === idx}
                                title="Cari ulang otomatis"
                                className="p-1 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground disabled:opacity-40">
                                {pickerLoading === idx
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <RefreshCw className="w-3 h-3" />
                                }
                              </button>
                              <button
                                onClick={() => setEditingTitleIdx(editingTitleIdx === idx ? null : idx)}
                                title="Edit judul & cari MAL/AniList"
                                className={`p-1 rounded-lg hover:bg-muted transition-all ${
                                  item.matchConfidence === 'medium' ? 'text-amber-500' :
                                  item.matchConfidence === 'low'    ? 'text-red-500' :
                                  'text-muted-foreground'
                                } hover:text-foreground`}>
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => toggleExpand(idx)}
                                className="p-1 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
                                {expandedItems.has(idx) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => toggleReviewed(idx)}
                                title={item.reviewed ? "Batal review" : "Tandai sudah direview"}
                                className={`p-1 rounded-lg transition-all ${
                                  item.reviewed ? 'bg-blue-500/20 text-blue-500' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`}>
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => removeItem(idx)}
                                className="p-1 rounded-lg hover:bg-destructive/10 transition-all text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Warning banner untuk item medium/low */}
                        {item.enriched && (item.matchConfidence === 'medium' || item.matchConfidence === 'low') && editingTitleIdx !== idx && (
                          <div className={`mt-2 flex items-start gap-1.5 p-2 rounded-lg text-[9px] leading-relaxed ${
                            item.matchConfidence === 'medium'
                              ? 'bg-amber-500/8 border border-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-red-500/8 border border-red-500/20 text-red-700 dark:text-red-300'
                          }`}>
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>
                              {item.matchConfidence === 'low'
                                ? `Pencocokan tidak yakin (${Math.round((item.matchScore||0)*100)}%). `
                                : `Perlu verifikasi (${Math.round((item.matchScore||0)*100)}%). `
                              }
                              Klik <Edit2 className="inline w-2.5 h-2.5" /> untuk edit judul dan pilih hasil yang tepat.
                              {item.originalTitle && item.originalTitle !== item.title && (
                                <span className="block mt-0.5 opacity-70">Input asli: "{item.originalTitle}"</span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* ══ EXPANDED SECTION ════════════════════════════════════ */}
                        {expandedItems.has(idx) && (
                          <div className="mt-2 pt-2 border-t border-border space-y-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {[
                                { label:'Season', type:'number', val: item.season, key:'season', min:1 },
                                { label:'Rating', type:'number', val: item.rating, key:'rating', step:0.1, min:0, max:10 },
                              ].map(f => (
                                <div key={f.key}>
                                  <label className="text-[8px] font-bold text-muted-foreground uppercase">{f.label}</label>
                                  <input type={f.type} value={f.val}
                                    onChange={e => updateItem(idx, { [f.key]: parseFloat(e.target.value)||0 } as any)}
                                    className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]"
                                    {...(f.step ? { step: f.step } : {})}
                                    {...(f.min !== undefined ? { min: f.min } : {})}
                                    {...(f.max !== undefined ? { max: f.max } : {})}
                                  />
                                </div>
                              ))}
                              <div>
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Cour/Part</label>
                                <input value={item.cour||''} onChange={e => updateItem(idx, { cour: e.target.value })}
                                  placeholder="misal: Part 2"
                                  className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Status</label>
                                <select value={item.status} onChange={e => updateItem(idx, { status: e.target.value as any })}
                                  className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]">
                                  <option value="completed">Completed</option>
                                  <option value="planned">Planned</option>
                                  <option value="on-going">On-Going</option>
                                </select>
                              </div>
                              {/* Watch Status */}
                              <div>
                                <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  👁 Watch Status
                                </label>
                                <select
                                  value={item.watch_status || 'none'}
                                  onChange={e => updateItem(idx, { watch_status: e.target.value as any })}
                                  className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]">
                                  <option value="none">None</option>
                                  <option value="want_to_watch">Mau Nonton</option>
                                  <option value="watching">Sedang Nonton</option>
                                  <option value="watched">Sudah Ditonton</option>
                                </select>
                              </div>
                              <div className="col-span-2 sm:col-span-3">
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Genre</label>
                                <input value={item.genre||''} onChange={e => updateItem(idx, { genre: e.target.value })}
                                  className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                              </div>

                              <div className="col-span-2 sm:col-span-3">
                                <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  📝 Catatan / Note
                                  <span className="text-[7px] font-normal opacity-60">(* = fav+bm, ** = bm, OP = fav only)</span>
                                </label>
                                <textarea
                                  value={item.note}
                                  onChange={e => {
                                    const { is_favorite, is_bookmarked } = interpretNote(e.target.value);
                                    updateItem(idx, { note: e.target.value, is_favorite, is_bookmarked });
                                  }}
                                  rows={3}
                                  placeholder="Tulis catatan bebas..."
                                  className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-[10px] resize-y min-h-[60px]"
                                />
                              </div>

                              <div className="col-span-2 sm:col-span-3">
                                <ParentTitleField
                                  value={item.parent_title || ''}
                                  onChange={v => updateItem(idx, { parent_title: v })}
                                  allItems={parsedItems}
                                  currentIndex={idx}
                                />
                              </div>

                              <div className="flex items-end gap-3">
                                {([
                                  { key:'is_favorite', label:'❤️ Fav' },
                                  { key:'is_bookmarked', label:'🔖 BM' },
                                  { key:'is_movie', label:'🎬 Movie' },
                                ] as const).map(({ key, label }) => (
                                  <label key={key} className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground cursor-pointer">
                                    <input type="checkbox" checked={!!item[key]}
                                      onChange={e => updateItem(idx, { [key]: e.target.checked } as any)}
                                      className="rounded" />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Rich fields section */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              <div className="col-span-2 sm:col-span-3">
                                <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <BookOpen className="w-2.5 h-2.5" /> Sinopsis
                                  {item.enriched && <span className="ml-1 px-1 py-0.5 rounded bg-success/15 text-success text-[7px] font-bold">Bahasa Indonesia</span>}
                                </label>
                                <textarea value={item.synopsis||''} onChange={e => updateItem(idx, { synopsis: e.target.value })}
                                  rows={3} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px] resize-y" />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <Building2 className="w-2.5 h-2.5" /> Studio
                                </label>
                                <input value={item.studio||''} onChange={e => updateItem(idx, { studio: e.target.value })}
                                  className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <CalendarClock className="w-2.5 h-2.5" /> Tahun
                                </label>
                                <input type="number" value={item.release_year||''}
                                  onChange={e => updateItem(idx, { release_year: parseInt(e.target.value)||null })}
                                  className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Episodes</label>
                                <input type="number" value={item.episodes||0}
                                  onChange={e => updateItem(idx, { episodes: parseInt(e.target.value)||0 })}
                                  className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-muted-foreground uppercase">Ep Ditonton</label>
                                <input type="number" value={item.episodes_watched||0}
                                  onChange={e => updateItem(idx, { episodes_watched: parseInt(e.target.value)||0 })}
                                  className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                              </div>
                              {item.is_movie && (
                                <div>
                                  <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <Film className="w-2.5 h-2.5" /> Durasi (menit)
                                  </label>
                                  <input type="number" value={item.duration_minutes||''}
                                    onChange={e => updateItem(idx, { duration_minutes: parseInt(e.target.value)||null })}
                                    className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                                </div>
                              )}
                              <div className="col-span-2 sm:col-span-3 flex gap-2 flex-wrap">
                                {item.mal_id && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono">MAL#{item.mal_id}</span>}
                                {item.anilist_id && <span className="text-[8px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 font-mono">AL#{item.anilist_id}</span>}
                                {item.alternative_titles && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold flex items-center gap-0.5">
                                    <Globe className="w-2.5 h-2.5" /> Alt Titles ✓
                                  </span>
                                )}
                                {item.watch_status && item.watch_status !== 'none' && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-success/10 text-success font-bold">
                                    👁 {item.watch_status}
                                  </span>
                                )}
                                {item.mal_url && (
                                  <a href={item.mal_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
                                    <Link2 className="w-2.5 h-2.5" /> MAL
                                  </a>
                                )}
                                {item.anilist_url && (
                                  <a href={item.anilist_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
                                    <Link2 className="w-2.5 h-2.5" /> AniList
                                  </a>
                                )}
                              </div>

                              {item.alternative_titles && (
                                <div className="col-span-2 sm:col-span-3">
                                  <AltTitlesInline altJson={item.alternative_titles} mediaType={mediaType} />
                                </div>
                              )}

                              {/* Judul asli di expanded view */}
                              {item.originalTitle && item.originalTitle !== item.title && (
                                <div className="col-span-2 sm:col-span-3 p-2 rounded-lg bg-muted/40 border border-border/50">
                                  <p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5">Judul Input Asli</p>
                                  <p className="text-[10px] text-foreground font-medium">"{item.originalTitle}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Tampilkan info saat filter aktif dan ada item */}
                    {filterNeedVerify && displayedItems.length > 0 && (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <button
                          onClick={() => setFilterNeedVerify(false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold hover:bg-accent transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          Tampilkan semua {parsedItems.length} item
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

    </>
  );
}
