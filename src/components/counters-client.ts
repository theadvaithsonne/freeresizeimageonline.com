/**
 * Fills the two live stats ("images resized", "online now") with real numbers from the counter Worker. Sends only a number
 * (how many images were resized in a batch) - never file names, images or anything identifying.
 *
 * Two roads to the numbers, so they show up fast and stay current:
 *  1. a plain HTTPS read of /stats (answered from the edge cache, usually within a few hundred milliseconds - the request is
 *     even started from the page head, before this script runs): gives the "images resized" total at once;
 *  2. one anonymous WebSocket, which takes a little longer to open: gives "online now" (this visitor included) and every later
 *     change, live.
 * The stats are in the page from the first paint in a "loading" state ("…"). A stat is dropped only when its number really
 * cannot be read (three failed tries in a row), and comes back by itself if it can be read later.
 */
import { formatNumber } from '../i18n/format';

interface Config {
  endpoint: string;
  statsUrl: string;
  lang: string;
  minTotal: number;
  minOnline: number;
  resized: string;
  online: string;
}
type StatsAnswer = { total?: unknown; online?: unknown };
type State = 'loading' | 'ready' | 'off';
interface Stat {
  value: number | null;
  state: State;
}

const RETRY_MS = 4_000; // a failed read is tried again after this long
const MAX_FAILS = 3; // this many failed tries in a row, with no number at all yet: the stat is dropped
const PING_MS = 45_000; // keeps the connection alive
const OPEN_TIMEOUT_MS = 10_000; // a connection that has not opened by then is abandoned and tried again
const STALE_MS = 10_000; // the live connection is gone this long: "online now" goes back to "…" instead of showing an old number
const MAX_ATTEMPTS = 8; // reconnect tries before giving up until the visitor comes back to the tab
const LRI = String.fromCharCode(0x2066); // isolates the number so that it keeps its place inside right-to-left sentences
const PDI = String.fromCharCode(0x2069);

declare global {
  interface Window {
    /** Started by a tiny script in the page head (Layout.astro) so the request is already under way when this script runs. */
    __frioStats?: Promise<StatsAnswer>;
  }
}

