# NGINX Ingress Controller — install

The app `Ingress` (`ingress.yaml`) expects the **official NGINX Ingress Controller** (`ingressClassName: nginx`).

## Helm (recommended)

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true
```

Get the external IP / hostname:

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

Point DNS `app.example.com` to that address (or use the cloud LB hostname).

## Bare manifest (no Helm)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/cloud/deploy.yaml
```

Adjust provider file for your cloud: `.../provider/aws/`, `.../provider/do/`, etc.

## Verify

```bash
kubectl get pods -n ingress-nginx
kubectl get ingressclass
# Should list "nginx"
```

## TLS (optional)

Use [cert-manager](https://cert-manager.io/) with a `ClusterIssuer`, then uncomment `tls:` in `ingress.yaml` and the `cert-manager.io/cluster-issuer` annotation.

## HPA prerequisite

Horizontal Pod Autoscalers need [metrics-server](https://github.com/kubernetes-sigs/metrics-server):

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```
