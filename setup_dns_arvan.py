"""
Add DNS A record for seo.amline.ir via Arvan Cloud API.
Requires: ARVAN_API_KEY (get from panel.arvancloud.ir -> Profile -> API Key)
"""
import os
import sys
import json

# Load .env if exists
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.isfile(env_path):
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

API_KEY = os.getenv("ARVAN_API_KEY", "")
DOMAIN = "amline.ir"
RECORD_NAME = "seo"
RECORD_VALUE = "212.80.24.109"

if not API_KEY:
    print("Error: ARVAN_API_KEY not set.")
    print("Get it from: panel.arvancloud.ir -> Profile -> API Key")
    print("Then: $env:ARVAN_API_KEY = 'your-api-key'")
    sys.exit(1)

try:
    import urllib.request
    import urllib.error
except ImportError:
    print("urllib is built-in")
    sys.exit(1)


def api_request(method, path, data=None):
    url = f"https://api.arvancloud.ir/v1/dns{path}"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def main():
    print("Fetching zones...")
    try:
        zones = api_request("GET", "/zones")
    except urllib.error.HTTPError as e:
        print("API error:", e.code, e.read().decode())
        sys.exit(1)
    except Exception as e:
        print("Error:", e)
        sys.exit(1)

    zone_id = None
    for z in zones.get("data", []):
        if z.get("domain", "").lower() == DOMAIN:
            zone_id = z.get("id")
            break

    if not zone_id:
        print(f"Zone for {DOMAIN} not found in Arvan.")
        sys.exit(1)

    print(f"Found zone: {DOMAIN} (id={zone_id})")
    print(f"Adding A record: {RECORD_NAME}.{DOMAIN} -> {RECORD_VALUE}")

    record = {
        "type": "a",
        "name": RECORD_NAME,
        "value": [{"ip": RECORD_VALUE}],
        "ttl": 3600,
    }

    try:
        api_request("POST", f"/zones/{zone_id}/records", record)
        print("Done. DNS record added.")
        print("Wait 5-30 min for propagation, then: https://seo.amline.ir/seo")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "duplicate" in body.lower() or "already" in body.lower():
            print("Record already exists. OK.")
        else:
            print("API error:", e.code, body)
            sys.exit(1)
    except Exception as e:
        print("Error:", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
