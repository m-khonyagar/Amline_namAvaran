from pathlib import Path
import sys


def configure_embedded_paths() -> None:
    root = Path(__file__).resolve().parent
    site_packages = root / "site-packages"
    if site_packages.exists():
        sys.path.insert(0, str(site_packages))
    sys.path.insert(0, str(root))


configure_embedded_paths()

from app.main import app
import uvicorn


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8060, log_level="info")
