FROM python:3.12-slim
WORKDIR /app
# Use Arvan mirror when building from networks where deb.debian.org is slow or blocked (e.g. some IR VPS).
RUN set -eux; \
    for f in /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list; do \
      [ -f "$f" ] || continue; \
      sed -i 's|https://deb.debian.org/debian|http://mirror.arvancloud.ir/debian|g' "$f" || true; \
      sed -i 's|http://deb.debian.org/debian|http://mirror.arvancloud.ir/debian|g' "$f" || true; \
      sed -i 's|https://security.debian.org/debian-security|http://mirror.arvancloud.ir/debian-security|g' "$f" || true; \
      sed -i 's|http://security.debian.org/debian-security|http://mirror.arvancloud.ir/debian-security|g' "$f" || true; \
    done
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
