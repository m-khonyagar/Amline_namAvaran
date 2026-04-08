import type { ChannelAdapter, NormalizedInboundMessage } from '../types.js';

/** اسکلت آداپتور — فیلدهای واقعی را با Bot API تلگرام هم‌تراز کنید. */
export const telegramAdapterStub: ChannelAdapter = {
  id: 'telegram',
  canHandle(headers, _body) {
    const secret = headers['x-telegram-bot-api-secret-token'];
    return typeof secret === 'string' && secret.length > 0;
  },
  normalize(body): NormalizedInboundMessage | null {
    const b = body as {
      message?: { chat?: { id: number }; text?: string; from?: { id: number } };
    };
    const msg = b.message;
    if (!msg?.from) return null;
    const text = msg.text ?? '';
    const cmd = text.startsWith('/') ? text.split(/\s/)[0]?.slice(1) : undefined;
    return {
      channel: 'telegram',
      surface: 'end_user',
      externalUserId: String(msg.from.id),
      externalChatId: msg.chat ? String(msg.chat.id) : undefined,
      text: msg.text,
      command: cmd,
      raw: b as Record<string, unknown>,
    };
  },
};
