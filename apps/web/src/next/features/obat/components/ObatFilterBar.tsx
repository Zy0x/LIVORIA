import type { ObatQuery } from '../obat.repository';
import {
  fieldLabelStyle,
  fieldStyle,
  filterGridStyle,
  inputStyle,
  panelStyle,
  primaryButtonStyle,
} from './obat.styles';

export function ObatFilterBar({
  query,
  typeOptions,
}: {
  query: ObatQuery;
  typeOptions: string[];
}) {
  return (
    <section style={{ ...panelStyle, marginTop: 16 }}>
      <form action="/obat#obat-list" style={filterGridStyle}>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Cari</span>
          <input defaultValue={query.search} name="search" placeholder="Nama, tipe, atau aturan pakai" style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Tipe</span>
          <select defaultValue={query.type} name="type" style={inputStyle}>
            <option value="all">Semua tipe</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Frekuensi</span>
          <select defaultValue={query.frequency} name="frequency" style={inputStyle}>
            <option value="all">Semua</option>
            <option value="rutin">Rutin harian</option>
            <option value="lainnya">Lainnya</option>
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Urutkan</span>
          <select defaultValue={query.sort} name="sort" style={inputStyle}>
            <option value="terbaru">Baru Ditambahkan</option>
            <option value="nama_az">Nama A-Z</option>
            <option value="tipe">Tipe</option>
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Per halaman</span>
          <select defaultValue={query.pageSize} name="pageSize" style={inputStyle}>
            {[6, 12, 24, 48].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button style={primaryButtonStyle} type="submit">
          Terapkan
        </button>
      </form>
    </section>
  );
}
