import { View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import { useTheme } from '../../theme';

interface MascotProps {
  size?: number;
  /** `happy`: sorriso fechado. `cheer`: boca aberta (comemoração). */
  mood?: 'happy' | 'cheer';
  /** Ícone decorativo por padrão; informe para leitores de tela quando for conteúdo. */
  label?: string;
}

const INK = '#14213D';

/** Lumi, o mascote. Rascunho vetorial: a arte final virá de ilustrador. */
export function Mascot({ size = 64, mood = 'happy', label }: MascotProps) {
  const { isDark } = useTheme();
  const svg = (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx={60} cy={64} r={54} fill="#FFE27A" opacity={isDark ? 0.18 : 0.55} />
      <Line x1={60} y1={30} x2={60} y2={14} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={60} cy={12} r={7} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
      <Circle cx={60} cy={68} r={36} fill="#FFC400" stroke={INK} strokeWidth={5} />
      <Ellipse cx={47} cy={62} rx={8} ry={10} fill="#FFFFFF" />
      <Ellipse cx={73} cy={62} rx={8} ry={10} fill="#FFFFFF" />
      <Circle cx={49} cy={64} r={5} fill={INK} />
      <Circle cx={75} cy={64} r={5} fill={INK} />
      {mood === 'cheer' ? (
        <Path
          d="M44 80 Q60 98 76 80 Z"
          fill={INK}
          stroke={INK}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="M48 82 Q60 94 72 82"
          fill="none"
          stroke={INK}
          strokeWidth={5}
          strokeLinecap="round"
        />
      )}
      <Circle cx={37} cy={77} r={4.5} fill="#FF9A7A" opacity={0.8} />
      <Circle cx={83} cy={77} r={4.5} fill="#FF9A7A" opacity={0.8} />
    </Svg>
  );
  // O rótulo fica num contêiner: `accessible` direto no SVG vira atributo inválido no DOM (web).
  return label ? (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      {svg}
    </View>
  ) : (
    svg
  );
}
