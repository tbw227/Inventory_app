# Kubernetes deployment

Run the API and web app on Kubernetes with **NGINX Ingress** as the load balancer / HTTP router.

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────┐
│  NGINX Ingress Controller   │  (cluster-wide, Helm install)
│  LoadBalancer / NodePort    │
└─────────────┬───────────────┘
              │  host: app.example.com
              ├── /api/*  ──► Service inventory-api:5000  (HPA 2–10 pods)
              └── /*      ──► Service inventory-web:80   (HPA 2–6 pods)

External: PostgreSQL (e.g. Supabase) via DATABASE_URL secret
Optional: Redis (k8s/redis.yaml) for shared tenant cache across API replicas
Optional: Prometheus + Grafana — see [MONITORING.md](./MONITORING.md)
```

Marketing site (`platform-marketing` repo) is a **separate** deploy; add another Ingress rule or host when ready.

## Prerequisites

- Kubernetes 1.28+ cluster
- `kubectl` and `kustomize` (or `kubectl apply -k`)
- Container registry (or local images for kind/minikube)
- [NGINX Ingress Controller](k8s/ingress-nginx-install.md)
- [metrics-server](https://github.com/kubernetes-sigs/metrics-server) for HPA

## 1. Install NGINX Ingress

See [k8s/ingress-nginx-install.md](../k8s/ingress-nginx-install.md).

## 2. Build and push images

```bash
# From repo root
docker build -t YOUR_REGISTRY/inventory-api:v1 ./backend
docker build -t YOUR_REGISTRY/inventory-web:v1 ./frontend

docker push YOUR_REGISTRY/inventory-api:v1
docker push YOUR_REGISTRY/inventory-web:v1
```

Edit `k8s/backend-deployment.yaml` and `k8s/frontend-deployment.yaml`:

- `image: YOUR_REGISTRY/inventory-api:v1`
- `imagePullPolicy: Always`

**Frontend build note:** Build with same-origin API (Ingress routes `/api`):

```bash
# No VITE_API_URL needed — browser uses /api/v1 on the app host
docker build -t YOUR_REGISTRY/inventory-web:v1 ./frontend
```

## 3. Configure secrets and config

```bash
cp k8s/secrets.example.yaml k8s/secrets.yaml
# Edit DATABASE_URL, DIRECT_URL, JWT_SECRET (and REDIS_URL if using redis.yaml)
```

Update `k8s/configmap-backend.yaml`:

- `FRONTEND_URL` — `https://app.example.com`
- `MARKETING_URL` — your marketing host

Update `k8s/ingress.yaml`:

- `host: app.example.com` → your domain

## 4. Deploy

```bash
# Add secrets.yaml to kustomization resources, or:
kubectl apply -f k8s/secrets.yaml

kubectl apply -k k8s/
```

## 5. DNS and TLS

Point `app.example.com` to the Ingress controller external address.

Enable TLS in `ingress.yaml` + cert-manager when ready.

## Scaling

| Resource | Default | HPA |
|----------|---------|-----|
| API | 2 replicas | 2–10 (CPU 70%, memory 80%) |
| Web | 2 replicas | 2–6 (CPU 75%) |

With **multiple API pods**, apply `k8s/redis.yaml` and set `REDIS_URL=redis://inventory-redis:6379` in secrets so tenant cache is shared.

## Health checks

| Probe | Path | Purpose |
|-------|------|---------|
| Liveness | `GET /health/live` | Process up (no DB) |
| Readiness | `GET /health` | DB + cache reachable |

## Useful commands

```bash
kubectl -n inventory-app get pods,svc,ingress,hpa
kubectl -n inventory-app logs -l app.kubernetes.io/name=inventory-api -f
kubectl -n inventory-app describe ingress inventory-app
```

## Local cluster (kind / minikube)

```bash
kind create cluster
# Install ingress-nginx (see ingress-nginx-install.md)
docker build -t inventory-api:local ./backend
docker build -t inventory-web:local ./frontend
kind load docker-image inventory-api:local inventory-web:local
kubectl apply -k k8s/
```

Add `/etc/hosts`: `127.0.0.1 app.example.com` and port-forward or use kind port mapping.

## Files

| File | Purpose |
|------|---------|
| `namespace.yaml` | `inventory-app` namespace |
| `backend-*.yaml` | API Deployment + Service |
| `frontend-*.yaml` | SPA Deployment + Service + nginx ConfigMap |
| `ingress.yaml` | NGINX Ingress rules |
| `hpa-*.yaml` | Autoscaling |
| `redis.yaml` | Optional shared cache |
| `secrets.example.yaml` | Template for DB/JWT secrets |
