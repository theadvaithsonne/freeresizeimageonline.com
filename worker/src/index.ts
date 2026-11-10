/**
 * Live counters: "images resized" (running total) and "online now" (open connections).
 *
 * One Durable Object ("global") holds every WebSocket. It stores ONLY two things: the running total
 * and the number of open connections (a socket counts as one anonymous visitor). No IP addresses,
 * cookies, ids or image data are stored or logged by this code.
 *
 * Designed for Cloudflare's free plan: WebSocket Hibernation (idle sockets cost nothing),
 * auto-answered pings, throttled broadcasts, and a single storage write per resize batch.
 */
import { DurableObject } from 'cloudflare:workers';

export interface Env {
  COUNTER: DurableObjectNamespace<Counter>;
  /** Comma-separated list of allowed Origins, or "*" for local testing. */
  ALLOWED_ORIGINS: string;
}

interface Attachment {
  lastResizeAt: number;
  windowStart: number;
  windowSum: number;
}

const MAX_PER_MESSAGE = 100; // images in one batch message
const MAX_PER_HOUR_PER_CONNECTION = 2000;
const MIN_GAP_MS = 1000; // between resize messages on one connection

function originAllowed(request: Request, env: Env): boolean {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.includes('*')) return true;
  const origin = request.headers.get('Origin');
  return !!origin && allowed.includes(origin);
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  if (origin && (allowed.includes('*') || allowed.includes(origin))) {
    return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
  }
  return {};
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const stub = env.COUNTER.get(env.COUNTER.idFromName('global'));

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      if (!originAllowed(request, env)) return new Response('Forbidden', { status: 403 });
      return stub.fetch(request);
    }

    if (url.pathname === '/stats') {
      const stats = await stub.getStats();
      return Response.json(stats, {
        headers: { ...corsHeaders(request, env), 'Cache-Control': 'public, max-age=15' },
      });
    }

    return new Response('FreeResizeImageOnline counters', { status: 200 });
  },
} satisfies ExportedHandler<Env>;

export class Counter extends DurableObject<Env> {
  private total = 0;
  private broadcastScheduled = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.total = (await ctx.storage.get<number>('total')) ?? 0;
    });
    // Keep-alive pings are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  private online(): number {
    return this.ctx.getWebSockets().filter((ws) => ws.readyState === WebSocket.READY_STATE_OPEN).length;
  }

  getStats() {
    return { online: this.online(), total: this.total };
  }

  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    const attachment: Attachment = { lastResizeAt: 0, windowStart: Date.now(), windowSum: 0 };
    server.serializeAttachment(attachment);
    server.send(JSON.stringify({ type: 'stats', ...this.getStats() }));
    void this.scheduleBroadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string' || message.length > 100) return;
    let data: { t?: string; n?: unknown };
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    if (data.t !== 'resized') return;

    const n = Math.floor(Number(data.n));
    if (!Number.isFinite(n) || n < 1) return;

    const now = Date.now();
    const a = (ws.deserializeAttachment() as Attachment | null) ?? { lastResizeAt: 0, windowStart: now, windowSum: 0 };
    if (now - a.lastResizeAt < MIN_GAP_MS) return;
    if (now - a.windowStart > 3_600_000) {
      a.windowStart = now;
      a.windowSum = 0;
    }
    const allowed = Math.min(n, MAX_PER_MESSAGE, MAX_PER_HOUR_PER_CONNECTION - a.windowSum);
    if (allowed < 1) return;

    a.lastResizeAt = now;
    a.windowSum += allowed;
    ws.serializeAttachment(a);

    this.total += allowed;
    try {
      await this.ctx.storage.put('total', this.total);
    } catch {
      /* storage quota reached: keep counting in memory, the next successful write catches up */
    }
    await this.scheduleBroadcast();
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code, 'bye');
    } catch {
      /* already closed */
    }
    await this.scheduleBroadcast();
  }

  async webSocketError(): Promise<void> {
    await this.scheduleBroadcast();
  }

  /** Coalesce many events into one broadcast; slower when many people are connected (saves requests). */
  private async scheduleBroadcast(): Promise<void> {
    if (this.broadcastScheduled) return;
    this.broadcastScheduled = true;
    const sockets = this.ctx.getWebSockets().length;
    const delay = sockets > 50 ? 20_000 : sockets > 10 ? 8_000 : 2_000;
    await this.ctx.storage.setAlarm(Date.now() + delay);
  }

  async alarm(): Promise<void> {
    this.broadcastScheduled = false;
    const payload = JSON.stringify({ type: 'stats', ...this.getStats() });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* socket closed */
      }
    }
  }
}
