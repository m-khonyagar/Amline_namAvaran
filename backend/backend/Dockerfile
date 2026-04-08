ARG AMLINE_PYTHON_BASE=python:3.12-slim-bookworm
FROM ${AMLINE_PYTHON_BASE}
WORKDIR /app
# Use Arvan mirror when building from networks where deb.debian.org is slow or blocked (e.g. some IR VPS).
RUN set -eux; \
    cat > /etc/apt/sources.list.d/debian.sources <<'EOF'
Types: deb
URIs: http://mirror.arvancloud.ir/debian
Suites: bookworm
Components: main
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
EOF
RUN printf 'Acquire::Check-Valid-Until "false";\n' > /etc/apt/apt.conf.d/99mirror-stale-ok
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
ARG AMLINE_PIP_INDEX_URL=
RUN if [ -n "$AMLINE_PIP_INDEX_URL" ]; then \
      THOST=$(printf '%s' "$AMLINE_PIP_INDEX_URL" | sed -e 's|^https*://||' -e 's|/.*||'); \
      pip install --index-url "$AMLINE_PIP_INDEX_URL" --trusted-host "$THOST" \
        --no-cache-dir -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
