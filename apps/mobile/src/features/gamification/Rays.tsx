import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const WEDGES = 18;
const RADIUS = 400;

/** Raios saindo do centro (fundo da tela de subir de nível). Estático: sem animação. */
export function Rays({ color, centerY = 38 }: { color: string; centerY?: number }) {
  const step = 360 / WEDGES;
  const paths = Array.from({ length: WEDGES }, (_, i) => {
    const a1 = (i * step * Math.PI) / 180;
    const a2 = ((i * step + step / 2) * Math.PI) / 180;
    const p1 = `${(Math.cos(a1) * RADIUS).toFixed(1)},${(Math.sin(a1) * RADIUS).toFixed(1)}`;
    const p2 = `${(Math.cos(a2) * RADIUS).toFixed(1)},${(Math.sin(a2) * RADIUS).toFixed(1)}`;
    return `M0,0 L${p1} L${p2} Z`;
  });
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox={`-100 ${-centerY * 2} 200 ${200}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {paths.map((d, i) => (
        <Path key={i} d={d} fill={color} opacity={0.85} />
      ))}
    </Svg>
  );
}
