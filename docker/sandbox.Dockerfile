FROM node:20-alpine

RUN apk add --no-cache python3 py3-pip

WORKDIR /app

COPY sandbox/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY sandbox/ ./

RUN mkdir -p /workspace /data
RUN chmod +x scripts/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4100
ENV DB_PATH=/data/shop.sqlite
ENV WORKSPACE_PATH=/workspace

EXPOSE 4100

CMD ["sh", "scripts/entrypoint.sh"]
