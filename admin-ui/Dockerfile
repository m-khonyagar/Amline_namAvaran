# Admin UI Dockerfile
# اَملاین - Amline Platform

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Vite: متغیرها فقط در زمان build (برای staging مقدار بدهید)
ARG VITE_API_URL=
ARG VITE_USE_MSW=false
ARG VITE_ENABLE_DEV_BYPASS=false
ARG VITE_USE_CRM_API=true
ENV VITE_API_URL=$VITE_API_URL \
    VITE_USE_MSW=$VITE_USE_MSW \
    VITE_ENABLE_DEV_BYPASS=$VITE_ENABLE_DEV_BYPASS \
    VITE_USE_CRM_API=$VITE_USE_CRM_API

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
