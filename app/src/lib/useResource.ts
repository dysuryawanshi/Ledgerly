import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

/**
 * Loads data on mount and whenever the screen regains focus. Keeps the last
 * good data visible during background refreshes.
 */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true, refreshing: false });
  const request = useRef(0);
  const load = useCallback(fetcher, deps);

  const run = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      const id = ++request.current;
      setState((s) => ({
        ...s,
        loading: mode === 'initial' || (mode === 'silent' && s.data === null),
        refreshing: mode === 'refresh',
        error: mode === 'silent' ? s.error : null,
      }));
      try {
        const data = await load();
        if (id === request.current) setState({ data, error: null, loading: false, refreshing: false });
        return true;
      } catch (e) {
        if (id === request.current) {
          setState((s) => ({
            ...s,
            error: e instanceof Error ? e.message : 'Something went wrong.',
            loading: false,
            refreshing: false,
          }));
        }
        return false;
      }
    },
    [load],
  );

  useEffect(() => {
    void run('initial');
  }, [run]);

  // Refetch quietly when returning to the screen (e.g. after saving a form).
  const mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) void run('silent');
      mounted.current = true;
    }, [run]),
  );

  return {
    ...state,
    retry: () => run('initial'),
    refresh: () => run('refresh'),
  };
}
