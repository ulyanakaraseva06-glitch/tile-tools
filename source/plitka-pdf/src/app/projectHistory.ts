const HISTORY_LIMIT = 30;

export type HistoryState<T> = {
  past: T[];
  future: T[];
};

export type HistoryStepResult<T> = {
  history: HistoryState<T>;
  snapshot: T;
};

export function createEmptyHistory<T>(): HistoryState<T> {
  return {
    past: [],
    future: []
  };
}

function pushPastSnapshot<T>(past: T[], snapshot: T): T[] {
  return [...past.slice(-(HISTORY_LIMIT - 1)), snapshot];
}

export function recordHistorySnapshot<T>(history: HistoryState<T>, current: T): HistoryState<T> {
  return {
    past: pushPastSnapshot(history.past, current),
    future: []
  };
}

export function undoHistory<T>(history: HistoryState<T>, current: T): HistoryStepResult<T> | null {
  if (!history.past.length) return null;

  const snapshot = history.past[history.past.length - 1];
  return {
    snapshot,
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future].slice(0, HISTORY_LIMIT)
    }
  };
}

export function redoHistory<T>(history: HistoryState<T>, current: T): HistoryStepResult<T> | null {
  if (!history.future.length) return null;

  const snapshot = history.future[0];
  return {
    snapshot,
    history: {
      past: pushPastSnapshot(history.past, current),
      future: history.future.slice(1)
    }
  };
}
