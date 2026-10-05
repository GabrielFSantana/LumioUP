import { formatBRL, formatBrDate, type NetWorthPoint } from '@lumioup/core';
import { LineChart } from '../../components/charts/LineChart';

interface NetWorthChartProps {
  points: readonly NetWorthPoint[];
  height?: number;
}

/** Evolução do patrimônio ao longo do período (um ponto por data amostrada). */
export function NetWorthChart({ points, height = 110 }: NetWorthChartProps) {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 2) return null;
  return (
    <LineChart
      height={height}
      points={points.map((p) => ({ label: formatBrDate(p.date).slice(0, 5), value: p.total }))}
      summary={`Patrimônio de ${formatBrDate(first.date)} a ${formatBrDate(last.date)}: de ${formatBRL(
        first.total,
      )} para ${formatBRL(last.total)}.`}
    />
  );
}
