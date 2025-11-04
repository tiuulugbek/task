FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY services/shared ./services/shared
COPY services/user-service ./services/user-service

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @acoustic/shared build
RUN pnpm --filter @acoustic/user-service build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/shared/package.json ./services/shared/
COPY --from=builder /app/services/user-service/dist ./services/user-service/dist
COPY --from=builder /app/services/user-service/package.json ./services/user-service/
COPY --from=builder /app/services/user-service/prisma ./services/user-service/prisma

ENV TZ=Asia/Tashkent
ENV NODE_ENV=production

EXPOSE 3002

CMD ["sh", "-c", "cd services/user-service && npx prisma generate && node dist/index.js"]
