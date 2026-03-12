"""
Merge campaign data from Amline campaign sheet into the main GSC report.
Campaign sheet: https://docs.google.com/spreadsheets/d/1vLXDmdrP4_JpUxwzair-1Jz6uJuYoyQzzadXfRY0gls/edit

Required: Share the campaign sheet with amline-seo@trans-sunset-489406-d1.iam.gserviceaccount.com (Viewer)
"""
import os
import re
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_FILE = os.environ.get("GSC_KEY_FILE")
if not KEY_FILE:
    raise ValueError("GSC_KEY_FILE environment variable is required")
KEY_FILE = os.path.abspath(KEY_FILE)
MAIN_SHEET_ID = "1qFynl6JMLbT55ucqXe2zQ7w710JCpkhlxHYvZDC8oEA"
CAMPAIGN_SHEET_ID = "1vLXDmdrP4_JpUxwzair-1Jz6uJuYoyQzzadXfRY0gls"

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Map campaign sheet columns to our format (0-based index or header match)
OUR_COLS = ["تاریخ_شروع", "تاریخ_پایان", "نام_کمپین", "هزینه", "کلیک", "نمایش", "لاگین", "خرید", "درآمد"]
HEADER_ALIASES = {
    3: ["هزینه", "cost", "مبلغ", "بودجه", "قیمت"],
    4: ["کلیک", "click", "clicks"],
    5: ["نمایش", "impression", "impressions", "ایمپرشن", "view"],
    6: ["لاگین", "login", "ثبت\u200cنام", "کاربر", "user"],
    7: ["خرید", "purchase", "فروش", "تبدیل", "conversion"],
    8: ["درآمد", "revenue", "فروش", "درآمد"],
    2: ["نام", "name", "کمپین", "عنوان", "campaign"],
    0: ["تاریخ", "date", "شروع", "از"],
    1: ["تاریخ_پایان", "پایان", "تا", "end"],
}


def build_service():
    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def to_num(val):
    if val is None or val == "":
        return 0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(",", "").replace("٬", "").replace("،", "")
    m = re.search(r"[\d.]+", s)
    return float(m.group()) if m else 0


def find_col_index(headers, our_idx):
    aliases = HEADER_ALIASES.get(our_idx, [])
    for i, h in enumerate(headers):
        hnorm = str(h or "").strip().lower().replace(" ", "").replace("‌", "")
        for a in aliases:
            if a.lower().replace(" ", "") in hnorm or hnorm in a.lower().replace(" ", ""):
                return i
    return our_idx if our_idx < len(headers) else -1


def main():
    service = build_service()

    try:
        meta = service.spreadsheets().get(spreadsheetId=CAMPAIGN_SHEET_ID).execute()
    except Exception as e:
        print("No access to campaign sheet. Share it with: amline-seo@trans-sunset-489406-d1.iam.gserviceaccount.com")
        print("Using IMPORTRANGE formula instead...")
        _add_importrange(service)
        return

    sheets = meta.get("sheets", [])
    all_data = []

    for sh in sheets:
        title = sh["properties"]["title"]
        try:
            r = service.spreadsheets().values().get(
                spreadsheetId=CAMPAIGN_SHEET_ID,
                range=f"'{title}'!A1:Z1000",
            ).execute()
        except Exception:
            r = service.spreadsheets().values().get(
                spreadsheetId=CAMPAIGN_SHEET_ID,
                range=f"{title}!A1:Z1000",
            ).execute()

        values = r.get("values", [])
        if not values:
            continue

        headers = [str(v or "").strip() for v in values[0]]
        col_map = {}
        for our_idx in range(9):
            ci = find_col_index(headers, our_idx)
            col_map[our_idx] = ci if ci >= 0 else our_idx

        for row in values[1:]:
            if not any(str(c or "").strip() for c in row):
                continue
            out_row = []
            for our_idx in range(9):
                src_idx = col_map.get(our_idx, our_idx)
                val = row[src_idx] if src_idx < len(row) else ""
                if our_idx >= 3 and val != "":
                    val = to_num(val) if our_idx >= 3 else val
                out_row.append(val)
            all_data.append(out_row)

    if not all_data:
        # Fallback: copy raw
        for sh in sheets:
            title = sh["properties"]["title"]
            r = service.spreadsheets().values().get(
                spreadsheetId=CAMPAIGN_SHEET_ID,
                range=f"'{title}'!A1:Z500",
            ).execute()
            vals = r.get("values", [])
            if vals:
                all_data = vals
                break

    output = [OUR_COLS] + all_data

    # Ensure کمپین_تبلیغاتی exists
    main_meta = service.spreadsheets().get(spreadsheetId=MAIN_SHEET_ID).execute()
    if not any(s["properties"]["title"] == "کمپین_تبلیغاتی" for s in main_meta.get("sheets", [])):
        service.spreadsheets().batchUpdate(
            spreadsheetId=MAIN_SHEET_ID,
            body={"requests": [{"addSheet": {"properties": {"title": "کمپین_تبلیغاتی"}}}]},
        ).execute()

    service.spreadsheets().values().update(
        spreadsheetId=MAIN_SHEET_ID,
        range="'کمپین_تبلیغاتی'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": output},
    ).execute()

    print("Campaign merged. Rows:", len(all_data))
    print("Sheet:", f"https://docs.google.com/spreadsheets/d/{MAIN_SHEET_ID}/edit")


def _add_importrange(service):
    """Add IMPORTRANGE formula to pull campaign data. User must allow access once in Sheets."""
    # Try common sheet names - user may need to edit if different
    formulas = [
        ('=IMPORTRANGE("' + CAMPAIGN_SHEET_ID + '", "Sheet1!A:Z")', "Sheet1"),
        ('=IMPORTRANGE("' + CAMPAIGN_SHEET_ID + '", "\'Sheet1\'!A:Z")', "Sheet1 quoted"),
    ]
    formula = formulas[0][0]
    main_meta = service.spreadsheets().get(spreadsheetId=MAIN_SHEET_ID).execute()
    has_campaign = any(s["properties"]["title"] == "کمپین_تبلیغاتی" for s in main_meta.get("sheets", []))
    if not has_campaign:
        service.spreadsheets().batchUpdate(
            spreadsheetId=MAIN_SHEET_ID,
            body={"requests": [{"addSheet": {"properties": {"title": "کمپین_تبلیغاتی"}}}]},
        ).execute()
    service.spreadsheets().values().update(
        spreadsheetId=MAIN_SHEET_ID,
        range="'کمپین_تبلیغاتی'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": [[formula]]},
    ).execute()
    print("IMPORTRANGE added. Open sheet, allow access when prompted.")
    print("If no data: edit formula - change Sheet1 to your campaign sheet tab name.")
    print("Sheet:", f"https://docs.google.com/spreadsheets/d/{MAIN_SHEET_ID}/edit")


if __name__ == "__main__":
    main()
