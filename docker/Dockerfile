# Image dùng chung cho `web` (next start) và `worker` (tsx worker/index.ts) – 00-CONG-NGHE-QUY-UOC mục 13.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm db:generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN useradd --uid 1001 --create-home app
COPY --from=build --chown=app /app/.next/standalone ./
COPY --from=build --chown=app /app/.next/static ./.next/static
COPY --from=build --chown=app /app/public ./public
# worker + migration cần mã nguồn và node_modules đầy đủ
COPY --from=build --chown=app /app/node_modules ./node_modules
COPY --from=build --chown=app /app/prisma ./prisma
COPY --from=build --chown=app /app/lib ./lib
COPY --from=build --chown=app /app/worker ./worker
COPY --from=build --chown=app /app/tsconfig.json /app/package.json ./
RUN mkdir -p /app/storage/public /app/storage/private && chown -R app /app/storage
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
