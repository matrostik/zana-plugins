import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from './format.ts';

const SAVED_NOTICE_MS = 2_000;

/** Runs a settings mutation, tracking its error and briefly flagging success. */
export function useSettingsAction(onChanged: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<unknown>): Promise<boolean> => {
      setError(null);
      try {
        await fn();
        setSaved(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setSaved(false), SAVED_NOTICE_MS);
        onChanged();
        return true;
      } catch (cause) {
        setError(errorText(cause));
        return false;
      }
    },
    [onChanged]
  );

  return { error, saved, run };
}
