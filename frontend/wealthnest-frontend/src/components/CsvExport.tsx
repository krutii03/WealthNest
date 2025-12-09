import { downloadCsv } from '../utils/csv';

export default function CsvExport({ filename, rows }: { filename: string; rows: Array<Record<string, any>> }) {
  return (
    <button className="btn" onClick={() => downloadCsv(filename, rows)}>Export CSV</button>
  );
}
