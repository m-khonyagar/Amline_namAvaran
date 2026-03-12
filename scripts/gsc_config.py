"""
GSC Configuration Module

Central configuration for Google Search Console scripts.
Loads environment variables, validates settings, and provides helper functions.
"""
import os
import sys
import logging
from pathlib import Path
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


# =============================================================================
# Configuration Constants
# =============================================================================

# Default values
DEFAULT_DATA_DIR = "docs/gsc_data"
DEFAULT_SITE_URL = "https://amline.ir/"


# =============================================================================
# Environment Configuration
# =============================================================================

class GSCConfig:
    """GSC Configuration manager with validation."""
    
    def __init__(self):
        self._key_file: Optional[str] = None
        self._sheet_id: Optional[str] = None
        self._project_root: Optional[str] = None
        self._validated = False
    
    @property
    def key_file(self) -> str:
        """Get validated key file path."""
        if not self._validated:
            self._validate()
        return self._key_file
    
    @property
    def sheet_id(self) -> Optional[str]:
        """Get Google Sheet ID (may be None)."""
        if not self._validated:
            self._validate()
        return self._sheet_id
    
    @property
    def project_root(self) -> str:
        """Get project root directory."""
        if not self._validated:
            self._validate()
        return self._project_root
    
    @property
    def data_dir(self) -> str:
        """Get GSC data directory."""
        return os.path.join(self.project_root, DEFAULT_DATA_DIR)
    
    @property
    def site_url(self) -> str:
        """Get the monitored site URL."""
        return DEFAULT_SITE_URL
    
    def _validate(self) -> None:
        """Validate configuration and load from environment."""
        # Load key file path
        self._key_file = os.environ.get("GSC_KEY_FILE")
        if not self._key_file:
            logger.error("GSC_KEY_FILE environment variable is not set")
            raise ValueError(
                "GSC_KEY_FILE environment variable is required. "
                "Set it to the path of your Google Service Account JSON key file."
            )
        
        # Resolve to absolute path
        self._key_file = os.path.abspath(self._key_file)
        
        # Check file exists
        if not os.path.isfile(self._key_file):
            logger.error(f"Key file not found: {self._key_file}")
            raise FileNotFoundError(
                f"Service account key file not found: {self._key_file}. "
                "Please check the GSC_KEY_FILE path."
            )
        
        logger.info(f"Using key file: {self._key_file}")
        
        # Load optional settings
        self._sheet_id = os.environ.get("GSC_SHEET_ID")
        if self._sheet_id:
            self._sheet_id = self._sheet_id.strip()
            logger.info(f"Using sheet ID: {self._sheet_id}")
        
        # Load project root
        self._project_root = os.environ.get("CTO_PROJECT_ROOT")
        if not self._project_root:
            # Default to parent of scripts directory
            self._project_root = str(Path(__file__).parent.parent.resolve())
            logger.info(f"Using default project root: {self._project_root}")
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
        
        self._validated = True
        logger.info(f"Data directory: {self.data_dir}")
    
    def reset(self) -> None:
        """Reset validation state (useful for testing)."""
        self._validated = False
        self._key_file = None
        self._sheet_id = None
        self._project_root = None


# Global config instance
_config = GSCConfig()


# =============================================================================
# Public API
# =============================================================================

def get_key_file() -> str:
    """
    Get the service account key file path.
    
    Returns:
        Absolute path to the JSON key file.
    
    Raises:
        ValueError: If GSC_KEY_FILE is not set.
        FileNotFoundError: If the key file doesn't exist.
    """
    return _config.key_file


def get_sheet_id() -> Optional[str]:
    """
    Get the Google Sheet ID for syncing.
    
    Returns:
        Sheet ID string, or None if not configured.
    """
    return _config.sheet_id


def get_project_root() -> str:
    """Get the project root directory."""
    return _config.project_root


def get_data_dir() -> str:
    """Get the GSC data directory, creating it if needed."""
    return _config.data_dir


def get_site_url() -> str:
    """Get the monitored site URL."""
    return _config.site_url


def validate() -> None:
    """
    Validate configuration.
    
    Raises:
        ValueError: If required configuration is missing.
        FileNotFoundError: If required files don't exist.
    """
    # Trigger validation by accessing a property
    _config.key_file


def get_gsc_service():
    """
    Build and return an authenticated GSC service.
    
    Returns:
        Google Search Console API service instance.
    """
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    
    validate()
    credentials = service_account.Credentials.from_service_account_file(get_key_file())
    return build("searchconsole", "v1", credentials=credentials)


def get_sheets_service(scopes: Optional[list] = None):
    """
    Build and return an authenticated Google Sheets service.
    
    Args:
        scopes: List of OAuth scopes. Defaults to Sheets scope.
    
    Returns:
        Google Sheets API service instance.
    """
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    
    if scopes is None:
        scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    
    validate()
    credentials = service_account.Credentials.from_service_account_file(
        get_key_file(), 
        scopes=scopes
    )
    return build("sheets", "v4", credentials=credentials)


# For backward compatibility with old imports
GSC_DATA_DIR = property(lambda self: _config.data_dir)
