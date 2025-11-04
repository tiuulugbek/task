FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY services/shared ./services/shared
COPY services/scheduler-service ./services/scheduler-service

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @acoustic/shared build
RUN pnpm --filter @acoustic/scheduler-service build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/shared/package.json ./services/shared/
COPY --from=builder /app/services/scheduler-service/dist ./services/scheduler-service/dist
COPY --from=builder /app/services/scheduler-service/package.json ./services/scheduler-service/

ENV TZ=Asia/Tashkent
ENV NODE_ENV=production

CMD ["node", "services/scheduler-service/dist/index.js"]
