"""
قرارداد مسیرها و نام واحدهای systemd برای دیپلوی چند اپ روی یک سرور.

مستندات: infra/multi-app-server/
"""
from __future__ import annotations

# ریشهٔ استاندارد همهٔ اپ‌ها روی میزبان
APPS_ROOT = "/opt/apps"

# اپ املاین — محیط staging
APP_AMLINE = "amline"
ENV_STAGING = "staging"
ROLE_MARKETING_SITE = "marketing-site"
ROLE_ADMIN_UI = "admin-ui"

# مسیرهای استاتیک (بعد از build)
PATH_AMLINE_STAGING_MARKETING = f"{APPS_ROOT}/{APP_AMLINE}/{ENV_STAGING}/{ROLE_MARKETING_SITE}"
PATH_AMLINE_STAGING_ADMIN_UI = f"{APPS_ROOT}/{APP_AMLINE}/{ENV_STAGING}/{ROLE_ADMIN_UI}"

# ابزار مشترک
PATH_SHARED_DIR = f"{APPS_ROOT}/_shared"
PATH_SPA_STATIC_SERVER = f"{PATH_SHARED_DIR}/spa_static_server.py"
PATH_REGISTRY_DIR = f"{APPS_ROOT}/_registry"
PATH_REGISTRY_PORTS_TXT = f"{PATH_REGISTRY_DIR}/ports.txt"
PATH_APPS_README = f"{APPS_ROOT}/README.txt"

# systemd — الگو: appsvc-<app>-<env>-<role>.service
UNIT_AMLINE_STAGING_MARKETING = "appsvc-amline-staging-marketing.service"
UNIT_AMLINE_STAGING_ADMIN_UI = "appsvc-amline-staging-admin-ui.service"
SYSTEMD_TARGET_STATIC = "multi-app-static.target"

# مسیرهای قدیمی (مهاجرت)
LEGACY_STAGING_SITE = "/opt/amline/staging/site"
LEGACY_STAGING_ADMIN = "/opt/amline/staging/admin-ui"
LEGACY_STAGING_SPA = "/opt/amline/staging/spa_static_server.py"
LEGACY_UNITS = (
    "amline-staging-site.service",
    "amline-staging-admin.service",
)
