import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { edge, minTouch, radius, spacing } from '../../theme';
import { Text } from './Text';

interface ToastOptions {
  message: string;
  /** Rótulo da ação (ex.: "Desfazer"); a ação roda uma vez e fecha o aviso. */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 6000;
/** O aviso é sempre escuro (texto claro e ação amarela), nos dois temas, para manter o contraste. */
const TOAST_BACKGROUND = '#14213D';
const TOAST_BORDER = '#2A3558';
const TOAST_TEXT = '#FFF8E7';
const TOAST_ACTION = '#FFC400';
/** Espaço da barra de abas, para o aviso não ficar escondido atrás dela. */
const TAB_BAR_SPACE = 72;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(options);
      timer.current = setTimeout(dismiss, DURATION_MS);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.host, { bottom: insets.bottom + TAB_BAR_SPACE }]}
        >
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: TOAST_BACKGROUND, borderColor: TOAST_BORDER }]}
          >
            <Text variant="bodyBold" style={{ color: TOAST_TEXT, flex: 1 }}>
              {toast.message}
            </Text>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={toast.actionLabel}
                onPress={() => {
                  toast.onAction?.();
                  dismiss();
                }}
                style={styles.action}
              >
                <Text variant="bodyBold" style={{ color: TOAST_ACTION }}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return ctx;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTouch,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: edge - 1,
    maxWidth: 480,
    width: '100%',
  },
  action: { minHeight: minTouch, paddingHorizontal: spacing.sm, justifyContent: 'center' },
});
