"""
One command: Fetch fresh GSC data + sync to Google Sheets.
Run this whenever you want updated data online.
"""
import subprocess
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.dirname(SCRIPT_DIR))

def main():
    print("Step 1: Fetching from Google Search Console...")
    r1 = subprocess.run([sys.executable, os.path.join(SCRIPT_DIR, "gsc_export_all.py")], capture_output=False)
    if r1.returncode != 0:
        print("GSC fetch failed. Stopping.")
        sys.exit(1)
    print("\nStep 2: Syncing to Google Sheets...")
    r2 = subprocess.run([sys.executable, os.path.join(SCRIPT_DIR, "gsc_sync_to_google_sheets.py")], capture_output=False)
    if r2.returncode != 0:
        sys.exit(r2.returncode)
    print("\nStep 3: Applying dashboard design...")
    r3 = subprocess.run([sys.executable, os.path.join(SCRIPT_DIR, "gsc_apply_dashboard.py")], capture_output=False)
    if r3.returncode != 0:
        sys.exit(r3.returncode)
    print("\nStep 4: Merging campaign data...")
    r4 = subprocess.run([sys.executable, os.path.join(SCRIPT_DIR, "gsc_merge_campaign_sheet.py")], capture_output=False)
    sys.exit(r4.returncode)

if __name__ == "__main__":
    main()
