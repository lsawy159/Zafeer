FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

FROM base AS builder
WORKDIR /workspace

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/zafeer/package.json ./artifacts/zafeer/

RUN pnpm install --frozen-lockfile --filter @workspace/zafeer...

COPY lib/ ./lib/
COPY artifacts/zafeer/ ./artifacts/zafeer/

ARG BASE_PATH=/
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SENTRY_DSN=
ARG VITE_USE_NEW_PAYROLL_RPC=false
ARG VITE_EMAIL_QUEUE_MODE=normal
ARG VITE_DEBUG_LOGS=false

ENV BASE_PATH=$BASE_PATH
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_USE_NEW_PAYROLL_RPC=$VITE_USE_NEW_PAYROLL_RPC
ENV VITE_EMAIL_QUEUE_MODE=$VITE_EMAIL_QUEUE_MODE
ENV VITE_DEBUG_LOGS=$VITE_DEBUG_LOGS

RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY"
RUN pnpm --filter @workspace/zafeer run build

FROM nginx:1.27-alpine AS runner
COPY artifacts/zafeer/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/artifacts/zafeer/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
