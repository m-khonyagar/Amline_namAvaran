# Amline user UI (Next.js) — build with repo root as context (workspaces + @amline/ui-core).

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
COPY admin-ui ./admin-ui
COPY amline-ui ./amline-ui

RUN npm run build -w @amline/ui-core

WORKDIR /app/amline-ui
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* باید در زمان بیلد باشد (در باندل کلاینت درج می‌شود؛ env زمان اجرا کافی نیست)
ARG NEXT_PUBLIC_API_BASE_URL=http://backend:8000
ARG NEXT_PUBLIC_DEV_PROXY_TARGET=
ARG NEXT_PUBLIC_ENABLE_DEV_BYPASS=false
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_DEV_PROXY_TARGET=$NEXT_PUBLIC_DEV_PROXY_TARGET \
    NEXT_PUBLIC_ENABLE_DEV_BYPASS=$NEXT_PUBLIC_ENABLE_DEV_BYPASS
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/amline-ui/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/amline-ui/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/amline-ui/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
