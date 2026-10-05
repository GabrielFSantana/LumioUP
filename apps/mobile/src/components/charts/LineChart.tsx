import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { fonts, spacing, useTheme } from '../../theme';
import { Text } from '../ui';

export interface LinePoint {
  /** Rótulo do eixo horizontal (ex.: "out" ou "05/10"). */
  label: string;
  value: number;
}

interface LineChartProps {
  points: readonly LinePoint[];
  height?: number;
  /** Descrição em texto para leitores de tela. */
  summary: string;
  /** Quando informado, mostra o maior e o menor valor dentro do gráfico. */
  valueFormatter?: (value: number) => string;
}

const PAD_X = 12;
const PAD_Y = 16;

/** Linha com área, no estilo da identidade. Mostra todos os rótulos se couberem, senão início, meio e fim. */
export function LineChart({ points, height = 120, summary, valueFormatter }: LineChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const innerW = Math.max(width - PAD_X * 2, 1);
  const innerH = height - PAD_Y * 2;

  const coords = points.map((p, i) => ({
    x: PAD_X + (i * innerW) / (points.length - 1),
    // Valores iguais: linha no meio, em vez de dividir por zero.
    y: range === 0 ? height / 2 : PAD_Y + (1 - (p.value - min) / range) * innerH,
  }));
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const lastCoord = coords[coords.length - 1];
  const firstCoord = coords[0];
  const area = `${line} L${lastCoord?.x.toFixed(1)},${height} L${firstCoord?.x.toFixed(1)},${height} Z`;

  const labelIndexes =
    points.length <= 7
      ? points.map((_, i) => i)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];

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
            {lastCoord ? (
              <Circle
                cx={lastCoord.x}
                cy={lastCoord.y}
                r={6}
                fill={colors.primary}
                stroke={colors.primaryEdge}
                strokeWidth={3}
              />
            ) : null}
            {valueFormatter && range > 0 ? (
              <>
                <SvgText
                  x={PAD_X}
                  y={11}
                  fontSize={11}
                  fontFamily={fonts.bodyBold}
                  fill={colors.textMuted}
                >
                  {valueFormatter(max)}
                </SvgText>
                <SvgText
                  x={PAD_X}
                  y={height - 4}
                  fontSize={11}
                  fontFamily={fonts.bodyBold}
                  fill={colors.textMuted}
                >
                  {valueFormatter(min)}
                </SvgText>
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        {labelIndexes.map((i) => (
          <Text key={i} variant="caption">
            {points[i]?.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
