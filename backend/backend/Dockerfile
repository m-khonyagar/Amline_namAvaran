ARG AMLINE_PYTHON_BASE=python:3.12-slim-bookworm
FROM ${AMLINE_PYTHON_BASE}
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
COPY docker-build-wheelhouse/ /wheelhouse/
ARG AMLINE_OFFLINE_PIP=0
RUN if [ "$AMLINE_OFFLINE_PIP" = "1" ]; then \
      pip install --no-index --find-links=/wheelhouse --no-cache-dir -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi
COPY . .
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
