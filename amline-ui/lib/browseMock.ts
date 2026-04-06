import type { NeedKind } from './needsConstants'

export interface BrowseItem {
  id: string
  kind: Exclude<NeedKind, 'barter'> | 'barter'
  title: string
  city: string
  neighborhood: string
  priceLabel: string
  excerpt: string
}

export const BROWSE_MOCK: BrowseItem[] = [
  {
    id: '1',
    kind: 'buy',
    title: 'آگهی خرید و فروش آپارتمان',
    city: 'قم',
    neighborhood: 'پردیسان',
    priceLabel: '۱۲ میلیارد تومان',
    excerpt: 'آپارتمان ۹۰ متری، نوساز، نزدیک بلوار.',
  },
  {
    id: '2',
    kind: 'rent',
    title: 'آگهی رهن و اجاره آپارتمان',
    city: 'قم',
    neighborhood: 'قنوات',
    priceLabel: 'رهن ۵۰۰ / اجاره ۸ میلیون',
    excerpt: 'دو خواب، پارکینگ و انباری.',
  },
  {
    id: '3',
    kind: 'barter',
    title: 'معاوضه ملک با آپارتمان',
    city: 'تهران',
    neighborhood: 'ونک',
    priceLabel: 'توافقی',
    excerpt: 'زمین تجاری به‌ازای آپارتمان در قم.',
  },
  {
    id: '4',
    kind: 'buy',
    title: 'خرید ویلایی مسکونی',
    city: 'قم',
    neighborhood: 'جعفریه',
    priceLabel: '۸ میلیارد تومان',
    excerpt: 'بنای ۲۵۰ متر، حیاط اختصاصی.',
  },
  {
    id: '5',
    kind: 'rent',
    title: 'اجاره مغازه تجاری',
    city: 'قم',
    neighborhood: 'مرکز',
    priceLabel: 'اجاره ۱۵ میلیون',
    excerpt: 'بر اصلی، مناسب خرده‌فروشی.',
  },
  {
    id: '6',
    kind: 'barter',
    title: 'معاوضه آپارتمان با مغازه',
    city: 'قم',
    neighborhood: 'سلفچگان',
    priceLabel: 'هم‌ارزش',
    excerpt: 'آپارتمان ۱۱۰ متری با مغازه ۴۰ متری.',
  },
]
