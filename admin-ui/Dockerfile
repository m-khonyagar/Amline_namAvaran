# Admin UI — build از ریشهٔ مونوریپو (npm workspaces)
# اجرا از ریشهٔ مخزن:
#   docker build -f admin-ui/Dockerfile .

FROM node:20-bookworm-slim AS builder

WORKDIR /repo

COPY package.json package-lock.json turbo.json ./
COPY packages/amline-ui-core/package.json ./packages/amline-ui-core/
COPY packages/amline-openapi-types/package.json ./packages/amline-openapi-types/
COPY admin-ui/package.json ./admin-ui/
COPY amline-ui/package.json ./amline-ui/
COPY consultant-ui/package.json ./consultant-ui/
COPY site/package.json ./site/

RUN npm ci

COPY packages/amline-ui-core ./packages/amline-ui-core
COPY admin-ui ./admin-ui

RUN npm run build -w @amline/ui-core

WORKDIR /repo/admin-ui

ARG VITE_API_URL=
ARG VITE_USE_MSW=false
ARG VITE_ENABLE_DEV_BYPASS=false
ARG VITE_USE_CRM_API=true
ENV VITE_API_URL=$VITE_API_URL \
    VITE_USE_MSW=$VITE_USE_MSW \
    VITE_ENABLE_DEV_BYPASS=$VITE_ENABLE_DEV_BYPASS \
    VITE_USE_CRM_API=$VITE_USE_CRM_API

# Vite bundle only (full `tsc` includes tests/mocks that are not build artifacts)
RUN node scripts/assert-safe-production-env.mjs && npx vite build

FROM nginx:alpine

COPY admin-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/admin-ui/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
