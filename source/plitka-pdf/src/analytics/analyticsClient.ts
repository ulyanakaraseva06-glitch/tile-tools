export type AnalyticsProperties = Record<string, string | number | boolean | null>;

export type AnalyticsEvent = {
  eventId: string;
  eventName: string;
  timestamp: string;
  anonymousId: string;
  sessionId: string;
  projectId?: string;
  documentId?: string;
  properties: AnalyticsProperties;
};

const ANONYMOUS_ID_KEY = 'analytics_anonymous_id';
const SESSION_ID_KEY = 'analytics_session_id';
const SESSION_LAST_SEEN_KEY = 'analytics_session_last_seen';
const EVENT_QUEUE_KEY = 'analytics_event_queue';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 15_000;
const MAX_QUEUE_SIZE = 250;
const MAX_STRING_LENGTH = 180;
const BATCH_ENDPOINT = '/api/analytics/batch.php';
const BLOCKED_PROPERTY_FRAGMENTS = ['text', 'value', 'html', 'src', 'base64', 'dataurl', 'email', 'phone', 'name'];
const BLOCKED_PROPERTY_KEYS = ['image', 'imagefile', 'file', 'company', 'manager'];

let flushTimer: number | undefined;
let flushing = false;
let analyticsInitialized = false;

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function createId(prefix: string) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
}

function readStorage(key: string) {
  if (!canUseBrowserStorage()) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (!canUseBrowserStorage()) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Analytics must never break the product UI.
  }
}

function getAnonymousId() {
  const current = readStorage(ANONYMOUS_ID_KEY);
  if (current) return current;
  const next = createId('anon');
  writeStorage(ANONYMOUS_ID_KEY, next);
  return next;
}

function readQueue(): AnalyticsEvent[] {
  const raw = readStorage(EVENT_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE_SIZE) as AnalyticsEvent[] : [];
  } catch {
    return [];
  }
}

function writeQueue(events: AnalyticsEvent[]) {
  writeStorage(EVENT_QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE_SIZE)));
}

function sanitizeValue(key: string, value: unknown): string | number | boolean | null | undefined {
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;

  const normalizedKey = key.toLowerCase();
  if (
    BLOCKED_PROPERTY_KEYS.includes(normalizedKey) ||
    BLOCKED_PROPERTY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment)) ||
    value.startsWith('data:')
  ) {
    return undefined;
  }

  return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;
}

function sanitizeProperties(properties?: Record<string, unknown>): AnalyticsProperties {
  if (!properties) return {};
  return Object.fromEntries(
    Object.entries(properties)
      .map(([key, value]) => [key, sanitizeValue(key, value)] as const)
      .filter((entry): entry is readonly [string, string | number | boolean | null] => entry[1] !== undefined)
  );
}

export function startSession() {
  const now = Date.now();
  const lastSeen = Number(readStorage(SESSION_LAST_SEEN_KEY) ?? 0);
  const currentSession = readStorage(SESSION_ID_KEY);

  if (currentSession && now - lastSeen < SESSION_TIMEOUT_MS) {
    writeStorage(SESSION_LAST_SEEN_KEY, String(now));
    return currentSession;
  }

  const nextSession = createId('sess');
  writeStorage(SESSION_ID_KEY, nextSession);
  writeStorage(SESSION_LAST_SEEN_KEY, String(now));
  return nextSession;
}

function createEvent(eventName: string, properties?: Record<string, unknown>): AnalyticsEvent {
  return {
    eventId: createId('evt'),
    eventName,
    timestamp: new Date().toISOString(),
    anonymousId: getAnonymousId(),
    sessionId: startSession(),
    projectId: typeof properties?.projectId === 'string' ? properties.projectId : undefined,
    documentId: typeof properties?.documentId === 'string' ? properties.documentId : undefined,
    properties: sanitizeProperties(properties)
  };
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    keepalive: true
  });
  if (!response.ok) throw new Error(`Analytics request failed: ${response.status}`);
}

export async function flush(): Promise<void> {
  if (flushing) return;
  const queuedEvents = readQueue();
  if (!queuedEvents.length) return;

  flushing = true;
  try {
    await postJson(BATCH_ENDPOINT, { events: queuedEvents });
    const sentIds = new Set(queuedEvents.map((event) => event.eventId));
    writeQueue(readQueue().filter((event) => !sentIds.has(event.eventId)));
  } finally {
    flushing = false;
  }
}

function scheduleFlush() {
  if (typeof window === 'undefined' || flushTimer) return;
  flushTimer = window.setInterval(() => {
    void flush().catch(() => {
      // Keep the queue for the next attempt.
    });
  }, FLUSH_INTERVAL_MS);
}

export function track(eventName: string, properties?: Record<string, unknown>): void {
  try {
    const event = createEvent(eventName, properties);
    const nextQueue = [...readQueue(), event].slice(-MAX_QUEUE_SIZE);
    writeQueue(nextQueue);
    scheduleFlush();

    if (event.eventName === 'pdf_export_success' || nextQueue.length >= BATCH_SIZE) {
      void flush().catch(() => {
        // Keep the queue for the next attempt.
      });
    }
  } catch {
    // Analytics must never block editing, saving, or PDF export.
  }
}

function flushWithBeacon() {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
  const events = readQueue();
  if (!events.length) return true;
  const ok = navigator.sendBeacon(
    BATCH_ENDPOINT,
    new Blob([JSON.stringify({ events })], { type: 'application/json' })
  );
  if (ok) writeQueue([]);
  return ok;
}

function handleBeforeUnload() {
  if (!flushWithBeacon()) {
    void flush().catch(() => {
      // Keep the queue for the next attempt.
    });
  }
}

export function initAnalytics() {
  if (typeof window === 'undefined') return;
  startSession();
  scheduleFlush();
  void flush().catch(() => {
    // Keep the queue for the next attempt.
  });

  if (analyticsInitialized) return;
  analyticsInitialized = true;
  window.addEventListener('beforeunload', handleBeforeUnload);
}

export function pageContextProperties() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    path: window.location.pathname,
    referrer: document.referrer || null,
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign')
  };
}
