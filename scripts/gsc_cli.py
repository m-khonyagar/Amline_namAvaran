#!/usr/bin/env python3
"""
GSC CLI - Unified command-line interface for Google Search Console operations.

Usage:
    python gsc_cli.py <command> [options]
    
Commands:
    fetch       Fetch latest GSC performance data
    export      Export all data to JSON
    sync        Sync data to Google Sheet
    list-sites  List all accessible GSC sites
    full-refresh  Run complete workflow (fetch + export + sync)
    
Examples:
    python gsc_cli.py fetch
    python gsc_cli.py sync
    python gsc_cli.py full-refresh

Required environment variables:
    GSC_KEY_FILE - Path to your Google Service Account JSON key file
    GSC_SHEET_ID - (Optional) Google Sheet ID for sync command
"""
import argparse
import logging
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gsc_config import validate, get_sheet_id, logger

# Import all scripts as modules for CLI
import gsc_fetch_data
import gsc_export_all
import gsc_sync_to_google_sheets
import gsc_list_sites


def cmd_fetch(args):
    """Fetch GSC performance data."""
    logger.info("Running: fetch")
    validate()
    gsc_fetch_data.main()


def cmd_export(args):
    """Export all GSC data to JSON."""
    logger.info("Running: export")
    validate()
    gsc_export_all.main()


def cmd_sync(args):
    """Sync data to Google Sheet."""
    logger.info("Running: sync")
    validate()
    
    sheet_id = get_sheet_id()
    if not sheet_id:
        logger.error("GSC_SHEET_ID environment variable is required for sync")
        logger.error("Set it with: set GSC_SHEET_ID=your-sheet-id")
        sys.exit(1)
    
    gsc_sync_to_google_sheets.main()


def cmd_list_sites(args):
    """List all accessible GSC sites."""
    logger.info("Running: list-sites")
    validate()
    gsc_list_sites.main()


def cmd_full_refresh(args):
    """Run complete workflow: fetch + export + sync."""
    logger.info("Running: full-refresh")
    validate()
    
    # Step 1: Fetch data
    logger.info("Step 1/3: Fetching data...")
    gsc_fetch_data.main()
    
    # Step 2: Export all
    logger.info("Step 2/3: Exporting all data...")
    gsc_export_all.main()
    
    # Step 3: Sync to sheet (if configured)
    sheet_id = get_sheet_id()
    if sheet_id:
        logger.info("Step 3/3: Syncing to Google Sheet...")
        gsc_sync_to_google_sheets.main()
    else:
        logger.warning("Step 3/3: Skipped (GSC_SHEET_ID not set)")
    
    logger.info("Full refresh complete!")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="GSC CLI - Unified interface for Google Search Console operations",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python gsc_cli.py fetch
  python gsc_cli.py sync
  python gsc_cli.py full-refresh
  
Environment variables:
  GSC_KEY_FILE   - Path to service account JSON key (required)
  GSC_SHEET_ID   - Google Sheet ID for sync (optional)
  CTO_PROJECT_ROOT - Project root path (optional)
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Fetch command
    fetch_parser = subparsers.add_parser("fetch", help="Fetch latest GSC performance data")
    fetch_parser.set_defaults(func=cmd_fetch)
    
    # Export command
    export_parser = subparsers.add_parser("export", help="Export all data to JSON")
    export_parser.set_defaults(func=cmd_export)
    
    # Sync command
    sync_parser = subparsers.add_parser("sync", help="Sync data to Google Sheet")
    sync_parser.set_defaults(func=cmd_sync)
    
    # List sites command
    list_parser = subparsers.add_parser("list-sites", help="List all accessible GSC sites")
    list_parser.set_defaults(func=cmd_list_sites)
    
    # Full refresh command
    refresh_parser = subparsers.add_parser("full-refresh", help="Run complete workflow")
    refresh_parser.set_defaults(func=cmd_full_refresh)
    
    # Add verbose option
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)
    
    # Run command
    if args.command is None:
        parser.print_help()
        sys.exit(1)
    
    try:
        args.func(args)
    except (ValueError, FileNotFoundError) as e:
        logger.error(str(e))
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
