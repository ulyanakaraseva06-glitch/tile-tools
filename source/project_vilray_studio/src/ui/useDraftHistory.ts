import { useLayoutEffect, useRef, useState } from 'react';

/** History belongs to the active draft, never to the saved project underneath it. */
export function useDraftHistory<T>(sessionKey: string | null, snapshot: T) {
  const history = useRef<{ key: string | null; current: T; past: T[]; future: T[] }>({
    key: sessionKey, current: snapshot, past: [], future: [],
  });
  const [, refresh] = useState(0);
  useLayoutEffect(() => {
    const state = history.current;
    if (state.key !== sessionKey || sessionKey === null) {
      history.current = { key: sessionKey, current: snapshot, past: [], future: [] };
      if (state.key !== sessionKey) refresh((value) => value + 1);
      return;
    }
    if (JSON.stringify(state.current) === JSON.stringify(snapshot)) return;
    state.past.push(state.current);
    state.current = snapshot;
    state.future = [];
    refresh((value) => value + 1);
  }, [sessionKey, snapshot]);

  function travel(direction: 'past' | 'future'): T | undefined {
    const state = history.current;
    if (!sessionKey || state.key !== sessionKey || !state[direction].length) return undefined;
    const next = state[direction].pop()!;
    state[direction === 'past' ? 'future' : 'past'].push(state.current);
    state.current = next;
    refresh((value) => value + 1);
    return next;
  }

  return {
    canUndo: sessionKey !== null && history.current.key === sessionKey && history.current.past.length > 0,
    canRedo: sessionKey !== null && history.current.key === sessionKey && history.current.future.length > 0,
    undo: () => travel('past'),
    redo: () => travel('future'),
  };
}
