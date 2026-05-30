FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM fholzer/nginx-brotli:latest
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Non-root (unprivileged port; K8s Service maps 80 → 8080)
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
