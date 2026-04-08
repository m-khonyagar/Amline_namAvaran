/** شناسه کانال‌های پشتیبانی‌شده در دروازهٔ یکپارچه */
export type ChannelId = 'telegram' | 'bale' | 'eitaa' | 'rubika' | 'webapp' | 'unknown';

/** نقش سطح محصول (مشابه تفکیک اسنپ) */
export type ProductSurface = 'end_user' | 'consultant' | 'admin_bot';

/** پیام نرمال‌شده پس از پارس هر آداپتور */
export interface NormalizedInboundMessage {
  channel: ChannelId;
  surface: ProductSurface;
  externalUserId: string;
  externalChatId?: string;
  text?: string;
  command?: string;
  payload?: string;
  raw: Record<string, unknown>;
}

export interface ChannelAdapter {
  id: ChannelId;
  /** تشخیص نوع بدنهٔ درخواست HTTP */
  canHandle(headers: Record<string, string>, body: unknown): boolean;
  normalize(body: unknown): NormalizedInboundMessage | null;
}
