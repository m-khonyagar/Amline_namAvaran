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

# پشت Caddy: فقط loopback (خارج با HTTPS روی ۴۴۳)
INTERNAL_MARKETING_PORT = "10080"
INTERNAL_ADMIN_PORT = "10081"
LISTEN_HOST_LOOPBACK = "127.0.0.1"

PATH_CADDYFILE = f"{PATH_REGISTRY_DIR}/Caddyfile"
UNIT_CADDY_APPS = "caddy-apps.service"

# دامنهٔ پیش‌فرض — با env CADDY_MARKETING_HOST / CADDY_ADMIN_HOST قابل override
DEFAULT_CADDY_MARKETING_HOST = "staging.amline.ir"
DEFAULT_CADDY_ADMIN_HOST = "admin.staging.amline.ir"

CADDY_RELEASE = "2.8.4"

# پروکسی Caddy: API production (مسیرهای legacy؛ روی VPS با IP زیر و SNI زده می‌شود اگر DNS خراب باشد).
# Darkube یا دامنهٔ دیگر: STAGING_API_URL=...  |  غیرفعال کردن dial به IP: STAGING_API_DISABLE_CONNECT_IP=1
DEFAULT_STAGING_API_URL = "https://api.amline.ir"
# Current A record for api.amline.ir — update if DNS changes (see STAGING_API_CONNECT_IP).
API_AMLINE_IR_TLS_DIAL_IPV4 = "212.80.24.56"
