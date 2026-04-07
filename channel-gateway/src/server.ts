/**
 * سرور HTTP برای وب‌هوک کانال‌ها — نسخهٔ قابل‌استقرار.
 * متغیرها: CHANNEL_GATEWAY_PORT (پیش‌فرض ۳۰۹۰)، AMLINE_PUBLIC_URL (برای handoff)
 */
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { buildChannelHandoffPreview } from './handoff.js';
import { telegramAdapterStub } from './adapters/telegramStub.js';

const PORT = Number(process.env.CHANNEL_GATEWAY_PORT ?? 3090);
const PUBLIC_BASE = (process.env.AMLINE_PUBLIC_URL ?? 'https://app.amline.ir').replace(/\/$/, '');

function json(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createChannelGatewayServer(): http.Server {
  return http.createServer(async (req, res) => {
    const url = req.url ? new URL(req.url, `http://${req.headers.host ?? 'localhost'}`) : null;
    const path = url?.pathname ?? '/';

    if (req.method === 'GET' && path === '/health') {
      json(res, 200, { ok: true, service: 'channel-gateway', version: '0.2.0' });
      return;
    }

    if (req.method === 'POST' && path === '/webhooks/telegram') {
      const raw = await readBody(req);
      let body: unknown = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        json(res, 400, { ok: false, error: 'invalid_json' });
        return;
      }
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue;
        headers[k.toLowerCase()] = Array.isArray(v) ? v[0]! : v;
      }
      if (!telegramAdapterStub.canHandle(headers, body)) {
        json(res, 401, { ok: false, error: 'unauthorized_or_unknown' });
        return;
      }
      const norm = telegramAdapterStub.normalize(body);
      const handoff =
        norm && norm.surface === 'end_user'
          ? buildChannelHandoffPreview({
              baseUrl: PUBLIC_BASE,
              channel: 'telegram',
              externalUserId: norm.externalUserId,
              nextPath: '/browse',
            })
          : null;
      json(res, 200, {
        ok: true,
        normalized: norm,
        handoff_url: handoff,
      });
      return;
    }

    if (req.method === 'POST' && path === '/webhooks/bale') {
      const raw = await readBody(req);
      json(res, 200, {
        ok: true,
        channel: 'bale',
        received_bytes: raw.length,
        note: 'آداپتور اختصاصی بله را به همین مسیر وصل کنید.',
      });
      return;
    }

    if (req.method === 'POST' && path === '/webhooks/eitaa') {
      const raw = await readBody(req);
      json(res, 200, {
        ok: true,
        channel: 'eitaa',
        received_bytes: raw.length,
        note: 'آداپتور اختصاصی ایتا را به همین مسیر وصل کنید.',
      });
      return;
    }

    json(res, 404, { ok: false, error: 'not_found' });
  });
}

export function startChannelGatewayServer(): void {
  const srv = createChannelGatewayServer();
  srv.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[channel-gateway] listening on http://0.0.0.0:${PORT}`);
  });
}

const _self = path.resolve(fileURLToPath(import.meta.url));
const _entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (_entry === _self) {
  startChannelGatewayServer();
}
