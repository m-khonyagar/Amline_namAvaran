# سند نیازمندی‌ها — Contract Wizard (Amline)

## مقدمه

Contract Wizard یک ویزارد گام‌به‌گام برای ثبت قراردادهای رهن و اجاره در پلتفرم Amline است.
این ویزارد باید برای دو نوع کاربر (مشاور املاک در admin-ui و کاربر عادی در amline-ui) کار کند،
کاملاً از `next_step` بازگشتی API پیروی کند، و تجربه کاربری روان و قابل اعتمادی ارائه دهد.

---

## واژه‌نامه

- **Wizard**: کامپوننت چندمرحله‌ای ثبت قرارداد
- **WizardEngine**: موتور مدیریت وضعیت Wizard در فرانت‌اند
- **StepRenderer**: کامپوننت رندر هر مرحله بر اساس `current_step`
- **ContractStateMachine**: State Machine بک‌اند که مرحله بعدی را از طریق `next_step` اعلام می‌کند
- **PRContractStep**: enum مراحل قرارداد (DRAFT, LANDLORD_INFORMATION, TENANT_INFORMATION, PLACE_INFORMATION, DATING, MORTGAGE, RENTING, SIGNING, WITNESS, FINISH)
- **ContractStatus**: enum وضعیت قرارداد (17 حالت از ADMIN_STARTED تا PDF_GENERATED)
- **NaturalPerson**: شخص حقیقی
- **LegalPerson**: شخص حقوقی
- **Landlord**: مالک ملک
- **Tenant**: مستاجر
- **Witness**: شاهد قرارداد
- **OTP**: رمز یک‌بار مصرف برای تأیید امضا
- **DraftStorage**: مکانیزم ذخیره پیش‌نویس قرارداد در localStorage
- **InlineValidation**: نمایش خطاهای اعتبارسنجی زیر هر فیلد
- **ProgressBar**: نوار پیشرفت با نام مراحل
- **ResolveService**: سرویس بک‌اند برای تأیید شبا / کد ملی / کد پستی
- **Realtor**: مشاور املاک (کاربر admin-ui)
- **EndUser**: کاربر عادی مالک یا مستاجر (کاربر amline-ui)

---

## نیازمندی‌ها

### نیازمندی ۱: شروع و مدیریت چرخه حیات قرارداد

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم یک قرارداد جدید را شروع کنم، تا بتوانم فرآیند ثبت را آغاز کنم.

#### معیارهای پذیرش

1. WHEN کاربر دکمه «شروع قرارداد جدید» را می‌زند، THE Wizard SHALL یک درخواست `POST /contracts/start` ارسال کند و `contract_id` دریافتی را در حافظه نگه دارد.
2. WHEN بک‌اند در پاسخ `next_step` برمی‌گرداند، THE WizardEngine SHALL مرحله فعال را دقیقاً برابر مقدار `next_step` تنظیم کند.
3. THE WizardEngine SHALL هیچ‌گاه مرحله بعدی را بدون دریافت `next_step` از API به صورت hardcode تعیین نکند.
4. WHEN کاربر صفحه را می‌بندد، THE DraftStorage SHALL وضعیت فعلی Wizard را در localStorage با کلید `amline_draft_{contract_id}` ذخیره کند.
5. WHEN کاربر به صفحه قراردادها بازمی‌گردد، THE Wizard SHALL لیست پیش‌نویس‌های ذخیره‌شده را نمایش دهد و امکان ادامه هر پیش‌نویس را فراهم کند.
6. WHEN کاربر روی «ادامه پیش‌نویس» کلیک می‌کند، THE WizardEngine SHALL وضعیت ذخیره‌شده را بازیابی کند و `GET /contracts/{id}/status` را فراخوانی کند تا مرحله جاری را از بک‌اند تأیید کند.
7. IF درخواست `POST /contracts/start` با خطا مواجه شود، THEN THE Wizard SHALL پیام خطا را به صورت inline نمایش دهد و دکمه «تلاش مجدد» را فعال کند.

