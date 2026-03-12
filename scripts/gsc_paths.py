"""
GSC Data Paths Module

This module is deprecated. Use gsc_config instead.
 maintained for backward compatibility.
"""
import os
from gsc_config import get_data_dir, get_project_root, validate

# Validate on import
validate()

# Backward compatibility - these were previously defined here
PROJECT_ROOT = get_project_root()
GSC_DATA_DIR = get_data_dir()

# Ensure directory exists
os.makedirs(GSC_DATA_DIR, exist_ok=True)
