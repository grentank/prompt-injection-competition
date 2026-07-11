FROM node:20-alpine AS builder

WORKDIR /build
COPY client/package*.json ./client/
RUN cd client && npm ci || npm install
COPY client/ ./client/
RUN cd client && npm run build

FROM node:20-alpine

WORKDIR /app

COPY master/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY master/ ./
COPY --from=builder /build/master/dist ./dist

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["sh", "-c", "node node_modules/sequelize-cli/lib/sequelize db:migrate && (node node_modules/sequelize-cli/lib/sequelize db:seed:all || true) && node src/server.js"]
