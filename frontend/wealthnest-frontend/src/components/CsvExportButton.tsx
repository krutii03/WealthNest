type Props = { filename: string; rows: any[] };

export default function CsvExportButton({ filename, rows }: Props) {
  const download = () => {
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={download}>
      Download CSV
    </button>
  );
}