export function initCounters(): void {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-counters]'));
  if (roots.length === 0) return;
  const cfg = JSON.parse(roots[0]!.querySelector('[data-counters-config]')?.textContent || '{}') as Config;
  if (!cfg.endpoint) return;

  const total: Stat = { value: null, state: 'loading' };
  const online: Stat = { value: null, state: 'loading' };
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fill = (template: string, n: number) => template.replace('{count}', LRI + formatNumber(cfg.lang, n, 0) + PDI);

  /** Shows one stat in every place it appears (header, phone bar). */
  function paint(kind: 'total' | 'online', shown?: number) {
    const stat = kind === 'total' ? total : online;
    const template = kind === 'total' ? cfg.resized : cfg.online;
    const n = shown ?? stat.value;
    for (const root of roots) {
      const el = root.querySelector<HTMLElement>(kind === 'total' ? '[data-counter-total]' : '[data-counter-online]');
      if (!el) continue;
      el.dataset.state = stat.state;
      const num = el.querySelector<HTMLElement>('[data-num]')!;
      if (stat.state === 'ready' && n !== null) {
        const text = LRI + formatNumber(cfg.lang, n, 0) + PDI;
        if (num.textContent !== text) num.textContent = text;
        el.title = fill(template, n);
        el.removeAttribute('aria-hidden');
      } else {
        num.textContent = '…';
        el.removeAttribute('title');
        el.setAttribute('aria-hidden', 'true'); // a placeholder says nothing to a screen reader
      }
    }
    // the phone bar gives its space back only when nothing at all is left to show
    for (const root of roots) root.toggleAttribute('data-off', total.state === 'off' && online.state === 'off');
  }

  let countUp = 0;
  /** The total never goes down (it only counts up), and a rise counts up on screen instead of just blinking. */
  function setTotal(raw: unknown) {
    const n = Math.floor(Number(raw));
    if (raw === null || raw === undefined || !Number.isFinite(n) || n < 0) return;
    const next = Math.max(total.value ?? 0, n);
    const from = total.value;
    total.value = next;
    total.state = next < cfg.minTotal ? 'off' : 'ready';
    window.cancelAnimationFrame(countUp);
    if (from === null || from === next || total.state !== 'ready' || reduceMotion() || document.visibilityState === 'hidden') {
      paint('total');
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 600);
      paint('total', Math.round(from + (next - from) * p));
      if (p < 1) countUp = window.requestAnimationFrame(step);
    };
    countUp = window.requestAnimationFrame(step);
  }

  function setOnline(raw: unknown) {
    const n = Math.floor(Number(raw));
    if (raw === null || raw === undefined || !Number.isFinite(n) || n < 0) return;
    online.value = n;
    online.state = n < cfg.minOnline ? 'off' : 'ready';
    paint('online');
  }

  // ---------------------------------------------------------------- road 1: a plain read of /stats
  let statsFails = 0;
  let statsTimer: number | undefined;

  async function fetchStats(): Promise<StatsAnswer> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(cfg.statsUrl, { credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as StatsAnswer;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function readStats(first: boolean) {
    window.clearTimeout(statsTimer);
    if (!cfg.statsUrl) return;
    try {
      const answer = await (first && window.__frioStats ? window.__frioStats : fetchStats());
      statsFails = 0;
      setTotal(answer?.total);
    } catch {
      if (++statsFails < MAX_FAILS) {
        statsTimer = window.setTimeout(() => void readStats(false), RETRY_MS);
      } else if (total.value === null && total.state === 'loading') {
        total.state = 'off'; // it really cannot be read: drop the stat (it comes back if the live connection delivers it)
        paint('total');
      }
    }
  }

  // ---------------------------------------------------------------- road 2: the live connection
  let ws: WebSocket | null = null;
  let attempts = 0;
  let socketFails = 0;
  let reconnectTimer: number | undefined;
  let pingTimer: number | undefined;
  let hiddenTimer: number | undefined;
  let staleTimer: number | undefined;
  let stopped = false;

  /** The last "online now" number is kept for a moment (a quick reconnect is common), then replaced by "…"; if the connection stays away, the stat is dropped. */
  function staleCheck() {
    staleTimer = undefined;
    if (ws && ws.readyState === WebSocket.OPEN) return;
    online.state = socketFails >= MAX_FAILS ? 'off' : 'loading';
    paint('online');
  }

  /** "online now" cannot be known without the live connection. */
  function connectionLost() {
    socketFails++;
    if (online.state === 'ready') {
      // counted from the first loss: a failed reconnect does not give the old number more time
      if (staleTimer === undefined) staleTimer = window.setTimeout(staleCheck, STALE_MS);
    } else if (socketFails >= MAX_FAILS) {
      online.state = 'off';
      paint('online');
    }
  }

  function connect() {
    if (stopped || ws || document.visibilityState === 'hidden') return;
    let socket: WebSocket;
    try {
      socket = new WebSocket(cfg.endpoint);
    } catch {
      connectionLost();
      return;
    }
    ws = socket;
    const openTimeout = window.setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) socket.close();
    }, OPEN_TIMEOUT_MS);
    socket.onopen = () => {
      window.clearTimeout(openTimeout);
      attempts = 0;
      window.clearInterval(pingTimer);
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send('ping');
      }, PING_MS);
    };
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string' || event.data === 'pong') return;
      try {
        const msg = JSON.parse(event.data) as { type?: string; total?: unknown; online?: unknown };
        if (msg.type !== 'stats') return;
        socketFails = 0;
        window.clearTimeout(staleTimer);
        staleTimer = undefined;
        setTotal(msg.total);
        setOnline(msg.online);
      } catch {
        /* ignore malformed messages */
      }
    };
    socket.onclose = () => {
      window.clearTimeout(openTimeout);
      if (ws === socket) ws = null;
      window.clearInterval(pingTimer);
      if (stopped || document.visibilityState === 'hidden') return; // closed on purpose: the visitor's return reconnects
      connectionLost();
      if (attempts >= MAX_ATTEMPTS) return;
      const delay = Math.min(60_000, 2_000 * 2 ** attempts++);
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(connect, delay);
    };
    socket.onerror = () => socket.close();
  }

  function disconnect() {
    window.clearTimeout(reconnectTimer);
    window.clearInterval(pingTimer);
    const socket = ws;
    ws = null;
    socket?.close(1000);
  }

  /** Back in front of the visitor after a while away: read the numbers again and reopen the connection. */
  function resume() {
    attempts = 0;
    socketFails = 0;
    statsFails = 0;
    if (online.state === 'ready') {
      online.state = 'loading'; // not known until the new connection answers
      paint('online');
    }
    void readStats(false);
    connect();
  }

  // Close the connection when the tab has been in the background for a minute; reopen on return.
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(hiddenTimer);
    if (document.visibilityState === 'hidden') {
      hiddenTimer = window.setTimeout(disconnect, 60_000);
    } else if (!ws && !stopped) {
      resume();
    }
  });

  window.addEventListener('frio:resized', (event) => {
    const n = Math.floor((event as CustomEvent<{ count: number }>).detail?.count ?? 0);
    if (n >= 1 && ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'resized', n }));
  });

  window.addEventListener('pagehide', () => {
    stopped = true;
    window.clearTimeout(statsTimer);
    window.clearTimeout(staleTimer);
    window.cancelAnimationFrame(countUp);
    disconnect();
  });
  // Coming back through the browser's back/forward cache: the page is alive again, so read and reconnect.
  window.addEventListener('pageshow', (event) => {
    if (!(event as PageTransitionEvent).persisted) return;
    stopped = false;
    resume();
  });

  void readStats(true);
  connect();
}
