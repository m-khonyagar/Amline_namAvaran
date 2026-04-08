# PDF Generator Service Dockerfile
# اَملاین - Amline Platform

ARG AMLINE_PYTHON_BASE=python:3.12-slim-bookworm
FROM ${AMLINE_PYTHON_BASE}

WORKDIR /app

RUN set -eux; \
    cat > /etc/apt/sources.list.d/debian.sources <<'EOF'
Types: deb
URIs: http://mirror.arvancloud.ir/debian
Suites: bookworm
Components: main
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
EOF
RUN printf 'Acquire::Check-Valid-Until "false";\n' > /etc/apt/apt.conf.d/99mirror-stale-ok

# Install system dependencies for WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-liberation \
    fontconfig \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

ARG AMLINE_PIP_INDEX_URL=
RUN if [ -n "$AMLINE_PIP_INDEX_URL" ]; then \
      THOST=$(printf '%s' "$AMLINE_PIP_INDEX_URL" | sed -e 's|^https*://||' -e 's|/.*||'); \
      pip install --index-url "$AMLINE_PIP_INDEX_URL" --trusted-host "$THOST" \
        --trusted-host files.pythonhosted.org \
        --no-cache-dir -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
