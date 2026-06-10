FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app
RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/core/package.json apps/core/package.json
COPY apps/dash/package.json apps/dash/package.json
COPY packages/agents-sdk/package.json packages/agents-sdk/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV="production"
ENV CLI2API_HOST="0.0.0.0"
ENV CLI2API_PORT="3000"
ENV CLI2API_DB="/data/cli2api.sqlite"
ENV CLI2API_DASH_DIST="/app/apps/dash/dist"

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/core/package.json ./apps/core/package.json
COPY --from=build /app/apps/core/dist ./apps/core/dist
COPY --from=build /app/apps/dash/package.json ./apps/dash/package.json
COPY --from=build /app/apps/dash/dist ./apps/dash/dist
COPY --from=build /app/packages/agents-sdk/package.json ./packages/agents-sdk/package.json
COPY --from=build /app/packages/agents-sdk/dist ./packages/agents-sdk/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "apps/core/dist/server.js"]