---

### نیازمندی ۲: نوار پیشرفت و ناوبری مراحل

**داستان کاربر:** به عنوان یک کاربر، می‌خواهم بدانم در کجای فرآیند هستم و چقدر مانده، تا احساس کنترل داشته باشم.

#### معیارهای پذیرش

1. THE ProgressBar SHALL تمام مراحل PRContractStep را به ترتیب با نام فارسی نمایش دهد.
2. WHILE کاربر در یک مرحله است، THE ProgressBar SHALL مرحله فعال را با رنگ متمایز و آیکون «در حال انجام» نشان دهد.
3. WHEN یک مرحله با موفقیت تکمیل می‌شود، THE ProgressBar SHALL آن مرحله را با آیکون تیک سبز علامت‌گذاری کند.
4. THE ProgressBar SHALL درصد پیشرفت کلی را به صورت عددی (مثلاً «۳ از ۹ مرحله») نمایش دهد.
5. WHEN کاربر روی یک مرحله تکمیل‌شده در ProgressBar کلیک می‌کند، THE WizardEngine SHALL ناوبری به آن مرحله را تنها در صورتی مجاز بداند که بک‌اند آن مرحله را قابل ویرایش اعلام کرده باشد.
6. THE ProgressBar SHALL در هر دو محیط admin-ui و amline-ui با همان منطق اما استایل متناسب با هر پلتفرم رندر شود.

---

### نیازمندی ۳: اعتبارسنجی inline و مدیریت خطا

**داستان کاربر:** به عنوان یک کاربر، می‌خواهم خطاهای فرم را دقیقاً زیر هر فیلد ببینم، تا بدانم کدام فیلد را باید اصلاح کنم.

#### معیارهای پذیرش

1. WHEN کاربر یک فیلد را پر می‌کند و از آن خارج می‌شود، THE InlineValidation SHALL خطاهای اعتبارسنجی را بلافاصله زیر همان فیلد نمایش دهد.
2. WHEN بک‌اند در پاسخ به یک endpoint خطای 422 با `field_errors` برمی‌گرداند، THE InlineValidation SHALL هر خطا را زیر فیلد متناظر نمایش دهد.
3. THE Wizard SHALL هیچ‌گاه خطاهای اعتبارسنجی فیلد را صرفاً از طریق toast نمایش ندهد.
4. IF کاربر سعی کند بدون تکمیل فیلدهای اجباری به مرحله بعد برود، THEN THE Wizard SHALL ارسال فرم را متوقف کند و تمام فیلدهای خطادار را با رنگ قرمز مشخص کند.
5. WHEN خطای شبکه یا خطای سرور (5xx) رخ می‌دهد، THE Wizard SHALL یک پیام خطای کلی در بالای فرم نمایش دهد و داده‌های وارد‌شده کاربر را حفظ کند.
6. WHEN کاربر کد ملی وارد می‌کند، THE InlineValidation SHALL الگوریتم اعتبارسنجی کد ملی ایران را در سمت کلاینت اجرا کند و نتیجه را قبل از ارسال به سرور نمایش دهد.
7. WHEN کاربر شماره شبا وارد می‌کند، THE InlineValidation SHALL فرمت IR + 24 رقم را بررسی کند و در صورت معتبر بودن فرمت، درخواست `GET /contracts/resolve-info` را برای تأیید نهایی ارسال کند.

---

