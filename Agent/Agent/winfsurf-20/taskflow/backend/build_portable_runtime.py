from __future__ import annotations

import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BASE_PYTHON = Path(sys.base_prefix)
VENV_SITE_PACKAGES = ROOT / ".venv" / "Lib" / "site-packages"
RUNTIME_DIR = ROOT / "portable_runtime"

STD_LIB_ITEMS = [
    "__future__.py",
    "_collections_abc.py",
    "_compat_pickle.py",
    "_compression.py",
    "_sitebuiltins.py",
    "_weakrefset.py",
    "abc.py",
    "ast.py",
    "asyncio",
    "base64.py",
    "bisect.py",
    "bz2.py",
    "calendar.py",
    "codecs.py",
    "collections",
    "colorsys.py",
    "concurrent",
    "configparser.py",
    "contextlib.py",
    "contextvars.py",
    "copy.py",
    "copyreg.py",
    "csv.py",
    "ctypes",
    "dataclasses.py",
    "datetime.py",
    "decimal.py",
    "dis.py",
    "email",
    "encodings",
    "enum.py",
    "fnmatch.py",
    "functools.py",
    "genericpath.py",
    "gettext.py",
    "hashlib.py",
    "heapq.py",
    "html",
    "http",
    "importlib",
    "inspect.py",
    "ipaddress.py",
    "json",
    "keyword.py",
    "linecache.py",
    "locale.py",
    "logging",
    "lzma.py",
    "mimetypes.py",
    "multiprocessing",
    "ntpath.py",
    "numbers.py",
    "opcode.py",
    "operator.py",
    "os.py",
    "pathlib.py",
    "pickle.py",
    "platform.py",
    "posixpath.py",
    "queue.py",
    "quopri.py",
    "random.py",
    "re",
    "reprlib.py",
    "selectors.py",
    "shlex.py",
    "shutil.py",
    "signal.py",
    "site.py",
    "socket.py",
    "socketserver.py",
    "ssl.py",
    "stat.py",
    "string.py",
    "struct.py",
    "subprocess.py",
    "sysconfig.py",
    "tempfile.py",
    "textwrap.py",
    "threading.py",
    "token.py",
    "tokenize.py",
    "traceback.py",
    "types.py",
    "typing.py",
    "urllib",
    "uuid.py",
    "warnings.py",
    "weakref.py",
    "zipfile",
    "zipimport.py",
    "zoneinfo",
]

SITE_PACKAGES_ITEMS = [
    "annotated_types",
    "annotated_types-0.7.0.dist-info",
    "anyio",
    "anyio-4.12.1.dist-info",
    "click",
    "click-8.3.1.dist-info",
    "fastapi",
    "fastapi-0.115.0.dist-info",
    "h11",
    "h11-0.16.0.dist-info",
    "httptools",
    "httptools-0.7.1.dist-info",
    "idna",
    "idna-3.11.dist-info",
    "pydantic",
    "pydantic-2.9.2.dist-info",
    "pydantic_core",
    "pydantic_core-2.23.4.dist-info",
    "PIL",
    "pillow-12.1.1.dist-info",
    "psutil",
    "psutil-5.9.8.dist-info",
    "multipart",
    "python_multipart",
    "python_multipart-0.0.17.dist-info",
    "sniffio",
    "sniffio-1.3.1.dist-info",
    "starlette",
    "starlette-0.37.2.dist-info",
    "typing_extensions.py",
    "typing_extensions-4.15.0.dist-info",
    "uvicorn",
    "uvicorn-0.32.0.dist-info",
    "websockets",
    "websockets-14.1.dist-info",
    "wsproto",
    "wsproto-1.3.2.dist-info",
    "yaml",
    "pyyaml-6.0.3.dist-info",
]


def copy_path(source: Path, destination: Path) -> None:
    if source.is_dir():
        shutil.copytree(source, destination, dirs_exist_ok=True)
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def build_runtime() -> None:
    if RUNTIME_DIR.exists():
        shutil.rmtree(RUNTIME_DIR)

    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)

    for name in ["python.exe", "python3.dll", "python312.dll", "vcruntime140.dll", "vcruntime140_1.dll"]:
        copy_path(BASE_PYTHON / name, RUNTIME_DIR / name)

    copy_path(BASE_PYTHON / "DLLs", RUNTIME_DIR / "DLLs")

    for item in STD_LIB_ITEMS:
        copy_path(BASE_PYTHON / "Lib" / item, RUNTIME_DIR / item)

    site_packages_target = RUNTIME_DIR / "site-packages"
    site_packages_target.mkdir(parents=True, exist_ok=True)
    for item in SITE_PACKAGES_ITEMS:
        copy_path(VENV_SITE_PACKAGES / item, site_packages_target / item)

    copy_path(ROOT / "app", RUNTIME_DIR / "app")
    copy_path(ROOT / "launcher.py", RUNTIME_DIR / "launcher.py")

    readme = RUNTIME_DIR / "README.txt"
    readme.write_text(
        "Portable backend runtime for Agent Windsurf.\n"
        "Launch with: python.exe launcher.py\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    build_runtime()
    print(f"Portable runtime created at: {RUNTIME_DIR}")
