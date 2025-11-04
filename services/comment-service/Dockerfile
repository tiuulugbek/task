FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY services/shared ./services/shared
COPY services/comment-service ./services/comment-service

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @acoustic/shared build
RUN pnpm --filter @acoustic/comment-service build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/shared/package.json ./services/shared/
COPY --from=builder /app/services/comment-service/dist ./services/comment-service/dist
COPY --from=builder /app/services/comment-service/package.json ./services/comment-service/
COPY --from=builder /app/services/comment-service/prisma ./services/comment-service/prisma

ENV TZ=Asia/Tashkent
ENV NODE_ENV=production

EXPOSE 3006

CMD ["sh", "-c", "cd services/comment-service && npx prisma generate && node dist/index.js"]