### نیازمندی ۴: مرحله اطلاعات مالکان (LANDLORD_INFORMATION)

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم اطلاعات یک یا چند مالک را وارد کنم، تا قرارداد به درستی ثبت شود.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `LANDLORD_INFORMATION` را فعال می‌کند، THE StepRenderer SHALL فرم افزودن مالک را نمایش دهد.
2. THE Wizard SHALL پشتیبانی از افزودن چند مالک را فراهم کند؛ هر مالک با یک درخواست جداگانه `POST /contracts/{id}/party/landlord` ثبت می‌شود.
3. WHEN کاربر نوع شخص «حقیقی» (NaturalPerson) را انتخاب می‌کند، THE StepRenderer SHALL فیلدهای کد ملی، تاریخ تولد، شماره موبایل، شماره شبا و کد پستی را نمایش دهد.
4. WHEN کاربر نوع شخص «حقوقی» (LegalPerson) را انتخاب می‌کند، THE StepRenderer SHALL فیلدهای شناسه ملی شرکت، نام شرکت، شماره ثبت، شماره شبا و اطلاعات نماینده قانونی را نمایش دهد.
5. WHEN کاربر دکمه «تأیید مالکان» را می‌زند، THE Wizard SHALL درخواست `POST /contracts/{id}/party/landlord/set` را ارسال کند.
6. WHEN بک‌اند `next_step` را برمی‌گرداند، THE WizardEngine SHALL به مرحله بعدی منتقل شود.
7. THE Wizard SHALL امکان حذف یک مالک از لیست قبل از تأیید نهایی را فراهم کند.

---

### نیازمندی ۵: مرحله اطلاعات مستاجران (TENANT_INFORMATION)

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم اطلاعات یک یا چند مستاجر را وارد کنم، تا قرارداد کامل شود.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `TENANT_INFORMATION` را فعال می‌کند، THE StepRenderer SHALL فرم افزودن مستاجر را نمایش دهد.
2. THE Wizard SHALL پشتیبانی از افزودن چند مستاجر را فراهم کند؛ هر مستاجر با یک درخواست جداگانه `POST /contracts/{id}/party/tenant` ثبت می‌شود.
3. WHEN کاربر نوع شخص «حقیقی» را انتخاب می‌کند، THE StepRenderer SHALL همان فیلدهای مرحله مالک برای شخص حقیقی را نمایش دهد.
4. WHEN کاربر نوع شخص «حقوقی» را انتخاب می‌کند، THE StepRenderer SHALL همان فیلدهای مرحله مالک برای شخص حقوقی را نمایش دهد.
5. WHEN کاربر دکمه «تأیید مستاجران» را می‌زند، THE Wizard SHALL درخواست `POST /contracts/{id}/party/tenant/set` را ارسال کند.
6. THE Wizard SHALL امکان حذف یک مستاجر از لیست قبل از تأیید نهایی را فراهم کند.

---

### نیازمندی ۶: مرحله اطلاعات ملک (PLACE_INFORMATION)

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم اطلاعات ملک مورد اجاره را وارد کنم.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `PLACE_INFORMATION` را فعال می‌کند، THE StepRenderer SHALL فرم اطلاعات ملک را نمایش دهد.
2. THE Wizard SHALL فیلدهای آدرس، کد پستی، متراژ و شناسه قبض را در این مرحله نمایش دهد.
3. WHEN کاربر کد پستی را وارد می‌کند، THE InlineValidation SHALL فرمت ۱۰ رقمی را بررسی کند و `GET /contracts/resolve-info` را برای تأیید فراخوانی کند.
4. WHEN کاربر دکمه «ثبت اطلاعات ملک» را می‌زند، THE Wizard SHALL درخواست `POST /contracts/{id}/home-info` را ارسال کند.

---

### نیازمندی ۷: مرحله تاریخ‌های قرارداد (DATING)

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم تاریخ شروع و پایان قرارداد را تعیین کنم.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `DATING` را فعال می‌کند، THE StepRenderer SHALL فرم تاریخ‌های قرارداد را با date picker شمسی نمایش دهد.
2. THE Wizard SHALL تاریخ شروع و تاریخ پایان قرارداد را به صورت جداگانه دریافت کند.
3. IF تاریخ پایان قبل از تاریخ شروع باشد، THEN THE InlineValidation SHALL پیام خطای «تاریخ پایان باید بعد از تاریخ شروع باشد» را نمایش دهد.
4. WHEN کاربر دکمه «ثبت تاریخ‌ها» را می‌زند، THE Wizard SHALL درخواست `POST /contracts/{id}/dating` را ارسال کند.

