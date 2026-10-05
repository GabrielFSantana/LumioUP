import { formatBRL, formatBrDate, type NetWorthPoint } from '@lumioup/core';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from '../../components/ui';
import { spacing, useTheme } from '../../theme';

interface NetWorthChartProps {
  points: readonly NetWorthPoint[];
  height?: number;
}

const PAD = 12;

/** Linha simples da evolução do patrimônio (SVG leve; a biblioteca de gráficos vem nos relatórios). */
export function NetWorthChart({ points, height = 110 }: NetWorthChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 2) return null;

  const values = points.map((p) => p.total);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const innerW = Math.max(width - PAD * 2, 1);
  const innerH = height - PAD * 2;

  const coords = points.map((p, i) => ({
    x: PAD + (i * innerW) / (points.length - 1),
    // Valores iguais: linha no meio, em vez de dividir por zero.
    y: range === 0 ? height / 2 : PAD + (1 - (p.total - min) / range) * innerH,
  }));
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${coords[coords.length - 1]?.x.toFixed(1)},${height} L${coords[0]?.x.toFixed(1)},${height} Z`;
  const end = coords[coords.length - 1];

  const summary = `Patrimônio de ${formatBrDate(first.date)} a ${formatBrDate(last.date)}: de ${formatBRL(first.total)} para ${formatBRL(last.total)}.`;

  return (
    <View>
      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Path d={area} fill={colors.primarySoft} />
            <Path
              d={line}
              fill="none"
              stroke={colors.primaryEdge}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {end ? (
              <Circle
                cx={end.x}
                cy={end.y}
                r={6}
                fill={colors.primary}
                stroke={colors.primaryEdge}
                strokeWidth={3}
              />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        <Text variant="caption">{formatBrDate(first.date).slice(0, 5)}</Text>
        <Text variant="caption">{formatBrDate(last.date).slice(0, 5)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
