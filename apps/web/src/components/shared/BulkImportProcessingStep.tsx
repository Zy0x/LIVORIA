import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import type { AiProgress, Step } from './bulk-import-dialog-helpers';

interface BulkImportProcessingStepProps {
  aiProgress: AiProgress;
  step: Step;
  useAI: boolean;
}

export function BulkImportProcessingStep(props: BulkImportProcessingStepProps) {
  const { step, aiProgress, useAI } = props;
  return (
    <>
              {/* ══ STEP 2: PROCESSING ═════════════════════════════════════════════ */}
              {step === 'processing' && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  {aiProgress.status === 'rotating' ? (
                    <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                  ) : aiProgress.status === 'error' ? (
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                  ) : (
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  )}
                  {useAI && aiProgress.total > 0 ? (
                    <div className="text-center space-y-3 w-full max-w-xs">
                      <p className="text-sm font-semibold text-foreground">
                        Chunk {aiProgress.current}/{aiProgress.total}
                      </p>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${(aiProgress.current / aiProgress.total) * 100}%` }} />
                      </div>

                      {aiProgress.status === 'rotating' && (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[10px] font-bold">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Rotasi Provider...
                        </div>
                      )}
                      {aiProgress.status === 'error' && aiProgress.lastError && (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          {aiProgress.lastError}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Menggunakan AI</p>
                        <div className="flex flex-col gap-1.5">
                          {aiProgress.provider && (
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                              <div className="flex flex-col gap-0.5 flex-1">
                                <p className="text-[10px] text-muted-foreground font-semibold">Provider:</p>
                                <p className="text-xs font-bold text-foreground">{aiProgress.provider}</p>
                              </div>
                            </div>
                          )}
                          {aiProgress.model && (
                            <div className="flex items-center gap-2 pl-6">
                              <div className="flex flex-col gap-0.5 flex-1">
                                <p className="text-[10px] text-muted-foreground font-semibold">Model:</p>
                                <p className="text-xs font-mono text-foreground bg-muted/50 px-2 py-1 rounded">{aiProgress.model}</p>
                              </div>
                            </div>
                          )}
                          {!aiProgress.provider && (
                            <p className="text-xs text-muted-foreground italic">Menghubungkan...</p>
                          )}
                        </div>
                      </div>

                      {aiProgress.itemsSoFar > 0 && (
                        <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <p className="text-xs font-semibold text-emerald-700">{aiProgress.itemsSoFar} item berhasil diparsing</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-medium">
                      {useAI ? 'Menghubungkan ke AI...' : 'Mem-parse data…'}
                    </p>
                  )}
                </div>
              )}

    </>
  );
}
