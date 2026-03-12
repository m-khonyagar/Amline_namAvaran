"""
Fetch Google Search Console Performance data for amline.ir and save to CSV/JSON.

Usage:
    python gsc_fetch_data.py
    
Required environment variable:
    GSC_KEY_FILE - Path to your Google Service Account JSON key file
"""
import os
import json
import csv
import logging
from datetime import datetime, timedelta, timezone
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Import from central config
from gsc_config import get_key_file, get_data_dir, get_site_url, validate, get_gsc_service

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
OUTPUT_DIR = get_data_dir()
SITE_URL = get_site_url()

# Date range - last 90 days
END_DATE = datetime.now(timezone.utc).date()
START_DATE = END_DATE - timedelta(days=90)


def build_service():
    """Build authenticated GSC service."""
    credentials = service_account.Credentials.from_service_account_file(get_key_file())
    return build("searchconsole", "v1", credentials=credentials)


def run_query(service, dimensions, row_limit=1000, start_row=0):
    """Run a GSC query with specified dimensions."""
    body = {
        "startDate": START_DATE.isoformat(),
        "endDate": END_DATE.isoformat(),
        "dimensions": dimensions,
        "rowLimit": min(row_limit, 25000),
        "startRow": start_row,
    }
    return (
        service.searchanalytics()
        .query(siteUrl=SITE_URL, body=body)
        .execute()
    )


def rows_to_list(response, key_names):
    """Convert API response rows to list of dicts."""
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


def save_json(data, filename):
    """Save data to JSON file."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved: {path}")
    return path


def save_csv(rows, filename, fieldnames=None):
    """Save data to CSV file."""
    if not rows:
        return None
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    fieldnames = fieldnames or list(rows[0].keys())
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    logger.info(f"Saved: {path}")
    return path


def main():
    """Main entry point."""
    logger.info(f"GSC data fetch for {SITE_URL}")
    logger.info(f"Date range: {START_DATE} to {END_DATE}")
    logger.info(f"Output dir: {os.path.abspath(OUTPUT_DIR)}")
    
    # Validate configuration
    validate()
    
    service = build_service()

    all_data = {
        "meta": {"site": SITE_URL, "startDate": str(START_DATE), "endDate": str(END_DATE)}, 
        "by_date": [], 
        "by_query": [], 
        "by_page": []
    }

    # 1) By date (trend)
    logger.info("1. Fetching by date...")
    resp = run_query(service, ["date"])
    by_date = rows_to_list(resp, ["date"])
    all_data["by_date"] = by_date
    save_json(by_date, "performance_by_date.json")
    save_csv(by_date, "performance_by_date.csv")

    # 2) By query (keywords) - top 1000
    logger.info("2. Fetching by query (keywords)...")
    resp = run_query(service, ["query"], row_limit=1000)
    by_query = rows_to_list(resp, ["query"])
    all_data["by_query"] = by_query
    save_json(by_query, "performance_by_query.json")
    save_csv(by_query, "performance_by_query.csv")

    # 3) By page - top 1000
    logger.info("3. Fetching by page...")
    resp = run_query(service, ["page"], row_limit=1000)
    by_page = rows_to_list(resp, ["page"])
    all_data["by_page"] = by_page
    save_json(by_page, "performance_by_page.json")
    save_csv(by_page, "performance_by_page.csv")

    # Summary JSON
    save_json(all_data, "gsc_performance_summary.json")

    # Totals
    total_clicks = sum(r["clicks"] for r in by_date)
    total_impressions = sum(r["impressions"] for r in by_date)
    logger.info("Done. Totals (aggregated by date):")
    logger.info(f"  Clicks: {total_clicks}")
    logger.info(f"  Impressions: {total_impressions}")
    logger.info(f"  Queries: {len(by_query)}")
    logger.info(f"  Pages: {len(by_page)}")


if __name__ == "__main__":
    main()
