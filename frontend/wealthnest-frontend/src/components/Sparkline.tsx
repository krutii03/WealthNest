type Props = {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
};

export default function Sparkline({ values, width = 120, height = 32, stroke = '#0ea5a4', fill = 'none' }: Props) {
  if (!values || values.length === 0) return <svg width={width} height={height} role="img" aria-label="No data"/>;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {fill !== 'none' && (
        <polyline points={`${points} ${width},${height} 0,${height}`} fill={fill} stroke="none" />
      )}
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
