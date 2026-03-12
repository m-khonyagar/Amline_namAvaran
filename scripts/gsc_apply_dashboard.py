"""
Apply professional dashboard design to GSC Google Sheet.
Creates Dashboard with KPIs, charts, formatting, and recommendations.
"""
import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_FILE = os.environ.get("GSC_KEY_FILE")
if not KEY_FILE:
    raise ValueError("GSC_KEY_FILE environment variable is required")
KEY_FILE = os.path.abspath(KEY_FILE)
SHEET_ID = os.environ.get("GSC_SHEET_ID", "1qFynl6JMLbT55ucqXe2zQ7w710JCpkhlxHYvZDC8oEA").strip()
from gsc_paths import GSC_DATA_DIR
from gsc_jalali import date_str_to_jalali

GSC_JSON = os.path.join(GSC_DATA_DIR, "gsc_full_export.json")

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def build_service():
    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def get_sheet_ids(service):
    meta = service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    return {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta.get("sheets", [])}


def ensure_sheet(service, title):
    meta = service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    for s in meta.get("sheets", []):
        if s["properties"]["title"] == title:
            return s["properties"]["sheetId"]
    req = {"requests": [{"addSheet": {"properties": {"title": title[:100]}}}]}
    res = service.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body=req).execute()
    return res["replies"][0]["addSheet"]["properties"]["sheetId"]


