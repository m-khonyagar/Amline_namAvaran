"""
تبدیل تاریخ میلادی به شمسی (جلالی) برای نمایش در داشبورد GSC.
"""
try:
    import jdatetime
except ImportError:
    jdatetime = None


def date_str_to_jalali(date_str: str, sep: str = "/") -> str:
    """
    تبدیل رشته تاریخ میلادی (YYYY-MM-DD) به شمسی.
    مثال: "2024-01-15" -> "1402/10/25"
    """
    if not date_str:
        return ""
    try:
        parts = str(date_str).strip().split("-")
        if len(parts) >= 3:
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            if jdatetime:
                j = jdatetime.datetime.fromgregorian(year=y, month=m, day=d)
                return f"{j.year}{sep}{j.month:02d}{sep}{j.day:02d}"
            return date_str
    except (ValueError, IndexError, TypeError):
        pass
    return str(date_str)
