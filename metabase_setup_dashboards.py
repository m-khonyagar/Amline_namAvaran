"""
ایجاد کوئری‌ها و داشبوردهای حرفه‌ای در Metabase.
- دیتابیس VoIP (id=3): آمار تماس‌ها، نمودار روند، توزیع وضعیت
- دیتابیس Production (id=2): خلاصه قراردادها و پرداخت‌ها (در صورت وجود جدول)
"""
import os
import sys

# اضافه کردن مسیر پروژه برای import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metabase_client import (
    create_card,
    create_dashboard,
    update_dashboard,
    update_dashboard_cards_layout,
    invalidate_dashboard_cache,
    get_dashboard,
    list_dashboards,
    list_cards,
    get_card,
    update_card,
)

VOIP_DB = 3
PRODUCTION_DB = 2


def create_voip_cards():
    """سوالات و نمودارهای حرفه‌ای برای دیتابیس VoIP."""
    cards = []

    # 1) خلاصه روزانه تماس‌های ورودی - نمودار خطی
    r = create_card(
        name="VoIP - روند تماس‌های ورودی روزانه",
        database_id=VOIP_DB,
        sql="""
        SELECT DATE(calldate) AS call_date,
               COUNT(*) AS total_calls,
               SUM(duration) AS total_duration_sec,
               SUM(billsec) AS total_billsec
        FROM cdr
        WHERE calldate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(calldate)
        ORDER BY call_date
        """,
        display="line",
        visualization_settings={
            "graph.dimensions": ["call_date"],
            "graph.metrics": ["total_calls", "total_duration_sec"],
            "graph.y_axis.title_text": "تعداد / ثانیه",
        },
    )
    cards.append((r["id"], 6, 4, 0, 0))

    # 2) توزیع وضعیت تماس (disposition) - نمودار دایره‌ای
    r = create_card(
        name="VoIP - توزیع وضعیت تماس (ANSWERED/BUSY/...)",
        database_id=VOIP_DB,
        sql="""
        SELECT disposition AS status, COUNT(*) AS cnt
        FROM cdr
        WHERE calldate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY disposition
        ORDER BY cnt DESC
        """,
        display="pie",
        visualization_settings={
            "pie.dimension": "status",
            "pie.metric": "cnt",
        },
    )
    cards.append((r["id"], 6, 4, 0, 6))

    # 3) تعداد کل تماس و میانگین مدت - عددی (اسکالر)
    r = create_card(
        name="VoIP - تعداد کل تماس‌ها (۳۰ روز اخیر)",
        database_id=VOIP_DB,
        sql="""
        SELECT COUNT(*) AS total_calls
        FROM cdr
        WHERE calldate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        """,
        display="scalar",
        visualization_settings={"scalar.field": "total_calls"},
    )
    cards.append((r["id"], 3, 2, 4, 0))

    # 4) میانگین مدت تماس (ثانیه)
    r = create_card(
        name="VoIP - میانگین مدت تماس (ثانیه)",
        database_id=VOIP_DB,
        sql="""
        SELECT ROUND(AVG(duration), 1) AS avg_duration_sec
        FROM cdr
        WHERE calldate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND disposition = 'ANSWERED'
        """,
        display="scalar",
        visualization_settings={"scalar.field": "avg_duration_sec"},
    )
    cards.append((r["id"], 3, 2, 4, 3))

    # 5) بیشترین تماس‌گیرنده (src) - نمودار میله‌ای
    r = create_card(
        name="VoIP - ده شماره برتر تماس‌گیرنده",
        database_id=VOIP_DB,
        sql="""
        SELECT src AS caller, COUNT(*) AS call_count
        FROM cdr
        WHERE calldate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY src
        ORDER BY call_count DESC
        LIMIT 10
        """,
        display="bar",
        visualization_settings={
            "graph.dimensions": ["caller"],
            "graph.metrics": ["call_count"],
        },
    )
    cards.append((r["id"], 6, 4, 6, 0))

    # 6) خلاصه تماس ورودی از view آماده (جدول)
    r = create_card(
        name="VoIP - خلاصه روزانه تماس ورودی (جدول)",
        database_id=VOIP_DB,
        sql="""
        SELECT * FROM incoming_daily_summary
        ORDER BY call_date DESC
        LIMIT 31
        """,
        display="table",
        visualization_settings={},
    )
    cards.append((r["id"], 6, 4, 6, 6))

    return cards


