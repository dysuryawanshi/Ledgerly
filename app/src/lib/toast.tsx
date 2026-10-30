import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { palette } from './theme';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; kind: Kind };

const ToastContext = createContext<((message: string, kind?: Kind) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = useCallback((message: string, kind: Kind = 'success') => {
    setToast({ id: Date.now(), message, kind });
  }, []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.id}
        visible={!!toast}
        onDismiss={() => setToast(null)}
        duration={2800}
        icon={toast?.kind === 'error' ? 'alert-circle' : toast?.kind === 'success' ? 'check-circle' : 'information'}
        onIconPress={() => setToast(null)}
        style={[styles.bar, toast?.kind === 'error' && styles.error]}
        wrapperStyle={styles.wrapper}
      >
        {toast?.message}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: { bottom: 88 },
  bar: { backgroundColor: palette.greenDark },
  error: { backgroundColor: palette.danger },
});
