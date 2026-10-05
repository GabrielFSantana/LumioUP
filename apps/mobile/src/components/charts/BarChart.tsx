import { formatCompactBRL, niceMax } from '@lumioup/core';
import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { fonts, useTheme } from '../../theme';

export interface BarGroup {
  /** Rótulo do eixo horizontal (ex.: "out"). */
  label: string;
  /** Um valor por série, em centavos (sempre >= 0). */
  values: readonly number[];
}

interface BarChartProps {
  groups: readonly BarGroup[];
  /** Uma cor por série, na mesma ordem de `values`. */
  colors: readonly string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Descrição em texto para leitores de tela. */
  summary: string;
  height?: number;
}

const PAD_LEFT = 62;
const PAD_RIGHT = 8;
const PAD_TOP = 14;
const PAD_BOTTOM = 24;
const BAR_GAP = 4;
const MAX_BAR_WIDTH = 20;

/** Barras agrupadas (uma barra por série em cada grupo). Toque em um grupo para selecioná-lo. */
export function BarChart({
  groups,
  colors: seriesColors,
  selectedIndex,
  onSelect,
  summary,
  height = 180,
}: BarChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const maxValue = niceMax(Math.max(0, ...groups.flatMap((g) => [...g.values])));
  const innerW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + plotH;
  const groupW = groups.length > 0 ? innerW / groups.length : innerW;
  const series = seriesColors.length;
  const barW = Math.min(MAX_BAR_WIDTH, (groupW * 0.7 - BAR_GAP * (series - 1)) / series);
  const clusterW = barW * series + BAR_GAP * (series - 1);

  const gridValues = [0, maxValue / 2, maxValue];

  return (
    <View onLayout={onLayout}>
      <View accessible accessibilityRole="image" accessibilityLabel={summary}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {gridValues.map((v) => {
              const y = baseline - (v / maxValue) * plotH;
              return (
                <G key={v}>
                  <Line
                    x1={PAD_LEFT}
                    x2={width - PAD_RIGHT}
                    y1={y}
                    y2={y}
                    stroke={colors.border}
                    strokeWidth={v === 0 ? 2 : 1}
                  />
                  <SvgText
                    x={PAD_LEFT - 8}
                    y={y + 4}
                    fontSize={11}
                    textAnchor="end"
                    fontFamily={fonts.bodyBold}
                    fill={colors.textMuted}
                  >
                    {formatCompactBRL(Math.round(v))}
                  </SvgText>
                </G>
              );
            })}

            {groups.map((g, i) => {
              const left = PAD_LEFT + i * groupW;
              const x0 = left + (groupW - clusterW) / 2;
              const selected = i === selectedIndex;
              return (
                <G key={`${g.label}-${i}`}>
                  {selected ? (
                    <Rect
                      x={left + 2}
                      y={PAD_TOP - 4}
                      width={groupW - 4}
                      height={plotH + 4}
                      rx={8}
                      fill={colors.primarySoft}
                    />
                  ) : null}
                  {g.values.map((v, s) => {
                    const h = v > 0 ? Math.max((v / maxValue) * plotH, 3) : 0;
                    return (
                      <Rect
                        key={s}
                        x={x0 + s * (barW + BAR_GAP)}
                        y={baseline - h}
                        width={barW}
                        height={h}
                        rx={4}
                        fill={seriesColors[s]}
                      />
                    );
                  })}
                  <SvgText
                    x={left + groupW / 2}
                    y={height - 6}
                    fontSize={12}
                    textAnchor="middle"
                    fontFamily={selected ? fonts.bodyHeavy : fonts.bodyBold}
                    fill={selected ? colors.text : colors.textMuted}
                  >
                    {g.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        ) : (
          <View style={{ height }} />
        )}
      </View>
      {width > 0
        ? groups.map((g, i) => (
            <Pressable
              key={`tap-${g.label}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${g.label}`}
              accessibilityState={{ selected: i === selectedIndex }}
              onPress={() => onSelect(i)}
              style={{
                position: 'absolute',
                left: PAD_LEFT + i * groupW,
                top: 0,
                width: groupW,
                height,
              }}
            />
          ))
        : null}
    </View>
  );
}