def main():
    if not os.path.isfile(GSC_JSON):
        print("Run gsc_export_all.py and gsc_sync first")
        return

    with open(GSC_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    service = build_service()
    sheet_ids = get_sheet_ids(service)
    perf_id = sheet_ids.get("Performance_by_Date")
    device_id = sheet_ids.get("By_Device")
    country_id = sheet_ids.get("By_Country")
    queries_id = sheet_ids.get("Queries")
    pages_id = sheet_ids.get("Pages")

    # Create Dashboard sheet
    dash_id = ensure_sheet(service, "Dashboard")

    sa = data.get("searchAnalytics") or {}
    by_date = sa.get("by_date") or []
    by_device = sa.get("by_device") or []
    by_country = sa.get("by_country") or []
    by_query = sa.get("by_query") or []
    by_page = sa.get("by_page") or []

    total_clicks = sum(r.get("clicks", 0) for r in by_date)
    total_imp = sum(r.get("impressions", 0) for r in by_date)
    avg_ctr = (sum(r.get("ctr", 0) for r in by_date) / len(by_date)) if by_date else 0
    avg_pos = (sum(r.get("position", 0) for r in by_date) / len(by_date)) if by_date else 0

    # Trend: compare first half vs second half
    mid = len(by_date) // 2
    first_half_clicks = sum(r.get("clicks", 0) for r in by_date[:mid])
    second_half_clicks = sum(r.get("clicks", 0) for r in by_date[mid:])
    trend = "صعودی" if second_half_clicks > first_half_clicks else "نزولی"

    # Top 5 queries, pages, countries
    top_queries = sorted(by_query, key=lambda x: x.get("clicks", 0), reverse=True)[:5]
    top_pages = sorted(by_page, key=lambda x: x.get("clicks", 0), reverse=True)[:5]
    top_countries = sorted(by_country, key=lambda x: x.get("clicks", 0), reverse=True)[:5]

    # Health score (0-100)
    health = 50
    if avg_pos < 5:
        health += 15
    elif avg_pos < 7:
        health += 10
    if avg_ctr > 4:
        health += 15
    elif avg_ctr > 2:
        health += 5
    if trend == "صعودی":
        health += 10
    if total_clicks > 50000:
        health += 10
    health = min(100, health)

    # Recommendations from data
    recs = []
    if by_device:
        mobile = next((r for r in by_device if "mobile" in str(r.get("device", "")).lower()), None)
        if mobile and mobile.get("clicks", 0) < total_clicks * 0.3:
            recs.append("ترافیک موبایل کمتر از ۳۰٪ - بهینه‌سازی موبایل را تقویت کنید")
    if avg_pos > 7:
        recs.append("میانگین رتبه بالای ۷ - روی بهبود محتوا و لینک‌سازی تمرکز کنید")
    if avg_ctr < 3:
        recs.append("CTR پایین - تایتل و متا دیسکریپشن را جذاب‌تر کنید")
    if not recs:
        recs.append("وضعیت کلی خوب - ادامه روند فعلی")

    # Dashboard content - professional layout
    meta = data.get("meta", {}) or {}
    n_dates = len(by_date)
    spark_range = f"Performance_by_Date!C2:C{n_dates+1}" if n_dates else ""
    dash_values = [
        ["داشبورد سئو املاین | amline.ir", ""],
        [f"بازه گزارش: {date_str_to_jalali(meta.get('startDate', ''))} تا {date_str_to_jalali(meta.get('endDate', ''))}", ""],
        ["", ""],
        ["▸ شاخص‌های کلیدی عملکرد", ""],
        ["کل کلیک‌ها", total_clicks],
        ["کل نمایش (ایمپرشن)", total_imp],
        ["میانگین CTR (%)", round(avg_ctr, 2)],
        ["میانگین رتبه", round(avg_pos, 2)],
        ["روند ترافیک", trend],
        ["امتیاز سلامت سئو", f"{health}/100"],
        ["روند کلیک", f'=SPARKLINE({spark_range})' if spark_range else ""],
        ["", ""],
        ["▸ توزیع دستگاه", ""],
    ]
    for r in by_device[:5]:
        dash_values.append([str(r.get("device", "")), r.get("clicks", 0)])

    dash_values.extend([
        ["", ""],
        ["▸ کلمات کلیدی برتر (Top 5)", "کلیک"],
    ])
    for r in top_queries:
        dash_values.append([str(r.get("query", ""))[:50], r.get("clicks", 0)])

    dash_values.extend([
        ["", ""],
        ["▸ صفحات برتر (Top 5)", "کلیک"],
    ])
    for r in top_pages:
        url = str(r.get("page", ""))
        dash_values.append([url.split("/")[-2] if "/" in url else url[:40], r.get("clicks", 0)])

    dash_values.extend([
        ["", ""],
        ["▸ کشورهای برتر (Top 5)", "کلیک"],
    ])
    for r in top_countries:
        dash_values.append([str(r.get("country", "")), r.get("clicks", 0)])

    dash_values.extend([
        ["", ""],
        ["▸ توصیه‌های عملیاتی", ""],
    ])
    for r in recs:
        dash_values.append([r, ""])

    # Write dashboard
    body = {"values": dash_values}
    service.spreadsheets().values().update(
        spreadsheetId=SHEET_ID,
        range="'Dashboard'!A1",
        valueInputOption="USER_ENTERED",
        body=body,
    ).execute()

    # Batch update: formatting, merge, charts - Professional UI/UX
    requests = []

    # Merge title row (A1:B1) and subtitle row (A2:B2)
    requests.append({
        "mergeCells": {
            "range": {"sheetId": dash_id, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 2},
            "mergeType": "MERGE_ALL",
        }
    })
    requests.append({
        "mergeCells": {
            "range": {"sheetId": dash_id, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": 2},
            "mergeType": "MERGE_ALL",
        }
    })

    # Title: dark blue, white text, 18pt, bold
    requests.append({
        "repeatCell": {
            "range": {"sheetId": dash_id, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 2},
            "cell": {"userEnteredFormat": {
                "backgroundColor": {"red": 0.09, "green": 0.18, "blue": 0.35},
                "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 18, "bold": True},
                "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
                "wrapStrategy": "WRAP"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
        }
    })

    # Subtitle row (date range)
    requests.append({
        "repeatCell": {
            "range": {"sheetId": dash_id, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": 2},
            "cell": {"userEnteredFormat": {
                "backgroundColor": {"red": 0.95, "green": 0.96, "blue": 0.98},
                "textFormat": {"foregroundColor": {"red": 0.3, "green": 0.3, "blue": 0.35}, "fontSize": 10},
                "horizontalAlignment": "CENTER"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        }
    })

    # Section headers (▸ rows): teal accent, bold, 11pt
    section_rows = [3, 13, 20, 27, 34, 41]
    for row in section_rows:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": dash_id, "startRowIndex": row, "endRowIndex": row + 1, "startColumnIndex": 0, "endColumnIndex": 2},
                "cell": {"userEnteredFormat": {
                    "backgroundColor": {"red": 0.85, "green": 0.92, "blue": 0.95},
                    "textFormat": {"foregroundColor": {"red": 0.1, "green": 0.35, "blue": 0.45}, "fontSize": 11, "bold": True},
                    "horizontalAlignment": "LEFT"
                }},
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
            }
        })

    # KPI values: alternating light rows, 10pt
    requests.append({
        "repeatCell": {
            "range": {"sheetId": dash_id, "startRowIndex": 4, "endRowIndex": 12, "startColumnIndex": 0, "endColumnIndex": 2},
            "cell": {"userEnteredFormat": {
                "backgroundColor": {"red": 1, "green": 0.99, "blue": 0.98},
                "textFormat": {"fontSize": 10},
                "verticalAlignment": "MIDDLE"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
        }
    })

    # Data rows: clean white
    requests.append({
        "repeatCell": {
            "range": {"sheetId": dash_id, "startRowIndex": 13, "endRowIndex": 60, "startColumnIndex": 0, "endColumnIndex": 2},
            "cell": {"userEnteredFormat": {
                "backgroundColor": {"red": 1, "green": 1, "blue": 1},
                "textFormat": {"fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)",
        }
    })

    # Column widths
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": dash_id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 380},
            "fields": "pixelSize",
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": dash_id, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2},
            "properties": {"pixelSize": 140},
            "fields": "pixelSize",
        }
    })

    # Row heights for title and subtitle
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": dash_id, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 44},
            "fields": "pixelSize",
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": dash_id, "dimension": "ROWS", "startIndex": 1, "endIndex": 2},
            "properties": {"pixelSize": 28},
            "fields": "pixelSize",
        }
    })

    # Borders: KPI box (rows 3-11)
    requests.append({
        "updateBorders": {
            "range": {"sheetId": dash_id, "startRowIndex": 3, "endRowIndex": 12, "startColumnIndex": 0, "endColumnIndex": 2},
            "top": {"style": "SOLID", "width": 1, "color": {"red": 0.7, "green": 0.75, "blue": 0.8}},
            "bottom": {"style": "SOLID", "width": 1, "color": {"red": 0.7, "green": 0.75, "blue": 0.8}},
            "left": {"style": "SOLID", "width": 1, "color": {"red": 0.7, "green": 0.75, "blue": 0.8}},
            "right": {"style": "SOLID", "width": 1, "color": {"red": 0.7, "green": 0.75, "blue": 0.8}},
            "innerHorizontal": {"style": "SOLID", "width": 1, "color": {"red": 0.9, "green": 0.92, "blue": 0.94}},
            "innerVertical": {"style": "SOLID", "width": 1, "color": {"red": 0.9, "green": 0.92, "blue": 0.94}},
        }
    })

    # Number format for value column (B): thousand separator
    requests.append({
        "repeatCell": {
            "range": {"sheetId": dash_id, "startRowIndex": 4, "endRowIndex": 60, "startColumnIndex": 1, "endColumnIndex": 2},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "NUMBER", "pattern": "#,##0"}}},
            "fields": "userEnteredFormat.numberFormat",
        }
    })

    # Add chart - Line chart for clicks over time (needs Performance_by_Date)
    if perf_id is not None and len(by_date) > 5:
        n = min(len(by_date) + 1, 100)
        requests.append({
                "addChart": {
                    "chart": {
                        "spec": {
                            "title": "روند کلیک و ایمپرشن",
                            "basicChart": {
                                "chartType": "LINE",
                                "legendPosition": "BOTTOM_LEGEND",
                                "axis": [
                                    {"position": "BOTTOM_AXIS", "title": "تاریخ"},
                                    {"position": "LEFT_AXIS", "title": "مقدار"},
                                ],
                                "domains": [{
                                    "domain": {
                                        "sourceRange": {
                                            "sources": [{"sheetId": perf_id, "startRowIndex": 0, "endRowIndex": n, "startColumnIndex": 0, "endColumnIndex": 1}]
                                        }
                                    }
                                }],
                                "series": [
                                    {
                                        "series": {
                                            "sourceRange": {
                                                "sources": [{"sheetId": perf_id, "startRowIndex": 0, "endRowIndex": n, "startColumnIndex": 1, "endColumnIndex": 2}]
                                            }
                                        },
                                        "targetAxis": "LEFT_AXIS",
                                    },
                                    {
                                        "series": {
                                            "sourceRange": {
                                                "sources": [{"sheetId": perf_id, "startRowIndex": 0, "endRowIndex": n, "startColumnIndex": 2, "endColumnIndex": 3}]
                                            }
                                        },
                                        "targetAxis": "LEFT_AXIS",
                                    },
                                ],
                                "headerCount": 1,
                            }
                        },
                        "position": {"overlayPosition": {"anchorCell": {"sheetId": dash_id, "rowIndex": 0, "columnIndex": 2}, "widthPixels": 400, "heightPixels": 250}},
                    }
                }
            })

    # Add pie chart for device distribution
    if device_id is not None and len(by_device) > 0:
        n = min(len(by_device) + 1, 10)
        requests.append({
            "addChart": {
                    "chart": {
                        "spec": {
                            "title": "توزیع دستگاه",
                            "pieChart": {
                                "legendPosition": "RIGHT_LEGEND",
                                "domain": {
                                    "sourceRange": {
                                        "sources": [{"sheetId": device_id, "startRowIndex": 0, "endRowIndex": n, "startColumnIndex": 0, "endColumnIndex": 1}]
                                    }
                                },
                                "series": {
                                    "sourceRange": {
                                        "sources": [{"sheetId": device_id, "startRowIndex": 0, "endRowIndex": n, "startColumnIndex": 1, "endColumnIndex": 2}]
                                    }
                                },
                            }
                        },
                        "position": {"overlayPosition": {"anchorCell": {"sheetId": dash_id, "rowIndex": 0, "columnIndex": 6}, "widthPixels": 300, "heightPixels": 200}},
                }
            }
        })

    # Move Dashboard to first position
    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": dash_id, "index": 0},
            "fields": "index",
        }
    })

    # Conditional formatting on Queries - highlight top CTR
    if queries_id is not None:
        requests.append({
            "addConditionalFormatRule": {
                "rule": {
                    "ranges": [{"sheetId": queries_id, "startRowIndex": 1, "endRowIndex": 100, "startColumnIndex": 3, "endColumnIndex": 4}],
                    "gradientRule": {
                        "minpoint": {"color": {"red": 1, "green": 1, "blue": 1}, "type": "MIN"},
                        "midpoint": {"color": {"red": 1, "green": 0.9, "blue": 0.7}, "type": "NUMBER", "value": "5"},
                        "maxpoint": {"color": {"red": 0.2, "green": 0.8, "blue": 0.4}, "type": "MAX"},
                    }
                },
                "index": 0
            }
        })

    # Conditional formatting on Pages - highlight position (green = good/low number)
    if pages_id is not None:
        requests.append({
            "addConditionalFormatRule": {
                "rule": {
                    "ranges": [{"sheetId": pages_id, "startRowIndex": 1, "endRowIndex": 100, "startColumnIndex": 4, "endColumnIndex": 5}],
                    "gradientRule": {
                        "minpoint": {"color": {"red": 0.2, "green": 0.8, "blue": 0.4}, "type": "MIN"},
                        "maxpoint": {"color": {"red": 1, "green": 0.5, "blue": 0.5}, "type": "MAX"},
                    }
                },
                "index": 0
            }
        })

    if requests:
        service.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": requests}).execute()

    # --- Manager Dashboard: Campaign, User Entry, Summary ---
    _add_manager_sheets(service, data, total_clicks, total_imp, by_date)

    print("Dashboard applied.")
    print("Sheet:", f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit")


def _add_manager_sheets(service, data, total_clicks, total_imp, by_date):
    """Add campaign, user entry, and manager summary sheets."""
    # 1) کمپین_تبلیغاتی - Campaign template
    campaign_headers = [
        ["تاریخ_شروع", "تاریخ_پایان", "نام_کمپین", "هزینه", "کلیک", "نمایش", "لاگین", "خرید", "درآمد"],
        ["مثال: 1404/01/01", "1404/01/15", "کمپین بهمن", "5000000", "1200", "50000", "80", "5", "15000000"],
    ]
    ensure_sheet(service, "کمپین_تبلیغاتی")
    service.spreadsheets().values().update(
        spreadsheetId=SHEET_ID,
        range="'کمپین_تبلیغاتی'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": campaign_headers},
    ).execute()

    # 2) ورود_کاربران - User entry by source (weekly or daily)
    user_headers = [
        ["تاریخ", "ارگانیک", "کمپین", "مستقیم", "سایر", "کل"],
        ["1404/01/01", "100", "50", "80", "20", "=B2+C2+D2+E2"],
        ["از ردیف ۲: تعداد لاگین/ورود از هر منبع را وارد کنید. ستون کل خودکار محاسبه می\u200cشود.", "", "", "", "", ""],
    ]
    ensure_sheet(service, "ورود_کاربران")
    service.spreadsheets().values().update(
        spreadsheetId=SHEET_ID,
        range="'ورود_کاربران'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": user_headers},
    ).execute()

    # 3) خلاصه_مدیر - Manager Summary with formulas
    meta = data.get("meta", {}) or {}
    start_d = date_str_to_jalali(meta.get("startDate", ""))
    end_d = date_str_to_jalali(meta.get("endDate", ""))
    manager_values = [
        ["داشبورد مدیریتی سئو | املاین", ""],
        [f"بازه: {start_d} تا {end_d}", ""],
        ["", ""],
        ["▸ بخش ۱: عملکرد ارگانیک (GSC)", ""],
        ["کل کلیک ارگانیک", total_clicks],
        ["کل نمایش ارگانیک", total_imp],
        ["", ""],
        ["▸ بخش ۲: تبلیغات و کمپین", ""],
        ["مجموع هزینه کمپین", "=SUM(کمپین_تبلیغاتی!D2:D100)"],
        ["مجموع کلیک کمپین", "=SUM(کمپین_تبلیغاتی!E2:E100)"],
        ["مجموع لاگین از کمپین", "=SUM(کمپین_تبلیغاتی!G2:G100)"],
        ["مجموع خرید از کمپین", "=SUM(کمپین_تبلیغاتی!H2:H100)"],
        ["مجموع درآمد کمپین", "=SUM(کمپین_تبلیغاتی!I2:I100)"],
        ["", ""],
        ["▸ بخش ۳: شاخص‌های هزینه", ""],
        ["CPC کمپین (هزینه/کلیک)", "=IF(SUM(کمپین_تبلیغاتی!E2:E100)>0, SUM(کمپین_تبلیغاتی!D2:D100)/SUM(کمپین_تبلیغاتی!E2:E100), 0)"],
        ["CPA کمپین (هزینه/خرید)", "=IF(SUM(کمپین_تبلیغاتی!H2:H100)>0, SUM(کمپین_تبلیغاتی!D2:D100)/SUM(کمپین_تبلیغاتی!H2:H100), 0)"],
        ["CPM کمپین", "=IF(SUM(کمپین_تبلیغاتی!F2:F100)>0, (SUM(کمپین_تبلیغاتی!D2:D100)/SUM(کمپین_تبلیغاتی!F2:F100))*1000, 0)"],
        ["ROAS (درآمد/هزینه)", "=IF(SUM(کمپین_تبلیغاتی!D2:D100)>0, SUM(کمپین_تبلیغاتی!I2:I100)/SUM(کمپین_تبلیغاتی!D2:D100), 0)"],
        ["", ""],
        ["▸ بخش ۴: مقایسه ارگانیک و کمپین", ""],
        ["نسبت کلیک ارگانیک به کمپین", "=IF(SUM(کمپین_تبلیغاتی!E2:E100)>0, " + str(total_clicks) + "/SUM(کمپین_تبلیغاتی!E2:E100), \"-\")"],
        ["درصد ارگانیک از کل ورود", "=IF(SUM(ورود_کاربران!F2:F100)>0, SUM(ورود_کاربران!B2:B100)/SUM(ورود_کاربران!F2:F100), 0)"],
        ["درصد کمپین از کل ورود", "=IF(SUM(ورود_کاربران!F2:F100)>0, SUM(ورود_کاربران!C2:C100)/SUM(ورود_کاربران!F2:F100), 0)"],
        ["درصد مستقیم از کل ورود", "=IF(SUM(ورود_کاربران!F2:F100)>0, SUM(ورود_کاربران!D2:D100)/SUM(ورود_کاربران!F2:F100), 0)"],
        ["", ""],
        ["راهنما: داده‌های کمپین و ورود کاربران را در شیت‌های مربوطه وارد کنید.", ""],
    ]
    # Fix formula - can't embed Python var in string that way
    manager_values[21][1] = f'=IF(SUM(کمپین_تبلیغاتی!E2:E100)>0, {total_clicks}/SUM(کمپین_تبلیغاتی!E2:E100), "-")'

    ensure_sheet(service, "خلاصه_مدیر")
    service.spreadsheets().values().update(
        spreadsheetId=SHEET_ID,
        range="'خلاصه_مدیر'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": manager_values},
    ).execute()

    # Format manager sheet - match Dashboard style
    mgr_id = get_sheet_ids(service).get("خلاصه_مدیر")
    if mgr_id is not None:
        mgr_requests = [
            {"mergeCells": {"range": {"sheetId": mgr_id, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 2}, "mergeType": "MERGE_ALL"}},
            {"mergeCells": {"range": {"sheetId": mgr_id, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": 2}, "mergeType": "MERGE_ALL"}},
            {"repeatCell": {"range": {"sheetId": mgr_id, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 2}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.09, "green": 0.18, "blue": 0.35}, "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 18, "bold": True}, "horizontalAlignment": "CENTER"}}, "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"}},
            {"repeatCell": {"range": {"sheetId": mgr_id, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": 2}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.95, "green": 0.96, "blue": 0.98}, "textFormat": {"foregroundColor": {"red": 0.3, "green": 0.3, "blue": 0.35}, "fontSize": 10}, "horizontalAlignment": "CENTER"}}, "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"}},
            {"updateDimensionProperties": {"range": {"sheetId": mgr_id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1}, "properties": {"pixelSize": 320}, "fields": "pixelSize"}},
            {"updateDimensionProperties": {"range": {"sheetId": mgr_id, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2}, "properties": {"pixelSize": 140}, "fields": "pixelSize"}},
        ]
        section_rows = [3, 7, 14, 20]
        for row in section_rows:
            mgr_requests.append({"repeatCell": {"range": {"sheetId": mgr_id, "startRowIndex": row, "endRowIndex": row + 1, "startColumnIndex": 0, "endColumnIndex": 2}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.85, "green": 0.92, "blue": 0.95}, "textFormat": {"foregroundColor": {"red": 0.1, "green": 0.35, "blue": 0.45}, "fontSize": 11, "bold": True}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}})
        mgr_requests.append({"repeatCell": {"range": {"sheetId": mgr_id, "startRowIndex": 4, "endRowIndex": 27, "startColumnIndex": 0, "endColumnIndex": 2}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 1, "green": 0.99, "blue": 0.98}, "textFormat": {"fontSize": 10}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}})
        mgr_requests.append({"repeatCell": {"range": {"sheetId": mgr_id, "startRowIndex": 4, "endRowIndex": 27, "startColumnIndex": 1, "endColumnIndex": 2}, "cell": {"userEnteredFormat": {"numberFormat": {"type": "NUMBER", "pattern": "#,##0.##"}}}, "fields": "userEnteredFormat.numberFormat"}})
        service.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": mgr_requests}).execute()


if __name__ == "__main__":
    main()
