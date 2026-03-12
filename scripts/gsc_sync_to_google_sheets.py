"""
Sync GSC data to Google Sheets - online, updatable.
Run this script whenever you want fresh data in the sheet.

Setup:
1. Enable Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com
2. Create a new Google Sheet at sheets.google.com
3. Share it with: amline-seo@trans-sunset-489406-d1.iam.gserviceaccount.com (Editor)
4. Copy Sheet ID from URL: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
5. Set: GSC_SHEET_ID=SHEET_ID_HERE (env var or edit below)
"""
import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_FILE = os.environ.get("GSC_KEY_FILE")
if not KEY_FILE:
    raise ValueError("GSC_KEY_FILE environment variable is required")
KEY_FILE = os.path.abspath(KEY_FILE)
if not KEY_FILE or not os.path.isfile(KEY_FILE):
    raise FileNotFoundError(f"Key file not found: {KEY_FILE}")

SHEET_ID = os.environ.get("GSC_SHEET_ID", "1qFynl6JMLbT55ucqXe2zQ7w710JCpkhlxHYvZDC8oEA").strip()
from gsc_paths import GSC_DATA_DIR
from gsc_jalali import date_str_to_jalali

GSC_JSON = os.path.join(GSC_DATA_DIR, "gsc_full_export.json")

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def build_sheets_service():
    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def rows_to_values(rows):
    """Convert list of dicts to 2D array for Sheets (first row = headers)."""
    if not rows:
        return []
    headers = list(rows[0].keys())
    out = [headers]
    for r in rows:
        out.append([_cell_val(r.get(h)) for h in headers])
    return out


def _cell_val(v):
    if v is None:
        return ""
    if isinstance(v, (list, dict)):
        return json.dumps(v, ensure_ascii=False)
    return v


def flatten_sitemap(s):
    if isinstance(s, dict):
        out = {
            "path": s.get("path"), "lastSubmitted": s.get("lastSubmitted"),
            "lastDownloaded": s.get("lastDownloaded"), "warnings": s.get("warnings"),
            "errors": s.get("errors"), "type": s.get("type"),
        }
        for i, c in enumerate(s.get("contents") or []):
            if isinstance(c, dict):
                out[f"content_type_{i}"] = c.get("type")
                out[f"content_submitted_{i}"] = c.get("submitted")
                out[f"content_indexed_{i}"] = c.get("indexed")
        return out
    return {"path": str(s)}


def flatten_inspection(url, data):
    if isinstance(data, dict) and "error" in data:
        return {"url": url, "error": data["error"]}
    idx = (data or {}).get("indexStatusResult") or {}
    return {
        "url": url, "indexingState": idx.get("indexingState"),
        "coverageState": idx.get("coverageState"), "lastCrawlTime": idx.get("lastCrawlTime"),
        "robotsTxtState": idx.get("robotsTxtState"), "verdict": idx.get("verdict"),
    }


def ensure_sheet(service, spreadsheet_id, title):
    """Get or create sheet by title. Returns sheet_id (gid)."""
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    for s in meta.get("sheets", []):
        if s["properties"]["title"] == title:
            return s["properties"]["sheetId"]
    req = {"requests": [{"addSheet": {"properties": {"title": title[:100]}}}]}
    res = service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=req).execute()
    return res["replies"][0]["addSheet"]["properties"]["sheetId"]


def write_sheet(service, spreadsheet_id, sheet_title, rows):
    """Write rows to sheet (clear + update)."""
    values = rows_to_values(rows)
    if not values:
        return
    ensure_sheet(service, spreadsheet_id, sheet_title)
    range_name = f"'{sheet_title}'!A1"
    body = {"values": values}
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_name,
        valueInputOption="USER_ENTERED",
        body=body,
    ).execute()
    # Clear extra rows if we're overwriting with fewer
    rows_count = len(values)
    if rows_count < 1000:  # avoid huge clear
        clear_range = f"'{sheet_title}'!A{rows_count+1}:Z1000"
        try:
            service.spreadsheets().values().clear(
                spreadsheetId=spreadsheet_id, range=clear_range
            ).execute()
        except Exception:
            pass


