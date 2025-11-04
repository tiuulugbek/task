FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml tsconfig.json ./
COPY services/shared ./services/shared
COPY services/api-gateway ./services/api-gateway

RUN corepack enable && corepack prepare pnpm@latest --activate
# Install with devDependencies for building
RUN NODE_ENV=development pnpm install --frozen-lockfile
RUN pnpm --filter @acoustic/shared build
RUN pnpm --filter @acoustic/api-gateway build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/shared/package.json ./services/shared/
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist
COPY --from=builder /app/services/api-gateway/package.json ./services/api-gateway/

ENV TZ=Asia/Tashkent
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "services/api-gateway/dist/index.js"]
