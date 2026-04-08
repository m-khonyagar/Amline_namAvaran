# PDF Generator Service Dockerfile
# اَملاین - Amline Platform

ARG AMLINE_PYTHON_BASE=python:3.12-slim-bookworm
FROM ${AMLINE_PYTHON_BASE}

WORKDIR /app

RUN set -eux; \
    for f in /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list; do \
      [ -f "$f" ] || continue; \
      sed -i 's|https://deb.debian.org/debian|http://mirror.arvancloud.ir/debian|g' "$f" || true; \
      sed -i 's|http://deb.debian.org/debian|http://mirror.arvancloud.ir/debian|g' "$f" || true; \
      sed -i 's|https://security.debian.org/debian-security|http://mirror.arvancloud.ir/debian-security|g' "$f" || true; \
      sed -i 's|http://security.debian.org/debian-security|http://mirror.arvancloud.ir/debian-security|g' "$f" || true; \
    done

# Install system dependencies for WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-liberation \
    fontconfig \
    libpq-dev \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
