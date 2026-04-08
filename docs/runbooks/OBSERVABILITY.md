# Runbook — Observability (Tempo + Grafana + Loki + Prometheus)

## Purpose

Trace, metrics, and container logs for the Amline stack in development/staging. Production should use the same pattern with TLS, auth on Grafana, and longer retention.

## Services (Docker profile `integrations`)

| Service     | Port (host) | Role |
|------------|-------------|------|
| Tempo      | 3200        | Trace backend (OTLP via collector on 4318) |
| Grafana    | 3010        | Dashboards; datasources provisioned |
| Loki       | 3100        | Log aggregation |
| Promtail   | —           | Ships Docker container logs to Loki |
| Prometheus | 9090        | Scrapes `backend:8000/metrics`, `ml-pricing:8090/metrics` |
| OTEL Collector | 4318   | Receives OTLP HTTP from API (`OTEL_EXPORTER_OTLP_ENDPOINT`) |

## Bring-up

```bash
docker compose --profile integrations up -d \
  tempo loki promtail prometheus otel-collector grafana backend ml-pricing
```

Ensure `backend` exposes Prometheus metrics when `AMLINE_METRICS_ENABLED=1` (see `app/core/ops.py`).

## Grafana

- Open `http://localhost:3010` (anonymous admin enabled only for local dev).
- Datasources: Prometheus (default), Loki, Tempo — under **Connections → Data sources**.
- Folder **Amline** contains the provisioned overview dashboard (HTTP rate, targets up).

## Logs (Loki)

- Query labels: `container_name` matches Docker name (e.g. `amline-backend`).
- Promtail uses Docker socket (`/var/run/docker.sock`). On **Windows** Docker Desktop, this path inside the Promtail container must resolve; if log shipping fails, rely on `docker compose logs` or run Promtail on Linux CI.

## Traces

1. Set on `backend`: `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` and `OTEL_SERVICE_NAME=amline-api`.
2. In Grafana: **Explore → Tempo** and search by service name.

## Alerts (next step for prod)

- Add `Alertmanager` or Grafana unified alerting rules on Prometheus metrics (SLO: 5xx rate, scrape failures).
- Wire `AMLINE_ERROR_WEBHOOK_URL` / PagerDuty from [`launch_routes` ops endpoints](../support/PLAYBOOKS.md).

## Failure checklist

| Symptom | Check |
|--------|--------|
| No data in Prometheus | `curl http://localhost:9090/targets` — is `amline-backend` UP? |
| Empty Loki | Promtail logs; Docker socket mount; container name regex in `docker/promtail-config.yaml` |
| No traces | OTEL env on backend; collector logs; Tempo healthy on `:3200` |
