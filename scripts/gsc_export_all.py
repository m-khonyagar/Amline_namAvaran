"""
Export ALL available Google Search Console data into a single JSON file.
Includes: Search Analytics (all dimensions), Sitemaps, Sites, and optional URL Inspection sample.
"""
import os
import json
from datetime import datetime, timedelta, timezone
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_FILE = os.environ.get("GSC_KEY_FILE")
if not KEY_FILE:
    raise ValueError("GSC_KEY_FILE environment variable is required")
KEY_FILE = os.path.abspath(KEY_FILE)
if not KEY_FILE or not os.path.isfile(KEY_FILE):
    raise FileNotFoundError(f"Key file not found: {KEY_FILE}")

SITE_URL = "https://amline.ir/"
from gsc_paths import GSC_DATA_DIR
OUTPUT_DIR = GSC_DATA_DIR
SINGLE_OUTPUT_FILE = "gsc_full_export.json"

END_DATE = datetime.now(timezone.utc).date()
START_DATE = END_DATE - timedelta(days=90)


def build_service():
    return build("searchconsole", "v1", credentials=service_account.Credentials.from_service_account_file(KEY_FILE))


def run_search_analytics(service, dimensions, row_limit=2500, start_row=0):
    body = {
        "startDate": START_DATE.isoformat(),
        "endDate": END_DATE.isoformat(),
        "dimensions": dimensions,
        "rowLimit": min(row_limit, 25000),
        "startRow": start_row,
    }
    try:
        return service.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()
    except Exception as e:
        return {"error": str(e), "rows": []}


def rows_to_list(response, key_names):
    out = []
    for row in response.get("rows", []):
        r = {}
        for i, k in enumerate(key_names):
            r[k] = row["keys"][i] if i < len(row["keys"]) else ""
        r["clicks"] = row.get("clicks", 0)
        r["impressions"] = row.get("impressions", 0)
        r["ctr"] = round(row.get("ctr", 0) * 100, 4)
        r["position"] = round(row.get("position", 0), 2)
        out.append(r)
    return out


def fetch_all_queries(service):
    """Paginate to get more than 1000 queries if available."""
    all_rows = []
    start = 0
    limit = 2500
    while True:
        resp = run_search_analytics(service, ["query"], row_limit=limit, start_row=start)
        if "error" in resp:
            break
        rows = resp.get("rows", [])
        if not rows:
            break
        all_rows.extend(rows_to_list({"rows": rows}, ["query"]))
        if len(rows) < limit:
            break
        start += limit
    return all_rows


