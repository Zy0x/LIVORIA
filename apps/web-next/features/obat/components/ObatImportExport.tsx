import {
  buttonRowStyle,
  inlineFormStyle,
  inputStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
} from './obat.styles';

export function ObatImportExport({
  exportHref,
  formAction,
  isPending,
}: {
  exportHref: string;
  formAction: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <section style={{ ...panelStyle, marginTop: 16 }}>
      <h2 style={sectionTitleStyle}>Import / Export</h2>
      <div style={buttonRowStyle}>
        <a
          download="livoria-obat-export.json"
          href={exportHref}
          style={secondaryButtonStyle}
        >
          Export JSON
        </a>
        <form action={formAction} encType="multipart/form-data" style={inlineFormStyle}>
          <input name="intent" type="hidden" value="import_json" />
          <input accept="application/json,.json" name="json_file" required style={inputStyle} type="file" />
          <button disabled={isPending} style={primaryButtonStyle} type="submit">
            Import JSON
          </button>
        </form>
      </div>
    </section>
  );
}