def create_caller_stats_cards():
    """کوئری‌های آمار تماس‌گیرندگان: درصد یک‌بار تماس vs بیش از یک بار، با روز و ماه شمسی."""
    cards = []
    sql_daily = """
    WITH daily_calls AS (
      SELECT DATE(calldate) AS d, src, COUNT(*) AS calls_per_caller
      FROM cdr
      WHERE calldate >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      GROUP BY DATE(calldate), src
    ),
    daily_agg AS (
      SELECT d,
        COUNT(*) AS total_callers,
        SUM(CASE WHEN calls_per_caller = 1 THEN 1 ELSE 0 END) AS one_time_callers,
        SUM(CASE WHEN calls_per_caller > 1 THEN 1 ELSE 0 END) AS repeat_callers,
        SUM(calls_per_caller) AS total_calls,
        SUM(CASE WHEN calls_per_caller = 1 THEN calls_per_caller ELSE 0 END) AS calls_from_one,
        SUM(CASE WHEN calls_per_caller > 1 THEN calls_per_caller ELSE 0 END) AS calls_from_repeat
      FROM daily_calls
      GROUP BY d
    )
    SELECT
      d AS call_date,
      IF(DAYOFYEAR(d) >= 80, YEAR(d)-621, YEAR(d)-622) AS shamsi_year,
      CASE
        WHEN DAYOFYEAR(d) < 80 THEN 12
        WHEN DAYOFYEAR(d) - 79 <= 186 THEN 1 + FLOOR((DAYOFYEAR(d)-80)/31)
        WHEN DAYOFYEAR(d) - 79 <= 336 THEN 7 + FLOOR((DAYOFYEAR(d)-80-186)/30)
        ELSE 12
      END AS shamsi_month,
      CASE
        WHEN DAYOFYEAR(d) < 80 THEN (DAYOFYEAR(d) + 286) - 336
        WHEN DAYOFYEAR(d) - 79 <= 186 THEN MOD(DAYOFYEAR(d)-80, 31) + 1
        WHEN DAYOFYEAR(d) - 79 <= 336 THEN MOD(DAYOFYEAR(d)-80-186, 30) + 1
        ELSE DAYOFYEAR(d) - 80 - 336
      END AS shamsi_day,
      total_callers,
      one_time_callers,
      repeat_callers,
      ROUND(100.0 * one_time_callers / NULLIF(total_callers,0), 1) AS pct_callers_one_time,
      ROUND(100.0 * repeat_callers / NULLIF(total_callers,0), 1) AS pct_callers_repeat,
      total_calls,
      calls_from_one,
      calls_from_repeat,
      ROUND(100.0 * calls_from_one / NULLIF(total_calls,0), 1) AS pct_calls_from_one_time,
      ROUND(100.0 * calls_from_repeat / NULLIF(total_calls,0), 1) AS pct_calls_from_repeat
    FROM daily_agg
    ORDER BY d DESC
    LIMIT 92
    """
    r = create_card(
        name="VoIP - آمار تماس\u200cگیرندگان (یک\u200cبار vs بیش از یک بار) با تاریخ شمسی",
        database_id=VOIP_DB,
        sql=sql_daily,
        display="table",
        visualization_settings={},
    )
    cards.append((r["id"], 24, 6, 18, 0))

    # خلاصه کلی: درصد و تعداد در یک نگاه
    sql_summary = """
    WITH per_caller AS (
      SELECT src, COUNT(*) AS cnt
      FROM cdr
      WHERE calldate >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      GROUP BY src
    ),
    agg AS (
      SELECT
        COUNT(*) AS total_callers,
        SUM(CASE WHEN cnt = 1 THEN 1 ELSE 0 END) AS one_time_callers,
        SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END) AS repeat_callers,
        SUM(cnt) AS total_calls,
        SUM(CASE WHEN cnt = 1 THEN cnt ELSE 0 END) AS calls_from_one,
        SUM(CASE WHEN cnt > 1 THEN cnt ELSE 0 END) AS calls_from_repeat
      FROM per_caller
    )
    SELECT
      total_callers,
      one_time_callers,
      repeat_callers,
      ROUND(100.0 * one_time_callers / NULLIF(total_callers,0), 1) AS pct_callers_one_time,
      ROUND(100.0 * repeat_callers / NULLIF(total_callers,0), 1) AS pct_callers_repeat,
      total_calls,
      calls_from_one,
      calls_from_repeat,
      ROUND(100.0 * calls_from_one / NULLIF(total_calls,0), 1) AS pct_calls_from_one_time,
      ROUND(100.0 * calls_from_repeat / NULLIF(total_calls,0), 1) AS pct_calls_from_repeat
    FROM agg
    """
    r = create_card(
        name="VoIP - خلاصه درصد تماس\u200cگیرندگان یک\u200cبار و تکراری (۹۰ روز)",
        database_id=VOIP_DB,
        sql=sql_summary,
        display="table",
        visualization_settings={},
    )
    cards.append((r["id"], 24, 3, 24, 0))

    return cards