---

### نیازمندی ۸: مرحله ودیعه (MORTGAGE)

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم مبلغ ودیعه را ثبت کنم.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `MORTGAGE` را فعال می‌کند، THE StepRenderer SHALL فرم ودیعه را نمایش دهد.
2. THE Wizard SHALL مبلغ ودیعه را به ریال دریافت کند و معادل تومان را به صورت خودکار نمایش دهد.
3. IF مبلغ ودیعه صفر یا منفی باشد، THEN THE InlineValidation SHALL پیام خطای مناسب نمایش دهد.
4. WHEN کاربر دکمه «ثبت ودیعه» را می‌زند، THE Wizard SHALL درخواست `POST /contracts/{id}/mortgage` را ارسال کند.

---

### نیازمندی ۹: مرحله اجاره (RENTING)

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم مبلغ اجاره ماهانه را ثبت کنم.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `RENTING` را فعال می‌کند، THE StepRenderer SHALL فرم اجاره ماهانه را نمایش دهد.
2. THE Wizard SHALL مبلغ اجاره ماهانه را به ریال دریافت کند و معادل تومان را به صورت خودکار نمایش دهد.
3. IF مبلغ اجاره صفر یا منفی باشد، THEN THE InlineValidation SHALL پیام خطای مناسب نمایش دهد.
4. WHEN کاربر دکمه «ثبت اجاره» را می‌زند، THE Wizard SHALL درخواست `POST /contracts/{id}/renting` را ارسال کند.

---

### نیازمندی ۱۰: مرحله امضا (SIGNING)

**داستان کاربر:** به عنوان یک کاربر، می‌خواهم قرارداد را با OTP امضا کنم، تا قرارداد رسمیت پیدا کند.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `SIGNING` را فعال می‌کند، THE StepRenderer SHALL خلاصه قرارداد را برای بررسی نهایی نمایش دهد.
2. WHEN کاربر دکمه «درخواست امضا» را می‌زند، THE Wizard SHALL درخواست `POST /contracts/{id}/sign` را ارسال کند.
3. WHEN بک‌اند OTP ارسال می‌کند، THE StepRenderer SHALL فرم ورود کد OTP را نمایش دهد.
4. WHEN کاربر کد OTP را وارد می‌کند، THE Wizard SHALL درخواست `POST /contracts/{id}/sign/verify` را ارسال کند.
5. WHEN تأیید OTP موفق است، THE Wizard SHALL درخواست `POST /contracts/{id}/sign/set` را ارسال کند.
6. IF کد OTP نامعتبر باشد، THEN THE InlineValidation SHALL پیام «کد وارد شده نادرست است» را زیر فیلد OTP نمایش دهد.
7. THE Wizard SHALL یک تایمر ۱۲۰ ثانیه‌ای برای انقضای OTP نمایش دهد و پس از انقضا دکمه «ارسال مجدد» را فعال کند.
8. WHILE وضعیت قرارداد `ONE_PARTY_SIGNED` است، THE Wizard SHALL پیام «در انتظار امضای طرف مقابل» را نمایش دهد.

---

### نیازمندی ۱۱: مرحله شاهد (WITNESS)

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم شاهد قرارداد را اضافه و تأیید کنم.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `WITNESS` را فعال می‌کند، THE StepRenderer SHALL فرم افزودن شاهد را نمایش دهد.
2. WHEN کاربر اطلاعات شاهد را وارد می‌کند، THE Wizard SHALL درخواست `POST /contracts/{id}/add-witness` را ارسال کند.
3. WHEN کاربر دکمه «ارسال OTP به شاهد» را می‌زند، THE Wizard SHALL درخواست `POST /contracts/{id}/witness/send-otp` را ارسال کند.
4. WHEN شاهد کد OTP را وارد می‌کند، THE Wizard SHALL درخواست `POST /contracts/{id}/witness/verify` را ارسال کند.
5. IF تأیید شاهد موفق باشد، THEN THE WizardEngine SHALL به مرحله `FINISH` منتقل شود.
6. IF تأیید شاهد ناموفق باشد، THEN THE InlineValidation SHALL پیام خطا را زیر فیلد OTP نمایش دهد.

