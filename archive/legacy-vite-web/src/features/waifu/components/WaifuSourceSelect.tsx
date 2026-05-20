import type { Dispatch, SetStateAction } from 'react';
import type { WaifuFormValues, WaifuSourceTitle } from '../types/waifu.types';

type WaifuSourceSelectProps = {
  form: WaifuFormValues;
  setForm: Dispatch<SetStateAction<WaifuFormValues>>;
  sourceSearch: string;
  setSourceSearch: Dispatch<SetStateAction<string>>;
  showSourceDropdown: boolean;
  setShowSourceDropdown: Dispatch<SetStateAction<boolean>>;
  filteredSources: WaifuSourceTitle[];
  inputClass: string;
};

export function WaifuSourceSelect({
  form,
  setForm,
  sourceSearch,
  setSourceSearch,
  showSourceDropdown,
  setShowSourceDropdown,
  filteredSources,
  inputClass,
}: WaifuSourceSelectProps) {
  return (
    <div className="relative">
      <label className="label-text mb-1.5 block">Sumber (Anime / Donghua)</label>
      <input
        type="text"
        value={sourceSearch}
        onChange={(event) => {
          setSourceSearch(event.target.value);
          setForm({ ...form, source: event.target.value });
          setShowSourceDropdown(true);
        }}
        onFocus={() => setShowSourceDropdown(true)}
        placeholder="Ketik atau pilih judul anime/donghua..."
        className={inputClass}
      />
      {showSourceDropdown && filteredSources.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSourceDropdown(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-48 overflow-y-auto animate-scale-in">
            {filteredSources.map((source, index) => (
              <button
                key={`${source.title}-${source.type}-${index}`}
                type="button"
                onClick={() => {
                  setForm({ ...form, source: source.title, source_type: source.type });
                  setSourceSearch(source.title);
                  setShowSourceDropdown(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors truncate flex items-center gap-2 ${form.source === source.title ? 'font-semibold text-primary' : ''}`}
              >
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${source.type === 'anime' ? 'bg-pastel-blue text-info' : 'bg-pastel-green text-success'}`}
                >
                  {source.type === 'anime' ? 'A' : 'D'}
                </span>
                <span className="truncate">{source.title}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="helper-text mt-1">Pilih dari daftar anime/donghua atau ketik manual</p>
    </div>
  );
}
