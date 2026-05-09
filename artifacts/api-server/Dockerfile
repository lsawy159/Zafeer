# Stage 1: Build
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

FROM base AS builder
WORKDIR /workspace

# Copy workspace manifests first (layer cache)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install only api-server deps (and its workspace deps)
RUN pnpm install --frozen-lockfile --filter @workspace/api-server...

# Copy source
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Build (esbuild bundles into dist/index.mjs)
RUN pnpm --filter @workspace/api-server run build

# Create flat node_modules for production (pino workers need runtime node_modules)
RUN pnpm --filter @workspace/api-server deploy --prod /prod/deploy

# Stage 2: Run
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Flat node_modules from pnpm deploy (pino workers need these at runtime)
COPY --from=builder /prod/deploy/node_modules ./node_modules

# Bundled server
COPY --from=builder /workspace/artifacts/api-server/dist ./dist

RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node --input-type=module -e \
    "const r = await fetch('http://localhost:' + process.env.PORT + '/api/healthz'); process.exit(r.ok ? 0 : 1);"

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
