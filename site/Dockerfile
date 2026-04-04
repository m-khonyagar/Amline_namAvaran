# سایت مارکتینگ — خروجی static export؛ بیلد از ریشهٔ مونوریپو
#   docker build -f site/Dockerfile .

FROM node:20-alpine AS builder

WORKDIR /repo

COPY package.json package-lock.json turbo.json ./
COPY packages/amline-ui-core/package.json ./packages/amline-ui-core/
COPY site/package.json ./site/

RUN npm ci

COPY packages/amline-ui-core ./packages/amline-ui-core
COPY site ./site

WORKDIR /repo/site
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /repo/site/out /usr/share/nginx/html
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
