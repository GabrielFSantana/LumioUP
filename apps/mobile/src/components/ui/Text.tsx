import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { fonts, useTheme, type Palette } from '../../theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyBold' | 'caption';

const variants: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23 },
  caption: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },
};

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** Chave da paleta; padrão: `text` (ou `textMuted` em `caption`). */
  tone?: keyof Palette;
}

export function Text({ variant = 'body', tone, style, ...props }: TextProps) {
  const { colors } = useTheme();
  const color = colors[tone ?? (variant === 'caption' ? 'textMuted' : 'text')];
  return <RNText {...props} style={[variants[variant], { color }, style]} />;
}
