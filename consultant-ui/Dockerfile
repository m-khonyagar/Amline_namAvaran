# Consultant UI — build from repo root (workspaces + @amline/ui-core):
#   docker build -f consultant-ui/Dockerfile .

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages/amline-ui-core/package.json ./packages/amline-ui-core/
COPY packages/amline-openapi-types/package.json ./packages/amline-openapi-types/
COPY admin-ui/package.json ./admin-ui/
COPY amline-ui/package.json ./amline-ui/
COPY consultant-ui/package.json ./consultant-ui/
COPY site/package.json ./site/

RUN npm ci

COPY packages/amline-ui-core ./packages/amline-ui-core
COPY consultant-ui ./consultant-ui

RUN npm run build -w @amline/ui-core

WORKDIR /app/consultant-ui
RUN npm run build

FROM nginx:alpine
COPY consultant-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/consultant-ui/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
