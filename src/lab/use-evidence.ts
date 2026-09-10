import { useEffect, useState } from 'react';
export function useEvidence<T>(
  file: 'opspilot' | 'designlens' | 'repopilot' | 'real-models',
) {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({
    data: null,
    error: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: false });
    void fetch(`/portfolio/cases/${file}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error('Evidence unavailable');
        return response.json() as Promise<T>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ data: null, error: true });
      });
    return () => controller.abort();
  }, [file]);
  return state;
}
