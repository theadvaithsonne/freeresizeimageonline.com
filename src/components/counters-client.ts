/**
 * Talks to the counter Worker over one anonymous WebSocket. Sends only a number (how many images were
 * resized in a batch) - never file names, images or anything identifying.
 */
import { formatNumber } from '../i18n/format';

interface Config {
  endpoint: string;
  lang: string;
  minTotal: number;
  minOnline: number;
  resized: string;
  online: string;
}

const MAX_ATTEMPTS = 8;

export function initCounters(): void {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-counters]'));
  if (roots.length === 0) return;
  const cfg = JSON.parse(roots[0]!.querySelector('[data-counters-config]')!.textContent || '{}') as Config;
  if (!cfg.endpoint) return;

  let ws: WebSocket | null = null;
  let attempts = 0;
  let reconnectTimer: number | undefined;
  let pingTimer: number | undefined;
  let hiddenTimer: number | undefined;
  let stopped = false;
  let shownTotal = 0;

  // The number is isolated so that it keeps its order inside right-to-left sentences (Arabic, Urdu).
  const fill = (template: string, n: number) =>
    template.replace('{count}', String.fromCharCode(0x2066) + formatNumber(cfg.lang, n, 0) + String.fromCharCode(0x2069));

  /** Writes "text before" + number + "text after" into a pill, and the whole sentence as its tooltip. */
  function setPill(pill: HTMLElement, selector: string, template: string, n: number) {
    const box = pill.querySelector<HTMLElement>(selector)!;
    const [pre = '', post = ''] = template.split('{count}');
    box.querySelector('[data-pre]')!.textContent = pre;
    box.querySelector('[data-num]')!.textContent = String.fromCharCode(0x2066) + formatNumber(cfg.lang, n, 0) + String.fromCharCode(0x2069);
    box.querySelector('[data-post]')!.textContent = post;
    pill.title = fill(template, n);
  }

  function render(total: number, online: number) {
    for (const root of roots) {
      const totalPill = root.querySelector<HTMLElement>('[data-counter-total]')!;
      const onlinePill = root.querySelector<HTMLElement>('[data-counter-online]')!;
      totalPill.hidden = total < cfg.minTotal;
      onlinePill.hidden = online < cfg.minOnline;
      if (!totalPill.hidden) setPill(totalPill, '[data-counter-total-text]', cfg.resized, total);
      if (!onlinePill.hidden) setPill(onlinePill, '[data-counter-online-text]', cfg.online, online);
    }
  }

  function hideAll() {
    for (const root of roots) {
      root.querySelector<HTMLElement>('[data-counter-total]')!.hidden = true;
      root.querySelector<HTMLElement>('[data-counter-online]')!.hidden = true;
    }
  }

  /** Small count-up so a jump from 1,200 to 1,245 doesn't just blink. */
  function animateTo(total: number, online: number) {
    const from = shownTotal || total;
    shownTotal = total;
    if (from === total || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(total, online);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 600);
      render(Math.round(from + (total - from) * p), online);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function clearTimers() {
    window.clearTimeout(reconnectTimer);
    window.clearInterval(pingTimer);
  }

  function connect() {
    if (stopped || ws || document.visibilityState === 'hidden') return;
    try {
      ws = new WebSocket(cfg.endpoint);
    } catch {
      return;
    }
    const socket = ws;
    socket.onopen = () => {
      attempts = 0;
      window.clearInterval(pingTimer);
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send('ping');
      }, 45_000);
    };
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string' || event.data === 'pong') return;
      try {
        const msg = JSON.parse(event.data) as { type?: string; total?: number; online?: number };
        if (msg.type === 'stats' && Number.isFinite(msg.total) && Number.isFinite(msg.online)) {
          animateTo(msg.total!, msg.online!);
        }
      } catch {
        /* ignore malformed messages */
      }
    };
    socket.onclose = () => {
      ws = null;
      window.clearInterval(pingTimer);
      hideAll(); // never show stale numbers
      if (stopped || document.visibilityState === 'hidden') return;
      if (attempts >= MAX_ATTEMPTS) return;
      const delay = Math.min(60_000, 2_000 * 2 ** attempts++);
      reconnectTimer = window.setTimeout(connect, delay);
    };
    socket.onerror = () => socket.close();
  }

  function disconnect() {
    clearTimers();
    const socket = ws;
    ws = null;
    socket?.close(1000);
  }

  // Close the connection when the tab has been in the background for a minute; reopen on return.
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(hiddenTimer);
    if (document.visibilityState === 'hidden') {
      hiddenTimer = window.setTimeout(disconnect, 60_000);
    } else if (!ws) {
      attempts = 0;
      connect();
    }
  });

  window.addEventListener('frio:resized', (event) => {
    const n = Math.floor((event as CustomEvent<{ count: number }>).detail?.count ?? 0);
    if (n >= 1 && ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'resized', n }));
  });

  window.addEventListener('pagehide', () => {
    stopped = true;
    disconnect();
  });
  // Coming back through the browser's back/forward cache: the page is alive again, so reconnect.
  window.addEventListener('pageshow', (event) => {
    if (!(event as PageTransitionEvent).persisted) return;
    stopped = false;
    attempts = 0;
    connect();
  });

  connect();
}
