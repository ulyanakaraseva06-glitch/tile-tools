import { describe, expect, it } from 'vitest';
import { createEmptyHistory, recordHistorySnapshot, redoHistory, undoHistory } from './projectHistory';

describe('projectHistory', () => {
  it('records the current snapshot without clearing object identity', () => {
    const current = { id: 'project_1' };
    const history = recordHistorySnapshot(createEmptyHistory<typeof current>(), current);

    expect(history.past).toHaveLength(1);
    expect(history.past[0]).toBe(current);
    expect(history.future).toEqual([]);
  });

  it('undo moves the current snapshot into future and returns the previous one', () => {
    const first = { id: 'project_1' };
    const second = { id: 'project_2' };
    const history = recordHistorySnapshot(createEmptyHistory<typeof first>(), first);

    const result = undoHistory(history, second);

    expect(result?.snapshot).toBe(first);
    expect(result?.history.past).toEqual([]);
    expect(result?.history.future[0]).toBe(second);
  });

  it('redo restores the next snapshot and puts current back into past', () => {
    const first = { id: 'project_1' };
    const second = { id: 'project_2' };

    const result = redoHistory({
      past: [first],
      future: [second]
    }, first);

    expect(result?.snapshot).toBe(second);
    expect(result?.history.past[result.history.past.length - 1]).toBe(first);
    expect(result?.history.future).toEqual([]);
  });
});