---

### نیازمندی ۱۲: مرحله پایان و نمایش قرارداد نهایی (FINISH)

**داستان کاربر:** به عنوان یک کاربر، می‌خواهم پس از تکمیل فرآیند، قرارداد نهایی را ببینم و دانلود کنم.

#### معیارهای پذیرش

1. WHEN WizardEngine مرحله `FINISH` را فعال می‌کند، THE StepRenderer SHALL پیام موفقیت و خلاصه قرارداد را نمایش دهد.
2. WHEN وضعیت قرارداد `PDF_GENERATED` است، THE Wizard SHALL دکمه «دانلود PDF» را فعال کند.
3. WHILE وضعیت قرارداد `PDF_GENERATING_FAILED` است، THE Wizard SHALL پیام «خطا در تولید PDF» را نمایش دهد و دکمه «تلاش مجدد» را فعال کند.
4. WHEN قرارداد به مرحله FINISH می‌رسد، THE DraftStorage SHALL پیش‌نویس مرتبط را از localStorage حذف کند.

---

### نیازمندی ۱۳: سازگاری با دو پلتفرم (admin-ui و amline-ui)

**داستان کاربر:** به عنوان یک توسعه‌دهنده، می‌خواهم منطق Wizard در هر دو پلتفرم یکسان باشد، تا از دوباره‌کاری جلوگیری شود.

#### معیارهای پذیرش

1. THE WizardEngine SHALL به صورت یک ماژول مستقل از فریم‌ورک (framework-agnostic) پیاده‌سازی شود که هم در Vite/React و هم در Next.js قابل استفاده باشد.
2. THE StepRenderer SHALL از یک رجیستری مرحله (step registry) استفاده کند که هر `PRContractStep` را به کامپوننت متناظر نگاشت می‌کند.
3. WHERE پلتفرم admin-ui است، THE Wizard SHALL فیلدهای اضافی مختص مشاور (مثل کمیسیون) را نمایش دهد.
4. WHERE پلتفرم amline-ui است، THE Wizard SHALL رابط کاربری ساده‌تر و راهنمای بیشتری برای کاربر عادی نمایش دهد.
5. THE Wizard SHALL در هر دو پلتفرم از راست به چپ (RTL) با فونت فارسی رندر شود.

---

### نیازمندی ۱۴: مدیریت وضعیت‌های خاص قرارداد

**داستان کاربر:** به عنوان یک کاربر، می‌خواهم وضعیت دقیق قرارداد را در هر لحظه بدانم، تا بتوانم اقدام مناسب انجام دهم.

#### معیارهای پذیرش

1. WHEN وضعیت قرارداد `PARTY_REJECTED` است، THE Wizard SHALL پیام رد شدن توسط طرف مقابل را نمایش دهد.
2. WHEN وضعیت قرارداد `EDIT_REQUESTED` است، THE Wizard SHALL امکان ویرایش مراحل قبلی را فعال کند.
3. WHEN وضعیت قرارداد `PENDING_ADMIN_APPROVAL` است، THE Wizard SHALL پیام «در انتظار تأیید مدیر» را نمایش دهد.
4. WHEN وضعیت قرارداد `ADMIN_REJECTED` است، THE Wizard SHALL دلیل رد شدن را نمایش دهد.
5. WHEN وضعیت قرارداد `REVOKED` است، THE Wizard SHALL پیام «قرارداد لغو شده» را نمایش دهد و Wizard را غیرفعال کند.
6. THE Wizard SHALL هر ۳۰ ثانیه یک‌بار `GET /contracts/{id}/status` را فراخوانی کند تا وضعیت را به‌روز نگه دارد.

---

### نیازمندی ۱۵: Resolve اطلاعات هویتی

