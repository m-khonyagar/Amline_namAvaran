# Admin UI — build with repo root as context (needs packages/amline-ui-core for CSS imports).
FROM node:20-alpine AS builder

WORKDIR /app
COPY packages/amline-ui-core /app/packages/amline-ui-core

WORKDIR /app/admin-ui
COPY admin-ui/package.json admin-ui/package-lock.json* ./
RUN npm ci
COPY admin-ui/ ./
RUN npm run build

FROM nginx:alpine
COPY admin-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/admin-ui/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
