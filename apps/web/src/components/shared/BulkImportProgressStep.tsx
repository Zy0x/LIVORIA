import { Check, Download, RotateCcw, Square } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function BulkImportProgressStep(props: any) {
  const { step, importProgress, running, stopProcess, setStep, resetAll, onOpenChange, logs, logBoxRef, downloadLog } = props;
  return (
    <>
              {/* ══ STEP 4 & 5: ENRICHING / IMPORTING ═════════════════════════════ */}
              {(step === 'enriching' || step === 'importing' || step === 'translating') && (
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label:'Total',    val: importProgress.total,   cls: 'border-border' },
                      { label:'Berhasil', val: importProgress.ok,      cls: 'border-emerald-500/30 text-emerald-500' },
                      { label:'Dilewati', val: importProgress.skip,    cls: 'border-amber-500/30  text-amber-500' },
                      { label:'Error',    val: importProgress.err,     cls: 'border-destructive/30 text-destructive' },
                    ].map(s => (
                      <div key={s.label} className={`rounded-xl border bg-card p-2 text-center ${s.cls}`}>
                        <div className={`text-lg sm:text-xl font-black ${s.cls.includes('text') ? s.cls.split(' ').find(c => c.startsWith('text')) : ''}`}>
                          {s.val}
                        </div>
                        <div className="text-[9px] text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Progress value={importProgress.total > 0 ? (importProgress.current/importProgress.total)*100 : 0} className="h-2" />
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                      <span>{step === 'enriching' ? 'Auto-fill' : step === 'translating' ? 'Terjemahan' : 'Import'}: {importProgress.current}/{importProgress.total}</span>
                      <span>{importProgress.total > 0 ? Math.round((importProgress.current/importProgress.total)*100) : 0}%</span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {running ? (
                      <button onClick={stopProcess}
                        className="px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-1.5">
                        <Square className="w-3 h-3" /> Stop
                      </button>
                    ) : (
                      <>
                        {(step === 'enriching' || step === 'translating') && (
                          <button onClick={() => setStep('preview')}
                            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5">
                            <Check className="w-3 h-3" /> Lanjut ke Preview
                          </button>
                        )}
                        {step === 'importing' && !running && importProgress.current === importProgress.total && (
                          <button onClick={() => { resetAll(); onOpenChange(false); }}
                            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5">
                            <Check className="w-3 h-3" /> Selesai
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={resetAll}
                      className="px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                    {logs.length > 0 && (
                      <button onClick={downloadLog}
                        className="px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Download className="w-3 h-3" /> Log
                      </button>
                    )}
                  </div>

                  <div ref={logBoxRef}
                    className="rounded-xl border border-border bg-background h-[200px] sm:h-[250px] overflow-y-auto p-2 font-mono text-[10px] space-y-0.5">
                    {logs.map((entry, i) => (
                      <div key={i} className="flex gap-1.5 py-0.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground shrink-0 w-12">{entry.time}</span>
                        <span className={
                          entry.type === 'ok'   ? 'text-emerald-600 dark:text-emerald-400' :
                          entry.type === 'err'  ? 'text-destructive' :
                          entry.type === 'skip' ? 'text-amber-600 dark:text-amber-400' :
                          'text-muted-foreground'
                        }>{entry.msg}</span>
                      </div>
                    ))}
                    {logs.length === 0 && <span className="text-muted-foreground">Menunggu…</span>}
                  </div>
                </div>
              )}
    </>
  );
}