def main():
    print("GSC full export for", SITE_URL)
    print("Date range:", START_DATE, "to", END_DATE)
    service = build_service()

    export = {
        "meta": {
            "siteUrl": SITE_URL,
            "startDate": str(START_DATE),
            "endDate": str(END_DATE),
            "exportedAt": datetime.now(timezone.utc).isoformat(),
        },
        "sites": None,
        "sitemaps": None,
        "searchAnalytics": {
            "by_date": [],
            "by_query": [],
            "by_page": [],
            "by_country": [],
            "by_device": [],
            "by_searchAppearance": [],
            "by_date_and_device": [],
            "by_date_and_country": [],
            "by_query_and_page": [],
        },
        "urlInspection": {},
    }

    # --- Sites ---
    print("Fetching sites...")
    try:
        site_list = service.sites().list().execute()
        export["sites"] = site_list.get("siteEntry", [])
    except Exception as e:
        export["sites"] = {"error": str(e)}

    # --- Sitemaps ---
    print("Fetching sitemaps...")
    try:
        sitemaps = service.sitemaps().list(siteUrl=SITE_URL).execute()
        export["sitemaps"] = sitemaps.get("sitemap", [])
    except Exception as e:
        export["sitemaps"] = {"error": str(e)}

    # --- Search Analytics: by date ---
    print("Fetching by date...")
    r = run_search_analytics(service, ["date"])
    export["searchAnalytics"]["by_date"] = rows_to_list(r, ["date"])

    # --- Search Analytics: by query (max rows) ---
    print("Fetching by query...")
    export["searchAnalytics"]["by_query"] = fetch_all_queries(service)
    if not export["searchAnalytics"]["by_query"]:
        r = run_search_analytics(service, ["query"], row_limit=2500)
        export["searchAnalytics"]["by_query"] = rows_to_list(r, ["query"])

    # --- Search Analytics: by page ---
    print("Fetching by page...")
    r = run_search_analytics(service, ["page"], row_limit=2500)
    export["searchAnalytics"]["by_page"] = rows_to_list(r, ["page"])

    # --- Search Analytics: by country ---
    print("Fetching by country...")
    r = run_search_analytics(service, ["country"], row_limit=500)
    export["searchAnalytics"]["by_country"] = rows_to_list(r, ["country"])

    # --- Search Analytics: by device ---
    print("Fetching by device...")
    r = run_search_analytics(service, ["device"], row_limit=100)
    export["searchAnalytics"]["by_device"] = rows_to_list(r, ["device"])

    # --- Search Analytics: by searchAppearance ---
    print("Fetching by searchAppearance...")
    r = run_search_analytics(service, ["searchAppearance"], row_limit=100)
    export["searchAnalytics"]["by_searchAppearance"] = rows_to_list(r, ["searchAppearance"])

    # --- Search Analytics: by date + device ---
    print("Fetching by date + device...")
    r = run_search_analytics(service, ["date", "device"], row_limit=2000)
    export["searchAnalytics"]["by_date_and_device"] = rows_to_list(r, ["date", "device"])

    # --- Search Analytics: by date + country (sample) ---
    print("Fetching by date + country...")
    r = run_search_analytics(service, ["date", "country"], row_limit=3000)
    export["searchAnalytics"]["by_date_and_country"] = rows_to_list(r, ["date", "country"])

    # --- Search Analytics: by query + page (top combinations) ---
    print("Fetching by query + page...")
    r = run_search_analytics(service, ["query", "page"], row_limit=2000)
    export["searchAnalytics"]["by_query_and_page"] = rows_to_list(r, ["query", "page"])

    # --- URL Inspection (homepage + first 2 top pages) ---
    urls_to_inspect = [SITE_URL.rstrip("/") + "/"]
    for p in export["searchAnalytics"]["by_page"][:2]:
        url = p.get("page") or ""
        if url and url not in urls_to_inspect:
            urls_to_inspect.append(url)
    print("URL Inspection for", len(urls_to_inspect), "URLs...")
    try:
        url_inspection = service.urlInspection().index()
        for url in urls_to_inspect:
            try:
                body = {"inspectionUrl": url, "siteUrl": SITE_URL}
                result = url_inspection.inspect(body=body).execute()
                export["urlInspection"][url] = result
            except Exception as e:
                export["urlInspection"][url] = {"error": str(e)}
    except Exception as e:
        export["urlInspection"] = {"_error": str(e)}

    # --- Write single file ---
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, SINGLE_OUTPUT_FILE)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(export, f, ensure_ascii=False, indent=2)
    print("\nSaved single file:", os.path.abspath(out_path))

    # Summary
    sa = export["searchAnalytics"]
    print("Summary:")
    print("  by_date rows:", len(sa["by_date"]))
    print("  by_query rows:", len(sa["by_query"]))
    print("  by_page rows:", len(sa["by_page"]))
    print("  by_country rows:", len(sa["by_country"]))
    print("  by_device rows:", len(sa["by_device"]))
    print("  by_searchAppearance rows:", len(sa["by_searchAppearance"]))
    print("  by_date_and_device rows:", len(sa["by_date_and_device"]))
    print("  by_date_and_country rows:", len(sa["by_date_and_country"]))
    print("  by_query_and_page rows:", len(sa["by_query_and_page"]))
    print("  sitemaps count:", len(export["sitemaps"]) if isinstance(export["sitemaps"], list) else "N/A")
    print("  urlInspection keys:", list(export["urlInspection"].keys()))


if __name__ == "__main__":
    main()
