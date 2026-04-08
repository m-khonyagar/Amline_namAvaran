# Amline user UI (Next.js) — build with repo root as context (needs packages/amline-ui-core).
FROM node:20-alpine AS deps
WORKDIR /app/amline-ui
COPY amline-ui/package.json amline-ui/package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/amline-ui-core /app/packages/amline-ui-core
COPY admin-ui /app/admin-ui
WORKDIR /app/amline-ui
COPY --from=deps /app/amline-ui/node_modules ./node_modules
COPY amline-ui/ ./
ENV NEXT_TELEMETRY_DISABLED=1
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
