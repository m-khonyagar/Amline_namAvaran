# Google Search Console (GSC) Integration

This directory contains scripts and documentation for fetching, managing, and analyzing Google Search Console data for amline.ir.

## Overview

The GSC integration provides tools to:
- Fetch search performance data from Google Search Console
- Export data to JSON/CSV formats
- Sync data to Google Sheets for analysis
- Apply dashboard formatting to reports

## Required Environment Variables

Before running any GSC scripts, you must set the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GSC_KEY_FILE` | **Yes** | Path to your Google Service Account JSON key file |
| `GSC_SHEET_ID` | No | Google Sheet ID for syncing data (optional) |
| `CTO_PROJECT_ROOT` | No | Project root path (defaults to script parent directory) |

### Setting GSC_KEY_FILE

**Windows:**
```cmd
set GSC_KEY_FILE=C:\path\to\your\service-account-key.json
```

**Linux/Mac:**
```bash
export GSC_KEY_FILE=/path/to/your/service-account-key.json
```

Or add to your `.env` file:
```
GSC_KEY_FILE=/path/to/your/service-account-key.json
```

### Getting a Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin > Service Accounts**
3. Create or select a service account
4. Go to **Keys > Add Key > Create new key**
5. Download the JSON key file
6. **Important:** Share your Google Search Console property with the service account email (format: `xxx@xxx.iam.gserviceaccount.com`)

## Recommended Workflow

### Using the CLI (Recommended)

The easiest way to work with GSC data is using the unified CLI:

```bash
# Set environment variables
set GSC_KEY_FILE=C:\path\to\key.json
set GSC_SHEET_ID=your-sheet-id  # optional

# Fetch latest data
python scripts/gsc_cli.py fetch

# Export to JSON
python scripts/gsc_cli.py export

# Sync to Google Sheet
python scripts/gsc_cli.py sync

# Full refresh (fetch + export + sync)
python scripts/gsc_cli.py full-refresh

# List accessible sites
python scripts/gsc_cli.py list-sites

# Get help
python scripts/gsc_cli.py --help
```

### Using Individual Scripts

You can also run scripts directly:

```bash
# Fetch latest GSC data
python scripts/gsc_fetch_data.py

# Export all data to JSON
python scripts/gsc_export_all.py

# Sync to Google Sheet
python scripts/gsc_sync_to_google_sheets.py

# Apply dashboard formatting
python scripts/gsc_apply_dashboard.py

# List accessible sites
python scripts/gsc_list_sites.py
```

## Scripts

### CLI Entry Point
| Script | Description |
|--------|-------------|
| [`gsc_cli.py`](../scripts/gsc_cli.py) | Unified CLI for all GSC operations |

### Individual Scripts
| Script | Description |
|--------|-------------|
| [`gsc_fetch_data.py`](../scripts/gsc_fetch_data.py) | Fetch GSC performance data for the last 90 days |
| [`gsc_export_all.py`](../scripts/gsc_export_all.py) | Export all available GSC data to JSON |
| [`gsc_export_to_excel.py`](../scripts/gsc_export_to_excel.py) | Export data to Excel format |
| [`gsc_sync_to_google_sheets.py`](../scripts/gsc_sync_to_google_sheets.py) | Sync data to a Google Sheet |
| [`gsc_apply_dashboard.py`](../scripts/gsc_apply_dashboard.py) | Apply dashboard formatting to Google Sheet |
| [`gsc_merge_campaign_sheet.py`](../scripts/gsc_merge_campaign_sheet.py) | Merge campaign data into main report |
| [`gsc_list_sites.py`](../scripts/gsc_list_sites.py) | List all sites accessible to the service account |
| [`gsc_install_apps_script.py`](../scripts/gsc_install_apps_script.py) | Install refresh Apps Script in Google Sheet |

## Data Output

Generated data is saved to `docs/gsc_data/`:
- `gsc_full_export.json` - Complete data export
- `gsc_*.csv` - Individual dimension exports
- `gsc_*.xlsx` - Excel exports (if generated)

These files are gitignored since they can be regenerated from GSC API.

## Developer Notes

### Configuration Loading

All scripts load configuration from `gsc_config.py`, which:
- Reads environment variables (`GSC_KEY_FILE`, `GSC_SHEET_ID`, `CTO_PROJECT_ROOT`)
- Validates required settings on startup
- Provides centralized helper functions (`get_gsc_service()`, `get_sheets_service()`)
- Sets up logging

### Logging

Scripts use Python's standard `logging` module. To enable debug logging:
```bash
python scripts/gsc_cli.py -v fetch
```

### Backward Compatibility

The old import style still works:
```python
from gsc_paths import GSC_DATA_DIR  # Still works, delegates to gsc_config
```

## Troubleshooting

### "Key file not found" error
- Ensure `GSC_KEY_FILE` is set correctly
- Use absolute path, not relative
- Check that the file exists at the specified path

### "Permission denied" error
- Verify the service account has access to the GSC property
- In GSC UI: Settings > Users and permissions > Add user > enter service account email

### "Sheet not found" error
- Verify `GSC_SHEET_ID` is correct (it's the long ID in the URL)
- Ensure the sheet is shared with the service account email

### Validation Errors
All scripts validate configuration at startup. If you see a validation error:
1. Check that `GSC_KEY_FILE` is set
2. Verify the key file path is correct
3. Ensure the key file exists and is readable

## Security Notes

- **Never commit** service account JSON keys to version control
- The `.gitignore` patterns exclude these files automatically
- Use environment variables to specify key paths
- Rotate keys periodically through Google Cloud Console
- Never share your service account credentials
