# Consultant UI — build with repo root as context (needs packages/amline-ui-core for CSS imports).
FROM node:20-alpine AS builder

WORKDIR /app
COPY packages/amline-ui-core /app/packages/amline-ui-core

WORKDIR /app/consultant-ui
COPY consultant-ui/package.json consultant-ui/package-lock.json* ./
RUN npm ci
COPY consultant-ui/ ./
RUN npm run build

FROM nginx:alpine
COPY consultant-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/consultant-ui/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
