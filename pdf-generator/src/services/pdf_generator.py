"""
PDF Generator Service
اَملاین - Amline Platform

سرویس تولید PDF با استفاده از Jinja2 و WeasyPrint
پشتیبانی از فارسی، تاریخ جلالی و اعداد فارسی
"""
import os
from datetime import datetime
from io import BytesIO
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape, Template
from weasyprint import HTML
import logging

logger = logging.getLogger(__name__)


class PDFGeneratorService:
    """سرویس تولید PDF"""

    # Bump when bundled default HTML changes so volumes with old built-in file get replaced.
    PR_BUILTIN_TEMPLATE_REVISION = 2

    def __init__(self):
        """initialize PDF Generator Service"""
        # Template directory
        self.templates_dir = Path(__file__).parent.parent / "templates"
        self.templates_dir.mkdir(exist_ok=True)
        
        # Initialize Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            autoescape=select_autoescape(['html', 'xml']),
            enable_async=True
        )
        
        # Register custom filters
        self._register_filters()
        
        logger.info(f"PDF Generator initialized with templates dir: {self.templates_dir}")

    def _clear_jinja_template_cache(self) -> None:
        cache = getattr(self.env, "cache", None)
        if cache is not None and hasattr(cache, "clear"):
            try:
                cache.clear()
            except Exception:
                pass

    def _ensure_pr_contract_template(self) -> None:
        """Create missing default template; refresh built-in file when revision lags (safe if HTML has our marker)."""
        import re

        template_path = self.templates_dir / "pr_contract" / "index.html"
        if not template_path.exists():
            self._create_default_pr_contract_template()
            self._clear_jinja_template_cache()
            return
        try:
            head = template_path.read_text(encoding="utf-8")[:400]
        except OSError:
            return
        m = re.match(r"^\s*<!--\s*amline-default-template\s+revision=(\d+)\s*-->", head)
        if not m:
            return
        file_rev = int(m.group(1))
        force = os.environ.get("AMLINE_PDF_FORCE_DEFAULT_TEMPLATE", os.environ.get("PDF_FORCE_DEFAULT_TEMPLATE", "")).lower() in (
            "1",
            "true",
            "yes",
        )
        if force or file_rev < self.PR_BUILTIN_TEMPLATE_REVISION:
            self._create_default_pr_contract_template()
            self._clear_jinja_template_cache()

    def _register_filters(self):
        """Register custom Jinja2 filters for Persian support"""
        
        def format_number(num: int) -> str:
            """تبدیل اعداد به فرمت فارسی با جداکننده هزارگان"""
            if num is None:
                return ""
            # تبدیل به رشته و فرمت‌بندی
            formatted = f"{num:,}"
            # جایگزینی اعداد انگلیسی با فارسی
            persian_digits = '۰۱۲۳۴۵۶۷۸۹'
            english_digits = '0123456789'
            result = formatted.translate(str.maketrans(english_digits, persian_digits))
            return result
        
        def to_persian_word(num: int) -> str:
            """تبدیل عدد به حروف فارسی"""
            if num is None:
                return ""
            try:
                from num2words import num2words
                # تبدیل به کلمات فارسی
                words = num2words(num, lang='fa')
                return words
            except Exception as e:
                logger.warning(f"Error converting number to words: {e}")
                return str(num)
        
        def format_date_jalali(date_str: str) -> str:
            """تبدیل تاریخ میلادی به جلالی"""
            if not date_str:
                return ""
            try:
                # اگر رشته تاریخ باشد
                if isinstance(date_str, str):
                    # تلاش برای پارس کردن تاریخ
                    try:
                        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    except:
                        try:
                            dt = datetime.strptime(date_str, "%Y-%m-%d")
                        except:
                            return date_str
                else:
                    dt = date_str
                
                # تبدیل به تاریخ جلالی
                j_date = self._to_jalali(dt.year, dt.month, dt.day)
                return f"{j_date['year']}/{j_date['month']:02d}/{j_date['day']:02d}"
            except Exception as e:
                logger.warning(f"Error converting date: {e}")
                return date_str
        
        def to_ordinal_persian(num: int) -> str:
            """تبدیل عدد به ترتیبی فارسی"""
            if num is None:
                return ""
            ordinals = {
                1: "اول",
                2: "دوم",
                3: "سوم",
                4: "چهارم",
                5: "پنجم",
                6: "ششم",
                7: "هفتم",
                8: "هشتم",
                9: "نهم",
                10: "دهم",
            }
            if num in ordinals:
                return ordinals[num]
            return f"{num}ام"
        
        def rial_to_toman(rial: int) -> int:
            """تبدیل ریال به تومان"""
            if rial is None:
                return 0
            return rial // 10
        
        # Register filters
        self.env.filters['format_number'] = format_number
        self.env.filters['to_persian_word'] = to_persian_word
        self.env.filters['format_date_jalali'] = format_date_jalali
        self.env.filters['to_ordinal_persian'] = to_ordinal_persian
        self.env.filters['rial_to_toman'] = rial_to_toman
        
        logger.info("Custom filters registered for PDF generation")
    
    def _to_jalali(self, year: int, month: int, day: int) -> dict:
        """تبدیل تاریخ میلادی به جلالی"""
        # الگوریتم تبدیل تاریخ
        # (این یک پیاده‌سازی ساده است)
        day_sum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
        
        if month > 2:
            day_num = day_sum[month - 1] + day + (1 if (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0) else 0)
        else:
            day_num = day_sum[month - 1] + day
        
        # روز در سال جلالی
        j_year = year - 621
        j_day = day_num + (79 if day_num > 79 else 0)
        
        if j_day > 366:
            j_year += 1
            j_day -= 366
        
        # ماه جلالی
        j_month = 1
        j_days_in_month = 31
        
        for i in range(1, 13):
            if i <= 6:
                j_days_in_month = 31
            elif i <= 11:
                j_days_in_month = 30
            else:
                j_days_in_month = 29 if (j_year % 33 in [1, 5, 9, 13, 17, 22, 26, 30]) else 30
            
            if j_day > j_days_in_month:
                j_day -= j_days_in_month
                j_month += 1
        
        return {
            'year': j_year,
            'month': j_month,
            'day': j_day
        }
    
    async def generate_pr_contract(self, contract_data) -> tuple[bytes, str]:
        """
        تولید PDF قرارداد پیش‌قرارداد
        
        Returns:
            tuple: (pdf_bytes, file_name)
        """
        try:
            template_name = "pr_contract/index.html"
            self._ensure_pr_contract_template()

            # Load template
            template = self.env.get_template(template_name)
            
            # Prepare context data
            raw = (
                contract_data.model_dump()
                if hasattr(contract_data, "model_dump")
                else (contract_data.dict() if hasattr(contract_data, "dict") else contract_data)
            )
            context = {
                'contract': raw,
                'generated_date': datetime.now(),
                'generated_date_jalali': self._to_jalali(datetime.now().year, datetime.now().month, datetime.now().day),
            }
            
            # Render HTML
            html_content = await template.render_async(**context)
            
            # Convert to PDF
            pdf_bytes = await self._html_to_pdf(html_content)
            
            # Generate file name
            cid = raw.get("contract_id", "unknown") if isinstance(raw, dict) else getattr(contract_data, "contract_id", "unknown")
            file_name = f"pr_contract_{cid}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            
            logger.info(f"PR Contract PDF generated: {file_name}")
            
            return pdf_bytes, file_name
            
        except Exception as e:
            logger.error(f"Error generating PR contract PDF: {e}")
            raise
    
    async def generate_from_html(self, html_content: str) -> bytes:
        """
        تولید PDF از HTML
        
        Args:
            html_content: محتوای HTML
            
        Returns:
            bytes: محتوای PDF
        """
        return await self._html_to_pdf(html_content)
    
    async def _html_to_pdf(self, html_content: str) -> bytes:
        """
        تبدیل HTML به PDF
        
        Args:
            html_content: محتوای HTML
            
        Returns:
            bytes: محتوای PDF
        """
        try:
            # Create PDF from HTML using WeasyPrint
            pdf_doc = HTML(
                string=html_content,
                base_url=str(self.templates_dir)
            ).write_pdf(
                stylesheets=[
                    # Add Persian font support
                    self._get_persian_font_css()
                ]
            )
            
            return pdf_doc
            
        except Exception as e:
            logger.error(f"Error converting HTML to PDF: {e}")
            # Try without stylesheets
            try:
                pdf_doc = HTML(string=html_content).write_pdf()
                return pdf_doc
            except:
                raise
    
    def _get_persian_font_css(self) -> str:
        """دریافت CSS فونت فارسی"""
        return """
        @font-face {
            font-family: 'Vazir';
            src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn-font/dist/fonts/Vazirmatn-Regular.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'Vazir';
            src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn-font/dist/fonts/Vazirmatn-Bold.woff2') format('woff2');
            font-weight: bold;
            font-style: normal;
        }
        
        body {
            font-family: 'Vazir', 'Tahoma', 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
        }
        
        * {
            font-family: 'Vazir', 'Tahoma', 'Arial', sans-serif;
        }
        """
    
    def save_template(self, template_name: str, content: str) -> str:
        """ذخیره قالب HTML"""
        template_path = self.templates_dir / template_name
        template_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        logger.info(f"Template saved: {template_path}")
        return str(template_path)
    
    def list_templates(self) -> list:
        """لیست قالب‌های موجود"""
        templates = []
        
        for root, dirs, files in os.walk(self.templates_dir):
            for file in files:
                if file.endswith('.html'):
                    full_path = Path(root) / file
                    relative_path = full_path.relative_to(self.templates_dir)
                    templates.append(str(relative_path))
        
        return templates
    
    def _create_default_pr_contract_template(self):
        """ایجاد قالب پیش‌فرض قرارداد پیش‌قرارداد"""
        rev = self.PR_BUILTIN_TEMPLATE_REVISION
        marker = f"<!-- amline-default-template revision={rev} -->\n"
        template_content = marker + """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>قرارداد پیش‌قرارداد اجاره</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: 'Tahoma', 'Arial', sans-serif;
            direction: rtl;
            line-height: 1.8;
            font-size: 12pt;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .logo {
            font-size: 24pt;
            font-weight: bold;
            color: #1a73e8;
        }
        
        .contract-title {
            font-size: 18pt;
            font-weight: bold;
            margin-top: 10px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            background-color: #f5f5f5;
            padding: 8px;
            border-right: 4px solid #1a73e8;
            margin-bottom: 10px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .info-item {
            padding: 5px;
        }
        
        .info-label {
            font-weight: bold;
            color: #555;
        }
        
        .financial-box {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        
        .financial-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ccc;
        }
        
        .financial-item:last-child {
            border-bottom: none;
        }
        
        .amount {
            font-weight: bold;
            font-size: 14pt;
        }
        
        .clauses {
            margin-top: 30px;
        }
        
        .clause {
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        
        .clause-number {
            font-weight: bold;
            color: #1a73e8;
        }
        
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            margin-top: 50px;
        }
        
        .signature-box {
            text-align: center;
            padding-top: 60px;
        }
        
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 40px;
            padding-top: 5px;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10pt;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">اَملاین</div>
        <div class="contract-title">{% if contract.contract_kind == 'BUYING_AND_SELLING' %}قرارداد خرید و فروش ملک{% else %}قرارداد پیش‌قرارداد اجاره{% endif %}</div>
        <div>شماره قرارداد: {{ contract.contract_id }}</div>
        <div>تاریخ تنظیم: {{ contract.start_date | format_date_jalali }}</div>
    </div>
    
    <div class="section">
        <div class="section-title">{% if contract.contract_kind == 'BUYING_AND_SELLING' %}مشخصات فروشنده{% else %}مشخصات موجر{% endif %}</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">نام و نام خانوادگی:</span>
                {{ contract.landlord.full_name }}
            </div>
            <div class="info-item">
                <span class="info-label">کد ملی:</span>
                {{ contract.landlord.national_id }}
            </div>
            <div class="info-item">
                <span class="info-label">شماره تماس:</span>
                {{ contract.landlord.phone }}
            </div>
            {% if contract.landlord.address %}
            <div class="info-item">
                <span class="info-label">آدرس:</span>
                {{ contract.landlord.address }}
            </div>
            {% endif %}
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">{% if contract.contract_kind == 'BUYING_AND_SELLING' %}مشخصات خریدار{% else %}مشخصات مستأجر{% endif %}</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">نام و نام خانوادگی:</span>
                {{ contract.tenant.full_name }}
            </div>
            <div class="info-item">
                <span class="info-label">کد ملی:</span>
                {{ contract.tenant.national_id }}
            </div>
            <div class="info-item">
                <span class="info-label">شماره تماس:</span>
                {{ contract.tenant.phone }}
            </div>
            {% if contract.tenant.address %}
            <div class="info-item">
                <span class="info-label">آدرس:</span>
                {{ contract.tenant.address }}
            </div>
            {% endif %}
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">مشخصات ملک (房產)</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">آدرس:</span>
                {{ contract.property.address }}
            </div>
            <div class="info-item">
                <span class="info-label">کد پستی:</span>
                {{ contract.property.postal_code }}
            </div>
            <div class="info-item">
                <span class="info-label">متراژ:</span>
                {{ contract.property.area | format_number }} متر مربع
            </div>
            {% if contract.property.unit_number %}
            <div class="info-item">
                <span class="info-label">شماره واحد:</span>
                {{ contract.property.unit_number }}
            </div>
            {% endif %}
            {% if contract.property.floor %}
            <div class="info-item">
                <span class="info-label">طبقه:</span>
                {{ contract.property.floor }}
            </div>
            {% endif %}
            <div class="info-item">
                <span class="info-label">نوع ملک:</span>
                {{ contract.property.type }}
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">مدت قرارداد</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">تاریخ شروع:</span>
                {{ contract.start_date | format_date_jalali }}
            </div>
            <div class="info-item">
                <span class="info-label">تاریخ پایان:</span>
                {{ contract.end_date | format_date_jalali }}
            </div>
        </div>
    </div>
    
    {% if contract.contract_kind == 'BUYING_AND_SELLING' %}
    <div class="financial-box">
        <div class="section-title">شرایط مالی — خرید و فروش</div>
        <div class="financial-item">
            <span>قیمت توافقی فروش:</span>
            <span class="amount">{{ contract.sale_total_price | format_number }} تومان</span>
        </div>
        <div style="margin-top: 10px; font-size: 11pt;">
            <strong>به حروف:</strong> {{ contract.sale_total_price | to_persian_word }} تومان
        </div>
    </div>
    {% else %}
    <div class="financial-box">
        <div class="section-title">شرایط مالی — رهن و اجاره</div>
        <div class="financial-item">
            <span>اجاره ماهانه:</span>
            <span class="amount">{{ contract.monthly_rent | format_number }} تومان</span>
        </div>
        <div class="financial-item">
            <span>ودیعه (رضایت):</span>
            <span class="amount">{{ contract.deposit | format_number }} تومان</span>
        </div>
        <div class="financial-item">
            <span>جمع کل:</span>
            <span class="amount">{{ (contract.monthly_rent + contract.deposit) | format_number }} تومان</span>
        </div>
        <div style="margin-top: 10px; font-size: 11pt;">
            <strong>به حروف:</strong> {{ (contract.monthly_rent + contract.deposit) | to_persian_word }} تومان
        </div>
    </div>
    {% endif %}
    
    {% if contract.payments %}
    <div class="section">
        <div class="section-title">جدول پرداخت‌ها</div>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background-color: #f5f5f5;">
                    <th style="border: 1px solid #ddd; padding: 8px;">ردیف</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">مبلغ</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">تاریخ سررسید</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">نوع</th>
                </tr>
            </thead>
            <tbody>
                {% for payment in contract.payments %}
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">{{ loop.index | to_ordinal_persian }}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{{ payment.amount | format_number }} تومان</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{{ payment.due_date | format_date_jalali }}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{{ payment.payment_type }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
    {% endif %}
    
    {% if contract.clauses %}
    <div class="clauses">
        <div class="section-title">بنود قرارداد (合約條款)</div>
        {% for clause in contract.clauses %}
        <div class="clause">
            <div class="clause-number">بند {{ loop.index }} - {{ clause.title }}</div>
            <div>{{ clause.content }}</div>
        </div>
        {% endfor %}
    </div>
    {% endif %}
    
    <div class="signatures">
        <div class="signature-box">
            <div>{% if contract.contract_kind == 'BUYING_AND_SELLING' %}امضای فروشنده{% else %}امضای موجر{% endif %}</div>
            <div class="signature-line">
                نام و نام خانوادگی: {{ contract.landlord.full_name }}
            </div>
        </div>
        <div class="signature-box">
            <div>{% if contract.contract_kind == 'BUYING_AND_SELLING' %}امضای خریدار{% else %}امضای مستأجر{% endif %}</div>
            <div class="signature-line">
                نام و نام خانوادگی: {{ contract.tenant.full_name }}
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>این قرارداد توسط سیستم اَملاین تولید شده است.</p>
        <p>آدرس وبسایت: www.amline.ir | شماره تماس: 021-88888888</p>
    </div>
</body>
</html>"""
        
        template_path = self.templates_dir / "pr_contract"
        template_path.mkdir(parents=True, exist_ok=True)
        
        with open(template_path / "index.html", 'w', encoding='utf-8') as f:
            f.write(template_content)
        
        logger.info(f"Default PR contract template created at {template_path}")