def create_production_cards():
    """سوالات برای دیتابیس Production (قراردادها، پرداخت‌ها). اسکیمای صحیح: contract."""
    cards = []

    # قراردادها به تفکیک وضعیت (جدول در schema contract)
    r = create_card(
        name="Production - تعداد قراردادها به تفکیک وضعیت",
        database_id=PRODUCTION_DB,
        sql="""
        SELECT status, COUNT(*) AS cnt
        FROM contract.contracts
        GROUP BY status
        ORDER BY cnt DESC
        """,
        display="bar",
        visualization_settings={
            "graph.dimensions": ["status"],
            "graph.metrics": ["cnt"],
        },
    )
    cards.append((r["id"], 6, 4, 10, 0))

    # روند ایجاد قرارداد در زمان
    r = create_card(
        name="Production - روند ایجاد قرارداد (ماهانه)",
        database_id=PRODUCTION_DB,
        sql="""
        SELECT (DATE_TRUNC('month', created_at))::date AS month, COUNT(*) AS contract_count
        FROM contract.contracts
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
        """,
        display="line",
        visualization_settings={
            "graph.dimensions": ["month"],
            "graph.metrics": ["contract_count"],
        },
    )
    cards.append((r["id"], 6, 4, 10, 6))

    # خلاصه پرداخت‌های قرارداد
    r = create_card(
        name="Production - خلاصه پرداخت‌های قرارداد",
        database_id=PRODUCTION_DB,
        sql="""
        SELECT type AS payment_type, status, COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS total_amount
        FROM contract.contract_payments
        GROUP BY type, status
        ORDER BY total_amount DESC
        """,
        display="table",
        visualization_settings={},
    )
    cards.append((r["id"], 12, 4, 14, 0))

    return cards


