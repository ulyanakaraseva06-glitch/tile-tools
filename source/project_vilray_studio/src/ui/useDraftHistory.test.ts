import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useDraftHistory } from './useDraftHistory';

function setup<T>(initial: T, key = 'room:primary') {
  return renderHook(() => {
    const [snapshot, setSnapshot] = useState(initial);
    const [session, setSession] = useState<string | null>(key);
    const history = useDraftHistory(session, snapshot);
    return { snapshot, setSnapshot, setSession, ...history,
      back: () => { const next = history.undo(); if (next !== undefined) setSnapshot(next); },
      forward: () => { const next = history.redo(); if (next !== undefined) setSnapshot(next); },
    };
  });
}

describe('draft undo and redo', () => {
  it('starts an additional-room editor at its template and undoes only draft edits', () => {
    const { result } = setup<{ width: number } | null>(null);
    act(() => result.current.setSession(null));
    act(() => {
      result.current.setSnapshot({ width: 3000 });
      result.current.setSession('additional-room');
    });
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.setSnapshot({ width: 4000 }));
    act(() => result.current.back());
    expect(result.current.snapshot).toEqual({ width: 3000 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.forward());
    expect(result.current.snapshot).toEqual({ width: 4000 });
    act(() => { result.current.setSession(null); result.current.setSnapshot(null); });
    expect(result.current.canRedo).toBe(false);
  });

  it('restores the first room point, walls and the review phase in both directions', () => {
    const empty = { points: [] as number[], start: null as number | null, mode: 'drawing' };
    const { result } = setup(empty);
    const snapshots = [
      { points: [], start: 1, mode: 'drawing' },
      { points: [1, 2], start: null, mode: 'drawing' },
      { points: [1, 2, 3, 4], start: null, mode: 'review' },
    ];
    for (const snapshot of snapshots) act(() => result.current.setSnapshot(snapshot));
    for (const expected of [snapshots[1], snapshots[0], empty]) {
      act(() => result.current.back());
      expect(result.current.snapshot).toEqual(expected);
    }
    expect(result.current.canUndo).toBe(false);
    for (const expected of snapshots) {
      act(() => result.current.forward());
      expect(result.current.snapshot).toEqual(expected);
    }
    expect(result.current.canRedo).toBe(false);
  });

  it.each(['surface-floor', 'surface-wall-1'])('restores every zone point on %s and discards redo after a new point', (surface) => {
    const { result } = setup<number[]>([], surface);
    for (const points of [[1], [1, 2], [1, 2, 3], [1, 2, 3, 4]]) act(() => result.current.setSnapshot(points));
    act(() => result.current.back());
    expect(result.current.snapshot).toEqual([1, 2, 3]);
    act(() => result.current.forward());
    expect(result.current.snapshot).toEqual([1, 2, 3, 4]);
    act(() => result.current.back());
    act(() => result.current.setSnapshot([1, 2, 3, 5]));
    expect(result.current.canRedo).toBe(false);
  });

  it('clears draft history on save/cancel and starts a new session empty', () => {
    const { result } = setup<number[]>([]);
    act(() => result.current.setSnapshot([1, 2]));
    act(() => { result.current.setSession(null); result.current.setSnapshot([]); });
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.setSession('room:primary'));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('ignores unchanged geometry and retains more than ten drawing steps', () => {
    const { result } = setup<number[]>([]);
    for (let i = 1; i <= 20; i++) act(() => result.current.setSnapshot([i]));
    act(() => result.current.setSnapshot([20]));
    for (let i = 19; i >= 0; i--) {
      act(() => result.current.back());
      expect(result.current.snapshot).toEqual(i ? [i] : []);
    }
    expect(result.current.canUndo).toBe(false);
  });
});
