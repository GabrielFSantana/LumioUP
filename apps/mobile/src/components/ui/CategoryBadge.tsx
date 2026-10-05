import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { radius, useTheme } from '../../theme';
import { useCategoryColor } from '../../theme/categoryColors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Ícones oferecidos ao criar/editar categorias (todos existem no Ionicons). */
export const CATEGORY_ICONS: IconName[] = [
  'home-outline',
  'restaurant-outline',
  'cafe-outline',
  'car-outline',
  'airplane-outline',
  'medkit-outline',
  'fitness-outline',
  'school-outline',
  'game-controller-outline',
  'gift-outline',
  'paw-outline',
  'bag-handle-outline',
  'phone-portrait-outline',
  'wifi-outline',
  'construct-outline',
  'repeat-outline',
  'receipt-outline',
  'card-outline',
  'cash-outline',
  'laptop-outline',
  'trending-up-outline',
  'stats-chart-outline',
  'business-outline',
  'swap-horizontal-outline',
  'shield-checkmark-outline',
  'lock-closed-outline',
  'pie-chart-outline',
  'logo-bitcoin',
  'umbrella-outline',
  'pricetag-outline',
];

function safeIcon(name: string): IconName {
  return name in Ionicons.glyphMap ? (name as IconName) : 'pricetag-outline';
}

interface CategoryBadgeProps {
  icon: string;
  color: string;
  size?: number;
}

/** Quadrado arredondado com o ícone da categoria na cor escolhida. */
export function CategoryBadge({ icon, color, size = 44 }: CategoryBadgeProps) {
  const { isDark } = useTheme();
  const tint = useCategoryColor(color);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.badge,
        { width: size, height: size, backgroundColor: `${tint}${isDark ? '33' : '22'}` },
      ]}
    >
      <Ionicons name={safeIcon(icon)} size={size * 0.52} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.md - 2, alignItems: 'center', justifyContent: 'center' },
});