def fix_existing_production_cards():
    """کارت‌های Production که با public. ساخته شده‌اند را به contract. اصلاح می‌کند."""
    cards = list_cards()
    fixes = [
        (
            "Production - تعداد قراردادها به تفکیک وضعیت",
            {
                "database": PRODUCTION_DB,
                "type": "native",
                "native": {
                    "query": "SELECT status, COUNT(*) AS cnt FROM contract.contracts GROUP BY status ORDER BY cnt DESC",
                },
            },
        ),
        (
            "Production - روند ایجاد قرارداد (ماهانه)",
            {
                "database": PRODUCTION_DB,
                "type": "native",
                "native": {
                    "query": "SELECT (DATE_TRUNC('month', created_at))::date AS month, COUNT(*) AS contract_count FROM contract.contracts WHERE created_at >= NOW() - INTERVAL '12 months' GROUP BY DATE_TRUNC('month', created_at) ORDER BY month",
                },
            },
        ),
        (
            "Production - خلاصه پرداخت‌های قرارداد",
            {
                "database": PRODUCTION_DB,
                "type": "native",
                "native": {
                    "query": "SELECT type AS payment_type, status, COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS total_amount FROM contract.contract_payments GROUP BY type, status ORDER BY total_amount DESC",
                },
            },
        ),
    ]
    updated = 0
    for c in cards:
        name = c.get("name") or ""
        for title, dataset_query in fixes:
            if title in name or name.strip() == title.strip():
                cur = get_card(c["id"])
                cur["dataset_query"] = dataset_query
                update_card(c["id"], cur)
                updated += 1
                print(f"  Updated card id: {c['id']}")
                break
    return updated


# چیدمان حرفه‌ای: (size_x, size_y, row, col) - گرید ۲۴ ستونی (استاندارد Metabase)
PRO_LAYOUT = [
    (12, 4, 0, 0),   # 0: روند تماس ورودی
    (12, 4, 0, 12),  # 1: توزیع وضعیت
    (12, 2, 4, 0),   # 2: KPI تعداد
    (12, 2, 4, 12),  # 3: KPI میانگین
    (12, 4, 6, 0),   # 4: ده شماره برتر
    (12, 4, 6, 12),  # 5: خلاصه روزانه جدول
    (12, 4, 10, 0),  # 6: قرارداد وضعیت
    (12, 4, 10, 12), # 7: روند ماهانه
    (24, 5, 14, 0),  # 8: خلاصه پرداخت تمام‌عرض
]


def apply_professional_layout(dashboard_id: int):
    """اعمال ابعاد و چیدمان حرفه‌ای؛ کل آبجکت هر dashcard حفظ می‌شود، فقط موقعیت/ابعاد عوض می‌شود."""
    dash = get_dashboard(dashboard_id)
    cards = dash.get("dashcards") or dash.get("ordered_cards") or []
    if not cards:
        return 0
    def order_key(dc):
        c = dc.get("card") or {}
        name = (c.get("name") or "").strip()
        is_prod = "Production" in name or "production" in name.lower()
        return (is_prod, name)
    cards_sorted = sorted(cards, key=order_key)
    layout = PRO_LAYOUT
    updated = []
    for i, dc in enumerate(cards_sorted):
        if i >= len(layout):
            last_row = layout[-1][2] + layout[-1][1] if layout else 0
            sx, sy, row, col = layout[-1][0], layout[-1][1], last_row, 0
        else:
            sx, sy, row, col = layout[i]
        # حفظ کامل dashcard و فقط به‌روزرسانی ابعاد/موقعیت (برای سازگاری با API)
        new_dc = dict(dc)
        new_dc["size_x"] = sx
        new_dc["size_y"] = sy
        new_dc["row"] = row
        new_dc["col"] = col
        updated.append(new_dc)
    dash["dashcards"] = updated
    update_dashboard(dashboard_id, dash)
    # اجبار به‌روزرسانی چیدمان از طریق endpoint مخصوص کارت‌ها (برای اعمال در UI)
    layout_only = [
        {
            "id": dc["id"],
            "size_x": dc["size_x"],
            "size_y": dc["size_y"],
            "row": dc["row"],
            "col": dc["col"],
            "parameter_mappings": dc.get("parameter_mappings") or [],
            "series": dc.get("series") or [],
        }
        for dc in updated
    ]
    try:
        update_dashboard_cards_layout(dashboard_id, layout_only)
    except Exception:
        pass
    try:
        invalidate_dashboard_cache(dashboard_id)
    except Exception:
        pass
    return len(updated)


