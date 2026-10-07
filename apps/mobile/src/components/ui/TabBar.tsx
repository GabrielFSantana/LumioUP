import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius, spacing, useTheme } from '../../theme';

/**
 * Respiro mínimo abaixo das abas no Android. Alguns aparelhos (ex.: Xiaomi/POCO com gestos) informam
 * área segura zero embora a zona de gestos do sistema cubra a borda de baixo: sem isso os botões
 * ficam sob o gesto e não respondem ao toque.
 */
const MIN_BOTTOM_PADDING = Platform.select({ android: 16, web: 8, default: 0 });

/**
 * Barra de abas própria. A altura vem do conteúdo (ícone + rótulo + respiros), não de uma conta da
 * biblioteca, para o rótulo nunca sair da caixa nem da tela, em qualquer aparelho.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, MIN_BOTTOM_PADDING ?? 0);

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: bottom + spacing.xs,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key] ?? { options: {} };
        const focused = state.index === index;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);
        const color = focused ? colors.text : colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            aria-selected={focused}
            accessibilityLabel={label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.item, { backgroundColor: focused ? colors.primarySoft : 'transparent' }]}
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={[styles.label, { color, fontFamily: fonts.bodyBold }]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 2,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  item: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  label: { fontSize: 11 },
});
