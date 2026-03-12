"""
List all accessible Google Search Console sites.

Usage:
    python gsc_list_sites.py
    
Required environment variable:
    GSC_KEY_FILE - Path to your Google Service Account JSON key file
"""
import os
import logging
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Import from central config
from gsc_config import get_key_file, validate, get_gsc_service

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """List all accessible GSC sites."""
    # Validate configuration
    validate()
    
    logger.info("Fetching accessible GSC sites...")
    
    service = get_gsc_service()
    
    try:
        site_list = service.sites().list().execute()
        sites = site_list.get('siteEntry', [])
        
        if not sites:
            logger.warning("No sites found")
            return
            
        logger.info(f"Found {len(sites)} site(s):")
        for site in sites:
            logger.info(f"  {site['siteUrl']}")
            
    except Exception as e:
        logger.error(f"Error fetching sites: {e}")
        raise


if __name__ == "__main__":
    main()