def build_dashcards(card_layouts):
    """ساخت آرایه dashcards برای PUT dashboard. id منفی یکتا برای هر کارت جدید."""
    return [
        {
            "id": -(i + 1),
            "card_id": cid,
            "size_x": sx,
            "size_y": sy,
            "row": row,
            "col": col,
            "parameter_mappings": [],
            "series": [],
        }
        for i, (cid, sx, sy, row, col) in enumerate(card_layouts)
    ]


def main():
    api_key = os.environ.get("METABASE_API_KEY")
    if not api_key:
        print("METABASE_API_KEY not set. Exit.")
        sys.exit(1)

    # اصلاح کارت‌های Production قبلی که با اسکیمای اشتباه ساخته شده‌اند
    print("Fixing existing Production cards (wrong schema)...")
    n = fix_existing_production_cards()
    if n:
        print(f"  Fixed {n} card(s).")
    else:
        print("  No matching cards to fix (or already correct).")

    print("Creating VoIP cards...")
    voip_cards = create_voip_cards()
    print(f"  Created {len(voip_cards)} VoIP cards.")

    print("Creating Production cards...")
    try:
        prod_cards = create_production_cards()
        print(f"  Created {len(prod_cards)} Production cards.")
        all_cards = voip_cards + prod_cards
    except Exception as e:
        print(f"  Production cards failed (tables may differ): {e}")
        all_cards = voip_cards

    # داشبورد یکپارچه: آمار و نمودارهای حرفه‌ای
    print("Creating dashboard...")
    dash = create_dashboard(
        name="داشبورد حرفه‌ای - آمار VoIP و Production",
        description="کوئری‌ها و نمودارهای پیشنهادی بر اساس داده‌های Metabase",
    )
    dashboard_id = dash["id"]

    dashcards = build_dashcards(all_cards)
    # GET dashboard برای حفظ فیلدهای دیگر
    current = get_dashboard(dashboard_id)
    current["dashcards"] = dashcards
    update_dashboard(dashboard_id, current)
    print(f"Dashboard created and cards added: https://amline-metabase.darkube.app/dashboard/{dashboard_id}")
    print("Done.")


if __name__ == "__main__":
    if not os.environ.get("METABASE_API_KEY"):
        print("METABASE_API_KEY not set.")
        sys.exit(1)
    if len(sys.argv) > 1:
        arg = sys.argv[1].strip().lower()
        if arg == "fix":
            print("Fixing existing Production cards (schema contract)...")
            n = fix_existing_production_cards()
            print(f"Done. Updated {n} card(s). Refresh the dashboard.")
            sys.exit(0)
        if arg == "caller_stats":
            print("Creating caller stats cards (one-time vs repeat, Shamsi)...")
            created = create_caller_stats_cards()
            print(f"Created {len(created)} card(s). Add them to your dashboard from Metabase.")
            for cid, sx, sy, row, col in created:
                print(f"  Card id: {cid}")
            sys.exit(0)
        if arg == "layout":
            dash_id = int(sys.argv[2]) if len(sys.argv) > 2 else None
            if dash_id is None:
                boards = list_dashboards()
                if isinstance(boards, dict):
                    boards = boards.get("data", [])
                for d in boards:
                    name = d.get("name") or ""
                    if "حرفه" in name or "Professional" in name or "آمار" in name:
                        dash_id = d["id"]
                        break
                if dash_id is None:
                    print("Dashboard not found. Use: py metabase_setup_dashboards.py layout <dashboard_id>")
                    sys.exit(1)
            n = apply_professional_layout(dash_id)
            print(f"Done. Applied professional layout to {n} card(s). Refresh the dashboard.")
            sys.exit(0)
    main()
