FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY services/shared ./services/shared
COPY services/telegram-bot-service ./services/telegram-bot-service

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @acoustic/shared build
RUN pnpm --filter @acoustic/telegram-bot-service build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/shared/package.json ./services/shared/
COPY --from=builder /app/services/telegram-bot-service/dist ./services/telegram-bot-service/dist
COPY --from=builder /app/services/telegram-bot-service/package.json ./services/telegram-bot-service/

ENV TZ=Asia/Tashkent
ENV NODE_ENV=production

EXPOSE 3009

CMD ["node", "services/telegram-bot-service/dist/index.js"]
