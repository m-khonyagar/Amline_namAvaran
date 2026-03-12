#!/bin/bash
# اسکریپت دیپلوی داشبورد سئو روی پارمین کلود

set -e

echo "=== Build & Deploy SEO Dashboard ==="
docker compose build --no-cache
docker compose up -d

echo ""
echo "Done. Dashboard: http://localhost:3003"
echo "Check logs: docker compose logs -f seo-dashboard"
