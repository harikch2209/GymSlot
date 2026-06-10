import { useCallback, useEffect, useState } from 'react';

interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  reload: () => void;
  refresh: () => Promise<void>;
}

/**
 * Tiny async-resource hook: runs `fetcher`, tracks loading/error, and exposes
 * pull-to-refresh. `deps` controls when it re-fetches.
 */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const run = useCallback(async (mode: 'load' | 'refresh') => {
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run('load');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, nonce]);

  const refresh = useCallback(() => run('refresh'), [run]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, refreshing, reload, refresh };
}
