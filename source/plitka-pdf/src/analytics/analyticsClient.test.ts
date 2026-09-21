import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, initAnalytics, track } from './analyticsClient';

const EVENT_QUEUE_KEY = 'analytics_event_queue';

describe('analyticsClient', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', {
      sendBeacon: vi.fn(() => true)
    });
  });

  it('stores only sanitized analytics properties in the session queue', () => {
    track('page_opened', {
      projectId: 'project_1',
      documentId: 'doc_1',
      safeLabel: 'Visible value',
      email: 'hidden@example.com',
      managerName: 'Hidden manager',
      image: 'binary',
      dataUrl: 'data:image/png;base64,AAAA'
    });

    const queue = JSON.parse(sessionStorage.getItem(EVENT_QUEUE_KEY) ?? '[]');
    expect(queue).toHaveLength(1);
    expect(queue[0].projectId).toBe('project_1');
    expect(queue[0].documentId).toBe('doc_1');
    expect(queue[0].properties).toEqual({
      projectId: 'project_1',
      documentId: 'doc_1',
      safeLabel: 'Visible value'
    });
  });

  it('registers beforeunload listener only once across repeated init calls', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    initAnalytics();
    initAnalytics();

    expect(
      addEventListenerSpy.mock.calls.filter(([eventName]) => eventName === 'beforeunload')
    ).toHaveLength(1);
  });

  it('flushes queued events and keeps the queue empty after a successful request', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    track('page_opened', { safeLabel: 'Visible value' });

    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem(EVENT_QUEUE_KEY) ?? '[]')).toEqual([]);
  });
});
