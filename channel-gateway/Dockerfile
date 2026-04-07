FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
ENV CHANNEL_GATEWAY_PORT=3090
ENV AMLINE_PUBLIC_URL=https://app.amline.ir
EXPOSE 3090
CMD ["node", "dist/server.js"]
