/** انواع ملک و محله‌های نمونه — هم‌راستا با فیگما (پنل ملک). */

export const PROPERTY_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'apt_res', label: 'آپارتمان- مسکونی' },
  { id: 'apt_off', label: 'آپارتمان - اداری' },
  { id: 'apt_com', label: 'آپارتمان - تجاری' },
  { id: 'vil_res', label: 'ویلایی - مسکونی' },
  { id: 'vil_off', label: 'ویلایی - اداری' },
  { id: 'vil_com', label: 'ویلایی - تجاری' },
  { id: 'land_res', label: 'زمین - مسکونی' },
  { id: 'land_off', label: 'زمین - اداری' },
  { id: 'land_com', label: 'زمین - تجاری' },
  { id: 'land_farm', label: 'زمین - زراعی' },
  { id: 'land_garden', label: 'زمین - باغ و باغچه' },
  { id: 'shop_com', label: 'مغازه - تجاری' },
  { id: 'stall_com', label: 'غرفه - تجاری' },
  { id: 'warehouse_com', label: 'انبار - تجاری' },
  { id: 'hall_com', label: 'سالن - تجاری' },
  { id: 'shed_com', label: 'سوله - تجاری' },
  { id: 'workshop_ind', label: 'کارگاه - صنعتی' },
  { id: 'warehouse_ind', label: 'انبار - صنعتی' },
  { id: 'fish_ind', label: 'پرورش ماهی - صنعتی' },
  { id: 'greenhouse_ind', label: 'گلخانه - صنعتی' },
  { id: 'hall_ind', label: 'سالن - صنعتی' },
  { id: 'shed_ind', label: 'سوله - صنعتی' },
  { id: 'dairy_ind', label: 'دامداری - صنعتی' },
  { id: 'ranch_ind', label: 'دامپروری - صنعتی' },
  { id: 'factory_ind', label: 'کارخانه - صنعتی' },
  { id: 'chicken_ind', label: 'مرغداری - صنعتی' },
  { id: 'sport', label: 'ورزشی' },
  { id: 'health', label: 'بهداشتی' },
  { id: 'public_svc', label: 'خدمات عمومی' },
  { id: 'parking', label: 'پارکینگ' },
  { id: 'other', label: 'سایر' },
]

export interface CityOption {
  id: string
  label: string
  neighborhoods: { id: string; label: string }[]
}

export const CITY_OPTIONS: CityOption[] = [
  {
    id: 'qom',
    label: 'قم',
    neighborhoods: [
      { id: 'qom_center', label: 'قم - قم' },
      { id: 'qanavat', label: 'قم - قنوات' },
      { id: 'jafarie', label: 'قم - جعفریه' },
      { id: 'kahak', label: 'قم - کهک' },
      { id: 'dastjerd', label: 'قم - دستجرد' },
      { id: 'salafchegan', label: 'قم - سلفچگان' },
      { id: 'azar', label: 'آذر' },
      { id: 'azadegan', label: 'آزادگان' },
      { id: 'emam', label: 'امام' },
      { id: 'emamzade', label: 'امامزاده ابراهیم' },
      { id: 'ensajam', label: 'انسجام' },
      { id: 'ansar', label: 'انصار الحسین' },
      { id: 'enghelab', label: 'انقلاب (چهارمردان)' },
      { id: 'pardin', label: 'پردیسان' },
      { id: 'harim', label: 'حرم' },
      { id: 'shahrak_quds', label: 'شهرک قدس' },
    ],
  },
  {
    id: 'tehran',
    label: 'تهران',
    neighborhoods: [
      { id: 'teh_1', label: 'تهران - مرکز' },
      { id: 'teh_2', label: 'تهران - ونک' },
      { id: 'teh_3', label: 'تهران - تجریش' },
    ],
  },
]

export type NeedKind = 'buy' | 'rent' | 'barter'

export const QUEUE_MESSAGE =
  'نیازمندی شما با موفقیت ثبت شد. زمان انتظار در صف حداکثر ۲ ساعت می‌باشد.'
