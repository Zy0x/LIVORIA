import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react';
import { ArrowRightLeft, CalendarDays, Calculator, ChevronDown, ChevronUp, Edit2, FileText, Image, Plus, Upload, X } from 'lucide-react';
import type { Tagihan, TagihanStatus } from '@/lib/types';
import type { CalcResult } from '@/features/tagihan/domain/tagihan-calculation';
import { CurrencyInput } from '@/components/ui/currency-input';
import { TagihanInfoTooltip as InfoTooltip } from './TagihanInfoTooltip';
import { TagihanFieldLabel as FieldLabel } from './TagihanFieldLabel';
import { initialTagihanForm, TAGIHAN_FORM_TIPS as TIPS } from './tagihan-form-helpers';

type TagihanFormState = typeof initialTagihanForm;

interface TagihanFormAdvancedSectionsProps {
  addCustomMethod: () => void;
  allMethods: string[];
  bulanSaatIni: number;
  calc: CalcResult;
  customMethods: string[];
  editItem: Tagihan | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: File[];
  fmt: (value: number) => string;
  form: TagihanFormState;
  handleFileAdd: (event: ChangeEvent<HTMLInputElement>) => void;
  handleKoreksiSimpan: () => void | Promise<void>;
  inputClass: string;
  jadwalPreview: string;
  koreksiBulan: number;
  koreksiCatatan: string;
  koreksiMode: 'bulan' | 'nominal';
  koreksiNominal: number;
  koreksiPending: boolean;
  koreksiSisaBaru: number;
  koreksiTotalBaru: number;
  newMethod: string;
  removeCustomMethod: (method: string) => void;
  sectionClass: string;
  setFiles: Dispatch<SetStateAction<File[]>>;
  setForm: Dispatch<SetStateAction<TagihanFormState>>;
  setKoreksiBulan: Dispatch<SetStateAction<number>>;
  setKoreksiCatatan: Dispatch<SetStateAction<string>>;
  setKoreksiMode: Dispatch<SetStateAction<'bulan' | 'nominal'>>;
  setKoreksiNominal: Dispatch<SetStateAction<number>>;
  setNewMethod: Dispatch<SetStateAction<string>>;
  setShowAddMethod: Dispatch<SetStateAction<boolean>>;
  setShowKoreksi: Dispatch<SetStateAction<boolean>>;
  setShowMigration: Dispatch<SetStateAction<boolean>>;
  showAddMethod: boolean;
  showKoreksi: boolean;
  showMigration: boolean;
}

