# Logging and monitoring (Prometheus + Grafana)

## Layers

| Layer | Tool | Purpose |
|-------|------|---------|
| **Logs** | Winston + Morgan | Structured JSON logs in production; request lines in dev |
| **Errors** | Sentry (optional) | Stack traces for 5xx (`SENTRY_DSN`) |
| **Metrics** | Prometheus | Request rate, latency, errors, Node.js runtime |
| **Dashboards** | Grafana | Visualize Prometheus metrics |

## API metrics

When `METRICS_ENABLED` is not `false` (default **on**, off in `NODE_ENV=test`):

- **Endpoint:** `GET /metrics` (Prometheus text format)
- **Metrics:**
  - `inventory_http_requests_total` — counter by method, route, status
  - `inventory_http_request_duration_seconds` — histogram
  - `inventory_http_errors_total` — 5xx counter
  - `inventory_process_*`, `inventory_nodejs_*` — default Node metrics

Routes are normalized (`/api/jobs/uuid` → `/api/jobs/:id`) to limit label cardinality.

```bash
curl http://localhost:5000/metrics
```

Env: `METRICS_ENABLED=false` to disable.

## Local: Docker Compose

With the main stack running (`docker compose up` or `npm run dev:all`):

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

| URL | Service |
|-----|---------|
| http://localhost:3000 | Grafana (`admin` / `admin` or `GRAFANA_ADMIN_PASSWORD`) |
| http://localhost:9090 | Prometheus UI |
| http://localhost:5000/metrics | Raw API metrics |

Pre-built dashboard: **Inventory → Inventory API**.

If the API runs on the host (not in Compose), edit `monitoring/prometheus.yml` target to `host.docker.internal:5000`.

## Kubernetes

1. Install [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack):

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f k8s/monitoring/helm-prometheus-values.yaml
```

2. Deploy the app (`kubectl apply -k k8s/`) and scrape config:

```bash
kubectl apply -f k8s/monitoring/servicemonitor.yaml
```

3. Port-forward Grafana:

```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

Import or copy `monitoring/grafana/dashboards/inventory-api.json` if not auto-loaded.

Ensure `inventory-api-config` includes `METRICS_ENABLED: "true"` (default).

## Logging (Winston)

Production logs are **JSON** to stdout (ideal for Loki/CloudWatch/Datadog later):

```json
{"level":"info","message":"127.0.0.1 GET /api/v1/dashboard 200 45 ms","timestamp":"..."}
```

5xx errors include stack traces via `errorHandler`.

## Next steps (optional)

- **Loki** + Grafana for log correlation with metrics
- **Alertmanager** rules (error rate, latency SLOs) via kube-prometheus-stack
- **OpenTelemetry** traces if you need distributed tracing
