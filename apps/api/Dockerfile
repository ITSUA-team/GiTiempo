# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

FROM base AS deps

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --filter @gitiempo/api...

FROM deps AS build

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN pnpm --filter @gitiempo/shared build \
  && pnpm --filter @gitiempo/api build

FROM base AS prod-deps

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --prod --filter @gitiempo/api...

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV="development"
ENV PORT="3000"

WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/package.json ./package.json
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api ./apps/api
COPY --from=prod-deps --chown=node:node /app/packages/shared ./packages/shared
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /app/packages/shared/openapi.json ./packages/shared/openapi.json

USER node
WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
