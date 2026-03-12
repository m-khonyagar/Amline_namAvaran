"""
Metabase API client - اجرای مستقیم کوئری و کار با Metabase.
کلید از متغیر محیطی METABASE_API_KEY خوانده می‌شود.
"""
import os
import sys
import json
import urllib.request
import urllib.error
from urllib.parse import urljoin

BASE_URL = "https://amline-metabase.darkube.app"
API_KEY = os.environ.get("METABASE_API_KEY")


def _headers():
    if not API_KEY:
        print("خطا: متغیر محیطی METABASE_API_KEY تنظیم نشده.", file=sys.stderr)
        print("در PowerShell: $env:METABASE_API_KEY='کلید_شما'", file=sys.stderr)
        sys.exit(1)
    return {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY.strip(),
    }


def _request(method: str, path: str, data: dict = None) -> dict:
    url = urljoin(BASE_URL.rstrip("/") + "/", path.lstrip("/"))
    req = urllib.request.Request(
        url,
        method=method,
        headers=_headers(),
        data=json.dumps(data).encode() if data else None,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"خطا: {e}", file=sys.stderr)
        raise


def get_databases():
    """لیست دیتابیس‌های متصل به Metabase."""
    return _request("GET", "/api/database")


def get_database(database_id: int):
    """جزئیات یک دیتابیس."""
    return _request("GET", f"/api/database/{database_id}")


def get_tables(database_id: int):
    """لیست جداول یک دیتابیس (از طریق metadata)."""
    db = _request("GET", f"/api/database/{database_id}/metadata")
    return db.get("tables", [])


def run_query(database_id: int, sql: str):
    """اجرای کوئری SQL روی یک دیتابیس."""
    body = {
        "database": database_id,
        "type": "native",
        "native": {
            "query": sql,
        },
    }
    return _request("POST", "/api/dataset", data=body)


def list_cards():
    """لیست سوالات/کارت‌های ذخیره‌شده."""
    return _request("GET", "/api/card")


def run_card(card_id: int):
    """اجرای یک کارت (سوال ذخیره‌شده) و برگرداندن نتیجه."""
    return _request("POST", f"/api/card/{card_id}/query", data={})


def list_dashboards():
    """لیست داشبوردها."""
    return _request("GET", "/api/dashboard")


def get_dashboard(dashboard_id: int):
    """جزئیات یک داشبورد."""
    return _request("GET", f"/api/dashboard/{dashboard_id}")


def create_card(
    name: str,
    database_id: int,
    sql: str,
    display: str = "table",
    visualization_settings: dict = None,
    collection_id: int = None,
):
    """ایجاد یک سوال (کارت) با کوئری SQL. display: table, bar, line, pie, scalar."""
    if visualization_settings is None:
        visualization_settings = {}
    body = {
        "name": name,
        "dataset_query": {
            "database": database_id,
            "type": "native",
            "native": {"query": sql},
        },
        "display": display,
        "visualization_settings": visualization_settings,
    }
    if collection_id is not None:
        body["collection_id"] = collection_id
    return _request("POST", "/api/card", data=body)


def create_dashboard(name: str, description: str = None):
    """ایجاد داشبورد جدید."""
    body = {"name": name}
    if description:
        body["description"] = description
    return _request("POST", "/api/dashboard", data=body)


def update_dashboard(dashboard_id: int, payload: dict):
    """آپدیت داشبورد (از جمله dashcards)."""
    return _request("PUT", f"/api/dashboard/{dashboard_id}", data=payload)


def update_dashboard_cards_layout(dashboard_id: int, cards_payload: list):
    """آپدیت فقط چیدمان کارت‌ها: لیست {id, size_x, size_y, row, col, parameter_mappings?, series?}."""
    return _request("PUT", f"/api/dashboard/{dashboard_id}/cards", data={"cards": cards_payload})


def invalidate_dashboard_cache(dashboard_id: int):
    """پاک کردن کش داشبورد تا UI دادهٔ جدید بگیرد."""
    try:
        _request("POST", f"/api/cache/invalidate?dashboard={dashboard_id}")
    except Exception:
        pass


def get_card(card_id: int):
    """دریافت جزئیات یک کارت."""
    return _request("GET", f"/api/card/{card_id}")


def update_card(card_id: int, payload: dict):
    """آپدیت کارت (مثلاً dataset_query برای اصلاح کوئری)."""
    return _request("PUT", f"/api/card/{card_id}", data=payload)


def main():
    if len(sys.argv) < 2:
        print("استفاده: python metabase_client.py <دستور> [آرگومان‌ها...]")
        print("  databases          لیست دیتابیس‌ها")
        print("  tables <db_id>     لیست جداول یک دیتابیس")
        print("  query <db_id> <sql>  اجرای SQL (sql را در quotes بگذارید)")
        print("  cards              لیست سوالات ذخیره‌شده")
        print("  runcard <card_id>  اجرای یک سوال ذخیره‌شده")
        sys.exit(0)

    cmd = sys.argv[1].lower()
    try:
        if cmd == "databases":
            out = get_databases()
            print(json.dumps(out, indent=2, ensure_ascii=True))
        elif cmd == "tables" and len(sys.argv) >= 3:
            db_id = int(sys.argv[2])
            out = get_tables(db_id)
            print(json.dumps(out, indent=2, ensure_ascii=True))
        elif cmd == "query" and len(sys.argv) >= 4:
            db_id = int(sys.argv[2])
            sql = sys.argv[3]
            out = run_query(db_id, sql)
            print(json.dumps(out, indent=2, ensure_ascii=True))
        elif cmd == "cards":
            out = list_cards()
            print(json.dumps(out, indent=2, ensure_ascii=True))
        elif cmd == "runcard" and len(sys.argv) >= 3:
            card_id = int(sys.argv[2])
            out = run_card(card_id)
            print(json.dumps(out, indent=2, ensure_ascii=True))
        else:
            print("دستور یا آرگومان ناشناخته. بدون آرگومان اجرا کنید برای راهنما.")
            sys.exit(1)
    except urllib.error.HTTPError:
        sys.exit(1)


if __name__ == "__main__":
    main()
