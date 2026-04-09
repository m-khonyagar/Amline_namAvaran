# Consultant UI — CSS imports ../../packages/amline-ui-core; build from repo root:
#   docker build -f consultant-ui/Dockerfile .

FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/amline-ui-core ./packages/amline-ui-core
COPY consultant-ui/package.json consultant-ui/package-lock.json* ./consultant-ui/
WORKDIR /app/consultant-ui
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