def main():
    if not SHEET_ID:
        print("GSC_SHEET_ID not set!")
        print("1. Create Google Sheet: https://sheets.google.com")
        print("2. Share with: amline-seo@trans-sunset-489406-d1.iam.gserviceaccount.com (Editor)")
        print("3. Copy ID from URL: .../d/XXXXX/edit")
        print("4. Run: set GSC_SHEET_ID=XXXXX  (Windows) or export GSC_SHEET_ID=XXXXX (Linux/Mac)")
        print("   Or edit this script and set SHEET_ID = 'XXXXX'")
        return

    if not os.path.isfile(GSC_JSON):
        print("Run gsc_export_all.py first to create", GSC_JSON)
        return

    with open(GSC_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    service = build_sheets_service()

    # Meta
    meta = data.get("meta") or {}
    meta_rows = [{"key": k, "value": str(v)} for k, v in meta.items()]
    write_sheet(service, SHEET_ID, "Meta", meta_rows)

    # Instructions + full script for copy-paste
    gs_path = os.path.join(GSC_DATA_DIR, "GSC_Refresh_AppsScript.gs")
    if os.path.isfile(gs_path):
        with open(gs_path, "r", encoding="utf-8") as f:
            script_content = f.read()
        # Put script in sheet for easy copy
        write_sheet(service, SHEET_ID, "کد_Apps_Script", [{"instruction": "کد زیر را کپی کنید و در Extensions > Apps Script > Code.gs جایگزین کنید."}, {"code": script_content}])
    instructions = [
        {"step": 1, "action": "Extensions > Apps Script را باز کنید"},
        {"step": 2, "action": "از شیت کد_Apps_Script سلول B2 را کپی و در Code.gs paste کنید"},
        {"step": 3, "action": "ذخیره (Ctrl+S) و یک بار refreshGSCData را Run کنید (برای مجوز)"},
        {"step": 4, "action": "Insert > Drawing > یک دکمه با متن Refresh بسازید"},
        {"step": 5, "action": "روی دکمه راست\u200cکلیک > Assign script > refreshGSCData"},
        {"step": 6, "action": "از این پس با کلیک یا منوی GSC داده\u200cها به\u200cروز می\u200cشوند"},
    ]
    write_sheet(service, SHEET_ID, "راهنما_کلیک_به\u200cروز", instructions)

    # Sites
    sites = data.get("sites")
    if isinstance(sites, list) and sites:
        write_sheet(service, SHEET_ID, "Sites", sites)
    elif isinstance(sites, dict):
        write_sheet(service, SHEET_ID, "Sites", [{"error": sites.get("error", "")}])

    # Sitemaps
    sitemaps = data.get("sitemaps")
    if isinstance(sitemaps, list) and sitemaps:
        write_sheet(service, SHEET_ID, "Sitemaps", [flatten_sitemap(s) for s in sitemaps])
    elif isinstance(sitemaps, dict):
        write_sheet(service, SHEET_ID, "Sitemaps", [{"error": sitemaps.get("error", "")}])

    def _rows_with_jalali_date(rows, date_key="date"):
        if not rows:
            return []
        return [{**r, date_key: date_str_to_jalali(r.get(date_key, ""))} for r in rows]

    # Search Analytics
    sa = data.get("searchAnalytics") or {}
    sheets_data = [
        ("Performance_by_Date", _rows_with_jalali_date(sa.get("by_date") or [])),
        ("Queries", sa.get("by_query")),
        ("Pages", sa.get("by_page")),
        ("By_Country", sa.get("by_country")),
        ("By_Device", sa.get("by_device")),
        ("Date_Device", _rows_with_jalali_date(sa.get("by_date_and_device") or [])),
        ("Date_Country", _rows_with_jalali_date(sa.get("by_date_and_country") or [])),
        ("Query_Page", sa.get("by_query_and_page")),
    ]
    for name, rows in sheets_data:
        if isinstance(rows, list) and rows:
            write_sheet(service, SHEET_ID, name, rows)
            print("Wrote", name, len(rows), "rows")

    # URL Inspection
    insp = data.get("urlInspection") or {}
    if insp and "_error" not in str(insp.get("_error", "")):
        rows = [flatten_inspection(url, insp[url]) for url in insp if not url.startswith("_")]
        if rows:
            write_sheet(service, SHEET_ID, "URL_Inspection", rows)

    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"
    print("\nDone. Sheet updated:", url)
    print("Run this script again after gsc_export_all.py to refresh data.")


if __name__ == "__main__":
    main()