**داستان کاربر:** به عنوان یک مشاور املاک، می‌خواهم اطلاعات کد ملی، شبا و کد پستی به صورت خودکار تأیید شوند، تا از ورود داده‌های نادرست جلوگیری شود.

#### معیارهای پذیرش

1. WHEN کاربر کد ملی معتبر (۱۰ رقم با الگوریتم صحیح) وارد می‌کند، THE ResolveService SHALL درخواست `GET /contracts/resolve-info?national_id={value}` را ارسال کند.
2. WHEN ResolveService پاسخ موفق برمی‌گرداند، THE StepRenderer SHALL نام کامل شخص را زیر فیلد کد ملی نمایش دهد.
3. WHEN کاربر شماره شبا معتبر وارد می‌کند، THE ResolveService SHALL درخواست `GET /contracts/resolve-info?sheba={value}` را ارسال کند.
4. WHEN ResolveService پاسخ موفق برمی‌گرداند، THE StepRenderer SHALL نام صاحب حساب را زیر فیلد شبا نمایش دهد.
5. IF ResolveService خطا برگرداند، THEN THE InlineValidation SHALL پیام «اطلاعات تأیید نشد» را نمایش دهد.
6. THE ResolveService SHALL درخواست‌های resolve را با debounce 800 میلی‌ثانیه ارسال کند تا از ارسال بیش از حد جلوگیری شود.

---

### نیازمندی ۱۶: ذخیره پیش‌نویس و بازیابی

**داستان کاربر:** به عنوان یک کاربر، می‌خواهم قرارداد ناتمام را ذخیره کنم و بعداً ادامه دهم، تا مجبور نباشم از اول شروع کنم.

#### معیارهای پذیرش

1. THE DraftStorage SHALL وضعیت Wizard را پس از هر تغییر موفق مرحله به صورت خودکار ذخیره کند.
2. THE DraftStorage SHALL `contract_id`، `current_step` و `last_updated` را در localStorage ذخیره کند.
3. WHEN کاربر صفحه را بارگذاری می‌کند، THE Wizard SHALL بررسی کند آیا پیش‌نویس ذخیره‌شده‌ای وجود دارد و در صورت وجود، پیشنهاد ادامه را نمایش دهد.
4. WHEN کاربر «ادامه پیش‌نویس» را انتخاب می‌کند، THE WizardEngine SHALL `GET /contracts/{id}/status` را فراخوانی کند و مرحله جاری را از بک‌اند دریافت کند.
5. WHEN قرارداد به مرحله FINISH می‌رسد، THE DraftStorage SHALL پیش‌نویس مرتبط را به صورت خودکار حذف کند.
6. THE Wizard SHALL امکان «شروع قرارداد جدید» را حتی در صورت وجود پیش‌نویس فراهم کند.

---

### نیازمندی ۱۷: دسترسی‌پذیری و تجربه کاربری

**داستان کاربر:** به عنوان یک کاربر، می‌خواهم Wizard به راحتی قابل استفاده باشد، تا فرآیند ثبت قرارداد بدون سردرگمی انجام شود.

#### معیارهای پذیرش

1. THE Wizard SHALL در تمام مراحل از راست به چپ (RTL) رندر شود.
2. THE Wizard SHALL تمام برچسب‌ها، پیام‌های خطا و راهنماها را به زبان فارسی نمایش دهد.
3. WHEN یک درخواست API در حال ارسال است، THE Wizard SHALL دکمه ارسال را غیرفعال کند و یک نشانگر بارگذاری نمایش دهد.
4. THE Wizard SHALL از keyboard navigation پشتیبانی کند؛ کاربر باید بتواند با Tab بین فیلدها حرکت کند.
5. THE Wizard SHALL در نمایشگرهای موبایل (عرض حداقل 320px) به درستی نمایش داده شود.
6. WHEN کاربر می‌خواهد Wizard را ببندد یا صفحه را ترک کند، THE Wizard SHALL یک dialog تأیید نمایش دهد تا از از دست رفتن داده‌های ذخیره‌نشده جلوگیری کند.
