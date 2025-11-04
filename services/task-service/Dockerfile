FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY services/shared ./services/shared
COPY services/task-service ./services/task-service

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @acoustic/shared build
RUN pnpm --filter @acoustic/task-service build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/shared/package.json ./services/shared/
COPY --from=builder /app/services/task-service/dist ./services/task-service/dist
COPY --from=builder /app/services/task-service/package.json ./services/task-service/
COPY --from=builder /app/services/task-service/prisma ./services/task-service/prisma 2>/dev/null || true

ENV TZ=Asia/Tashkent
ENV NODE_ENV=production

EXPOSE $(grep PORT services/task-service/.env.example 2>/dev/null | cut -d= -f2 || echo 3000)

CMD ["sh", "-c", "cd services/task-service && ([ -d prisma ] && npx prisma generate || true) && node dist/index.js"]
