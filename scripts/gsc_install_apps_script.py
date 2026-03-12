"""
Install GSC Refresh Apps Script into the Google Sheet.
Creates a container-bound script so clicking Refresh updates data.
Requires: Apps Script API enabled in GCP project.
"""
import os
import json

KEY_FILE = os.environ.get("GSC_KEY_FILE")
if not KEY_FILE:
    raise ValueError("GSC_KEY_FILE environment variable is required")
KEY_FILE = os.path.abspath(KEY_FILE)
SHEET_ID = "1qFynl6JMLbT55ucqXe2zQ7w710JCpkhlxHYvZDC8oEA"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
from gsc_paths import GSC_DATA_DIR
GSC_GS = os.path.join(GSC_DATA_DIR, "GSC_Refresh_AppsScript.gs")
APPSSCRIPT_JSON = os.path.join(GSC_DATA_DIR, "appsscript.json")

SCOPES = [
    "https://www.googleapis.com/auth/script.projects",
    "https://www.googleapis.com/auth/spreadsheets",
]


def main():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    if not os.path.isfile(KEY_FILE):
        print("Key file not found:", KEY_FILE)
        return
    if not os.path.isfile(GSC_GS):
        print("GSC_Refresh_AppsScript.gs not found")
        return

    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    script_service = build("script", "v1", credentials=creds)

    # Create container-bound project
    print("Creating Apps Script project bound to sheet...")
    try:
        create_resp = (
            script_service.projects()
            .create(body={"title": "GSC Refresh", "parentId": SHEET_ID})
            .execute()
        )
    except Exception as e:
        print("Create failed (enable Apps Script API at console.cloud.google.com):", e)
        return

    script_id = create_resp.get("scriptId")
    if not script_id:
        print("No scriptId in response")
        return
    print("Created script project:", script_id)

    # Read our .gs content
    with open(GSC_GS, "r", encoding="utf-8") as f:
        code_content = f.read()

    # Read manifest
    manifest = {
        "timeZone": "Asia/Tehran",
        "exceptionLogging": "STACKDRIVER",
        "oauthScopes": [
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/spreadsheets",
        ],
    }
    if os.path.isfile(APPSSCRIPT_JSON):
        with open(APPSSCRIPT_JSON, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    files = [
        {"name": "Code", "type": "SERVER_JS", "source": code_content},
        {"name": "appsscript", "type": "JSON", "source": json.dumps(manifest)},
    ]

    print("Updating script content...")
    try:
        script_service.projects().updateContent(scriptId=script_id, body={"files": files}).execute()
    except Exception as e:
        print("Update content failed:", e)
        return

    print("Done. Open the sheet and refresh the page - you should see menu GSC > به\u200cروزرسانی داده\u200cها")
    print("First run: Extensions > Apps Script > Run refreshGSCData to authorize.")
    print("Sheet:", f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit")


if __name__ == "__main__":
    main()
