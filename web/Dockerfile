FROM node:20-alpine AS builder

WORKDIR /app

COPY web/package.json web/pnpm-lock.yaml* ./web/
COPY web ./web

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN cd web && pnpm install --frozen-lockfile
RUN cd web && pnpm build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/web/.next ./web/.next
COPY --from=builder /app/web/node_modules ./web/node_modules
COPY --from=builder /app/web/package.json ./web/
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/next.config.js ./web/

ENV TZ=Asia/Tashkent
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "web/node_modules/.bin/next", "start", "-p", "3000"]
