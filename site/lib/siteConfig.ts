/** آدرس‌ها و لینک بازوها — از env قابل تنظیم برای production */
export const siteConfig = {
  appUrl: process.env.NEXT_PUBLIC_AMLINE_APP_URL ?? 'https://app.amline.ir',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://amline.ir',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info@amline.ir',
  /** کانال رسمی در بله (محتوای آموزشی) */
  baleChannelUrl: process.env.NEXT_PUBLIC_BALE_CHANNEL_URL ?? 'https://ble.ir/amlinebime',
  supportPhoneDisplay: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '۰۲۵۳۲۰۴۸۰۰۰',
  /** برای لینک tel: */
  supportPhoneTel: (process.env.NEXT_PUBLIC_SUPPORT_PHONE_TEL ?? '02532048000').replace(/\s/g, ''),
  /** نام کاربری بازو بدون @ — مثلاً amline_bot */
  bots: {
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '',
    bale: process.env.NEXT_PUBLIC_BALE_BOT_USERNAME ?? '',
    eitaa: process.env.NEXT_PUBLIC_EITAA_BOT_USERNAME ?? '',
  },
  miniappPath: '/miniapp',
};

export function telegramBotUrl(username: string) {
  if (!username) return '#';
  const u = username.replace(/^@/, '');
  return `https://t.me/${u}`;
}

export function baleBotUrl(username: string) {
  if (!username) return '#';
  const u = username.replace(/^@/, '');
  return `https://ble.ir/${u}`;
}

/** لینک عمیق ایتا بسته به کانفیگ پنل ایتایار متفاوت است؛ معمولاً ble.ir یا لینک اختصاصی */
export function eitaaBotUrl(username: string) {
  if (!username) return '#';
  const u = username.replace(/^@/, '');
  return `https://eitaa.com/${u}`;
}