export function TagihanFormAdvancedSections(props: TagihanFormAdvancedSectionsProps) {
  const {
    sectionClass, form, setForm, inputClass, jadwalPreview, allMethods, customMethods, removeCustomMethod,
    showAddMethod, setShowAddMethod, newMethod, setNewMethod, addCustomMethod, editItem, showKoreksi, setShowKoreksi,
    fmt, bulanSaatIni, koreksiMode, setKoreksiMode, koreksiBulan, setKoreksiBulan, koreksiTotalBaru,
    koreksiNominal, setKoreksiNominal, koreksiSisaBaru, koreksiCatatan, setKoreksiCatatan, handleKoreksiSimpan, koreksiPending,
    showMigration, setShowMigration, calc, files, setFiles, fileInputRef, handleFileAdd,
  } = props;

  return (
    <>
                {/* ═══ Jadwal Angsuran & Notifikasi ═══ */}
                <div className={sectionClass}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Jadwal Angsuran & Notifikasi
                    </p>
                  </div>

                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, jenis_tempo: 'bulanan' })}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all ${form.jenis_tempo === 'bulanan' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        🔄 Angsuran Berkala
                        <InfoTooltip text={TIPS.angsuranBerkala} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, jenis_tempo: 'berjangka' })}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all ${form.jenis_tempo === 'berjangka' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        📅 Jatuh Tempo Tetap
                        <InfoTooltip text={TIPS.jatuhTempoTetap} />
                      </span>
                    </button>
                  </div>

                  {form.jenis_tempo === 'bulanan' ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-info/5 border border-info/20">
                        <CalendarDays className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Pilih <strong>tanggal buka jendela</strong> dan <strong>batas angsuran</strong> pertama, atau gunakan template jadwal di bawah.
                        </p>
                      </div>

                      {/* ── Template Jadwal Angsuran ── */}
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Template Jadwal</p>
                        <div className="flex flex-wrap gap-1.5">
                          {([
                            { label: 'Tgl 25 → 5', bayar: 25, tempo: 5 },
                            { label: 'Tgl 1 → 5', bayar: 1, tempo: 5 },
                            { label: 'Tgl 1 → 10', bayar: 1, tempo: 10 },
                            { label: 'Tgl 10 → 20', bayar: 10, tempo: 20 },
                            { label: 'Tgl 15 → 25', bayar: 15, tempo: 25 },
                            { label: 'Tgl 20 → 30', bayar: 20, tempo: 30 },
                          ]).map(tpl => {
                            // Helper: format YYYY-MM-DD tanpa konversi timezone
                            const toLocalISO = (y: number, m: number, d: number) =>
                              `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                            const akadDate = new Date(form.tanggal_mulai);
                            // Guard: skip render jika akad belum diisi / invalid
                            if (!form.tanggal_mulai || isNaN(akadDate.getTime())) return null;

                            const akadDay = akadDate.getDate();

                            // Tentukan bulan mulai jendela bayar pertama
                            let startMonth = akadDate.getMonth();
                            let startYear = akadDate.getFullYear();
                            // Jika hari akad >= hari bayar template → mulai bulan depan
                            if (akadDay >= tpl.bayar) {
                              startMonth++;
                              if (startMonth > 11) { startMonth = 0; startYear++; }
                            }

                            // Clamp hari bayar ke hari terakhir bulan (misal Feb tidak ada tgl 30)
                            const lastDayBayar = new Date(startYear, startMonth + 1, 0).getDate();
                            const clampedBayar = Math.min(tpl.bayar, lastDayBayar);
                            const bayarStr = toLocalISO(startYear, startMonth, clampedBayar);

                            // Bulan tempo: jika tempo < bayar → lintas bulan (bulan berikutnya)
                            let tempoMonth = startMonth;
                            let tempoYear = startYear;
                            if (tpl.tempo < tpl.bayar) {
                              tempoMonth++;
                              if (tempoMonth > 11) { tempoMonth = 0; tempoYear++; }
                            }

                            const lastDayTempo = new Date(tempoYear, tempoMonth + 1, 0).getDate();
                            const clampedTempo = Math.min(tpl.tempo, lastDayTempo);
                            const tempoStr = toLocalISO(tempoYear, tempoMonth, clampedTempo);

                            // Deteksi apakah template ini sedang aktif
                            const isActive =
                              form.tgl_bayar_tanggal === bayarStr &&
                              form.tgl_tempo_tanggal === tempoStr;

                            return (
                              <button
                                key={tpl.label}
                                type="button"
                                onClick={() => setForm({
                                  ...form,
                                  tgl_bayar_tanggal: bayarStr,
                                  tgl_tempo_tanggal: tempoStr,
                                })}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                                }`}
                              >
                                {tpl.label}
                              </button>
                            );
                          })}
                        </div>
                        {form.tanggal_mulai && (
                          <p className="text-[9px] text-muted-foreground mt-1.5">
                            📅 Akad: {new Date(form.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {(() => {
                              const akadDay = new Date(form.tanggal_mulai).getDate();
                              if (form.tgl_bayar_tanggal) {
                                const bayarDay = new Date(form.tgl_bayar_tanggal).getDate();
                                if (akadDay >= bayarDay) return ' — Jadwal dimulai bulan depan';
                                return ' — Jadwal dimulai bulan ini';
                              }
                              return '';
                            })()}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <FieldLabel tooltip={TIPS.bukaJendela}>
                            <span className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-info/20 text-info text-[10px] font-bold flex items-center justify-center">1</span>
                              Tanggal Buka Jendela Angsuran
                            </span>
                          </FieldLabel>
                          <input
                            type="date"
                            value={form.tgl_bayar_tanggal}
                            onChange={e => setForm({ ...form, tgl_bayar_tanggal: e.target.value })}
                            className={inputClass}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Awal periode penerimaan angsuran
                          </p>
                        </div>
                        <div>
                          <FieldLabel tooltip={TIPS.batasAngsuran}>
                            <span className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-destructive/20 text-destructive text-[10px] font-bold flex items-center justify-center">2</span>
                              Tanggal Batas Angsuran
                            </span>
                          </FieldLabel>
                          <input
                            type="date"
                            value={form.tgl_tempo_tanggal}
                            onChange={e => setForm({ ...form, tgl_tempo_tanggal: e.target.value })}
                            className={inputClass}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Tanggal jatuh tempo angsuran
                          </p>
                        </div>
                      </div>

                      {jadwalPreview && (
                        <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                          <p className="text-xs font-semibold text-success mb-1.5 flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" /> Siklus Angsuran Terdeteksi
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{jadwalPreview}</p>

                          {form.tgl_bayar_tanggal && form.tgl_tempo_tanggal && (() => {
                            const bayarDay = new Date(form.tgl_bayar_tanggal).getDate();
                            const tempoDay = new Date(form.tgl_tempo_tanggal).getDate();
                            const crossMonth = tempoDay < bayarDay;
                            const today = new Date();
                            const examples: string[] = [];
                            for (let i = 0; i < 3; i++) {
                              const refMonth = (today.getMonth() + i) % 12;
                              const refYear = today.getFullYear() + Math.floor((today.getMonth() + i) / 12);
                              const lastDayBayar = new Date(refYear, refMonth + 1, 0).getDate();
                              const clampedBayar = Math.min(bayarDay, lastDayBayar);
                              let tempoMonth = refMonth;
                              let tempoYear = refYear;
                              if (crossMonth) {
                                tempoMonth = refMonth === 11 ? 0 : refMonth + 1;
                                tempoYear = refMonth === 11 ? refYear + 1 : refYear;
                              }
                              const lastDayTempo = new Date(tempoYear, tempoMonth + 1, 0).getDate();
                              const clampedTempo = Math.min(tempoDay, lastDayTempo);
                              const startDate = new Date(refYear, refMonth, clampedBayar);
                              const endDate = new Date(tempoYear, tempoMonth, clampedTempo);
                              examples.push(`${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`);
                            }
                            return (
                              <div className="mt-2 space-y-1">
                                <p className="text-[10px] font-medium text-muted-foreground">Contoh jendela angsuran (3 bulan ke depan):</p>
                                {examples.map((ex, i) => (
                                  <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center shrink-0">{i + 1}</span>
                                    {ex}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Tentukan rentang pembayaran dan tanggal jatuh tempo akhir pembiayaan.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>Tanggal Mulai Pembayaran</FieldLabel>
                          <input
                            type="date"
                            value={form.tanggal_mulai_bayar}
                            onChange={e => setForm({ ...form, tanggal_mulai_bayar: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel tooltip={TIPS.batasAngsuran}>Tanggal Jatuh Tempo Akhir</FieldLabel>
                          <input
                            type="date"
                            value={form.tanggal_jatuh_tempo_input}
                            onChange={e => setForm({ ...form, tanggal_jatuh_tempo_input: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ═══ Saluran Pembayaran ═══ */}
                <div className={sectionClass}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Saluran Pembayaran
                    </p>
                    <InfoTooltip text={TIPS.saluranPembayaran} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allMethods.map(m => (
                      <div key={m} className="relative group">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, metode_pembayaran: m })}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${form.metode_pembayaran === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}
                        >
                          {m}
                        </button>
                        {customMethods.includes(m) && (
                          <button
                            type="button"
                            onClick={() => removeCustomMethod(m)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!showAddMethod ? (
                      <button
                        type="button"
                        onClick={() => setShowAddMethod(true)}
                        className="px-3 py-2 rounded-lg text-xs font-medium border border-dashed border-border text-muted-foreground hover:bg-accent transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> + Tambah Saluran
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newMethod}
                          onChange={e => setNewMethod(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomMethod())}
                          placeholder="Nama saluran"
                          className="px-2.5 py-2 rounded-lg border border-input bg-background text-xs w-28 focus:outline-none focus:ring-2 focus:ring-ring/20"
                          autoFocus maxLength={30}
                        />
                        <button type="button" onClick={addCustomMethod} className="p-2 rounded-lg bg-primary text-primary-foreground"><Plus className="w-3 h-3" /></button>
                        <button type="button" onClick={() => { setShowAddMethod(false); setNewMethod(''); }} className="p-2 rounded-lg bg-muted text-muted-foreground"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ═══ Sumber Dana ═══ */}
                <div className={sectionClass}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Sumber Dana
                    </p>
                    <InfoTooltip text={TIPS.sumberDana} />
                  </div>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, sumber_modal: 'modal_terpisah' })}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all min-h-[44px] ${form.sumber_modal === 'modal_terpisah' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        💰 Dana Sendiri
                        <InfoTooltip text={TIPS.danaSendiri} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, sumber_modal: 'modal_bergulir' })}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all min-h-[44px] ${form.sumber_modal === 'modal_bergulir' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        🔄 Dana Bergulir
                        <InfoTooltip text={TIPS.danaRevolving} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, sumber_modal: 'dana_luar' })}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all min-h-[44px] ${form.sumber_modal === 'dana_luar' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        🏦 Dana Luar
                        <InfoTooltip text="Modal berasal dari pihak ketiga/eksternal yang bukan milik pribadi pengguna (misalnya investor, lembaga, keluarga)." />
                      </span>
                    </button>
                  </div>
                </div>

                {/* ═══ Denda & Status ═══ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel tooltip={TIPS.dendaKeterlambatan}>Denda Keterlambatan (%/hari)</FieldLabel>
                    <input
                      type="number"
                      value={form.denda_persen_per_hari || ''}
                      onChange={e => setForm({ ...form, denda_persen_per_hari: Number(e.target.value) })}
                      placeholder="0"
                      className={inputClass}
                      min={0} max={10} step={0.01}
                    />
                  </div>
                  {editItem && (
                    <div>
                      <FieldLabel>Status Pembiayaan</FieldLabel>
                      <select
                        value={form.status}
                        onChange={e => setForm({ ...form, status: e.target.value as TagihanStatus })}
                        className={inputClass}
                      >
                        <option value="aktif">Aktif</option>
                        <option value="lunas">Lunas</option>
                        <option value="overdue">Overdue</option>
                        <option value="ditunda">Ditunda</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* ═══ Rekonsiliasi Saldo Angsuran (Edit only) ═══ */}
                {editItem && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowKoreksi(!showKoreksi)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-info" />
                        <span className="text-sm font-medium text-foreground">Rekonsiliasi Saldo Angsuran</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/20 text-info font-medium">Rekonsiliasi</span>
                        <InfoTooltip text={TIPS.rekonsiliasi} />
                      </div>
                      {showKoreksi ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {showKoreksi && (
                      <div className="p-3 sm:p-4 space-y-3 border-t border-border">
                        <div className="rounded-lg bg-muted/40 p-2.5 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Total kewajiban</span><span className="font-semibold">{fmt(Number(editItem.total_hutang))}</span></div>
                          <div className="flex justify-between mt-1"><span className="text-muted-foreground">Total angsuran terbayar</span><span className="font-semibold text-success">{fmt(Number(editItem.total_dibayar))}</span></div>
                          <div className="flex justify-between mt-1"><span className="text-muted-foreground">Angsuran per bulan</span><span className="font-semibold">{fmt(Number(editItem.cicilan_per_bulan))}</span></div>
                          <div className="flex justify-between mt-1"><span className="text-muted-foreground">Estimasi periode terbayar</span><span className="font-semibold">{bulanSaatIni} periode</span></div>
                        </div>
                        <div className="flex rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setKoreksiMode('bulan')}
                            className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${koreksiMode === 'bulan' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                          >
                            📅 Per Periode Angsuran
                          </button>
                          <button
                            type="button"
                            onClick={() => setKoreksiMode('nominal')}
                            className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${koreksiMode === 'nominal' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                          >
                            💰 Nominal Terbayar
                          </button>
                        </div>
                        {koreksiMode === 'bulan' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <FieldLabel>Angsuran Sudah Dibayar</FieldLabel>
                              <input
                                type="number"
                                value={koreksiBulan || ''}
                                onChange={e => setKoreksiBulan(Number(e.target.value))}
                                placeholder={String(bulanSaatIni)}
                                className={inputClass}
                                min={0} max={editItem.jangka_waktu_bulan}
                              />
                            </div>
                            <div>
                              <FieldLabel>Total Angsuran Terhitung</FieldLabel>
                              <div className="px-3 py-2.5 rounded-lg border border-input bg-muted text-sm font-semibold">{fmt(koreksiTotalBaru)}</div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <FieldLabel>Saldo Terbayar (Nominal)</FieldLabel>
                            <CurrencyInput value={koreksiNominal} onChange={setKoreksiNominal} placeholder="Masukkan total angsuran terbayar" />
                          </div>
                        )}
                        {koreksiTotalBaru !== Number(editItem.total_dibayar) && (
                          <div className="rounded-lg bg-muted/40 p-2.5 space-y-1 text-[10px] text-muted-foreground">
                            <div className="flex justify-between"><span>Total terbayar (sebelum)</span><span>{fmt(Number(editItem.total_dibayar))}</span></div>
                            <div className="flex justify-between"><span>Total terbayar (setelah)</span><span className={`font-bold ${koreksiTotalBaru > Number(editItem.total_dibayar) ? 'text-success' : 'text-warning'}`}>{fmt(koreksiTotalBaru)}</span></div>
                            <div className="flex justify-between border-t border-border pt-1"><span>Sisa kewajiban baru</span><span className="font-bold">{fmt(koreksiSisaBaru)}</span></div>
                          </div>
                        )}
                        <div>
                          <FieldLabel>Keterangan Rekonsiliasi</FieldLabel>
                          <input
                            type="text"
                            value={koreksiCatatan}
                            onChange={e => setKoreksiCatatan(e.target.value)}
                            placeholder="cth: Penyesuaian data historis nasabah"
                            className={inputClass}
                            maxLength={200}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleKoreksiSimpan}
                          disabled={koreksiPending || koreksiTotalBaru === Number(editItem.total_dibayar)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-info text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40"
                        >
                          <Edit2 className="w-4 h-4" />
                          {koreksiPending ? 'Menyimpan...' : 'Simpan Rekonsiliasi'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ Input Saldo Awal / Migrasi (Tambah only) ═══ */}
                {!editItem && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowMigration(!showMigration)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-warning" />
                        <span className="text-sm font-medium text-foreground">Input Saldo Awal / Migrasi</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">Opsional</span>
                        <InfoTooltip text={TIPS.saldoAwal} />
                      </div>
                      {showMigration ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {showMigration && (
                      <div className="p-3 sm:p-4 space-y-3 border-t border-border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <FieldLabel>Angsuran Sudah Dibayar</FieldLabel>
                            <input
                              type="number"
                              value={form.sudah_dibayar_bulan || ''}
                              onChange={e => {
                                const bulan = Number(e.target.value);
                                setForm({ ...form, sudah_dibayar_bulan: bulan, total_sudah_dibayar: bulan * calc.cicilanPerBulan });
                              }}
                              placeholder="0"
                              className={inputClass}
                              min={0} max={form.jangka_waktu_bulan}
                            />
                          </div>
                          <div>
                            <FieldLabel tooltip={TIPS.saldoAwal}>Saldo Terbayar Sebelumnya</FieldLabel>
                            <CurrencyInput value={form.total_sudah_dibayar} onChange={v => setForm({ ...form, total_sudah_dibayar: v })} placeholder="0" />
                          </div>
                        </div>
                        {form.total_sudah_dibayar > 0 && (
                          <div className="text-xs text-muted-foreground p-2 bg-accent/30 rounded-md">
                            Sisa kewajiban setelah migrasi: <span className="font-bold text-foreground">{fmt(Math.max(0, calc.totalHutang - form.total_sudah_dibayar))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ Keterangan Tambahan ═══ */}
                <div>
                  <FieldLabel>Keterangan Tambahan</FieldLabel>
                  <textarea
                    value={form.catatan}
                    onChange={e => setForm({ ...form, catatan: e.target.value })}
                    placeholder="Catatan atau keterangan tambahan (opsional)"
                    rows={2}
                    className={`${inputClass} resize-none`}
                    maxLength={500}
                  />
                </div>

                {/* ═══ Lampiran Dokumen (Tambah only) ═══ */}
                {!editItem && (
                  <div className={sectionClass}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lampiran Dokumen / Struk</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Opsional</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs">
                          {f.type.startsWith('image/') ? <Image className="w-3.5 h-3.5 text-info" /> : <FileText className="w-3.5 h-3.5 text-warning" />}
                          <span className="max-w-[120px] truncate">{f.name}</span>
                          <button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-0.5 rounded hover:bg-destructive/20">
                            <X className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-accent/30 transition-all text-sm text-muted-foreground"
                    >
                      <Upload className="w-4 h-4" /> Tambah Dokumen / Struk (maks 5MB)
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple onChange={handleFileAdd} className="hidden" />
                  </div>
                )}

                {/* ═══ Simulasi Pembiayaan ═══ */}
                <div className="rounded-lg bg-muted/50 border border-border p-3 sm:p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" /> Simulasi Pembiayaan
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                        Total Kewajiban
                        <InfoTooltip text={TIPS.totalKewajiban2} />
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{fmt(calc.totalHutang)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                        Angsuran/Bulan
                        <InfoTooltip text={TIPS.angsuranPerBulan} />
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-primary mt-0.5">{fmt(calc.cicilanPerBulan)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                        Pendapatan Bunga
                        <InfoTooltip text={TIPS.pendapatanBunga} />
                      </p>
                      <p className="text-xs sm:text-sm font-bold mt-0.5" style={{ color: 'hsl(var(--success))' }}>{fmt(calc.keuntunganEstimasi)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
                    <div>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                        Bunga Efektif/Thn
                        <InfoTooltip text={TIPS.bungaEfektif} />
                      </p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{calc.bungaEfektifPerTahun}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Bunga Efektif/Bln</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{calc.bungaEfektifPerBulan}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Bunga Efektif/Hari</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{calc.bungaEfektifPerHari}%</p>
                    </div>
                  </div>
                </div>
    </>
  );
}
