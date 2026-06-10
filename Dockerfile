FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app
RUN corepack enable

FROM base AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/core/package.json apps/core/package.json
COPY apps/dash/package.json apps/dash/package.json
COPY packages/agents-sdk/package.json packages/agents-sdk/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild better-sqlite3

FROM deps AS build

COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS dash-runtime

COPY docker/dash.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/dash/dist /usr/share/nginx/html

EXPOSE 80

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV="production"
ENV CLI2API_HOST="0.0.0.0"
ENV CLI2API_PORT="3000"
ENV CLI2API_HOME="~/.cli2api"
ENV CLI2API_DASH_DIST="/app/apps/dash/dist"

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/core/package.json ./apps/core/package.json
COPY --from=build /app/apps/core/node_modules ./apps/core/node_modules
COPY --from=build /app/apps/core/dist ./apps/core/dist
COPY --from=build /app/apps/dash/package.json ./apps/dash/package.json
COPY --from=build /app/apps/dash/dist ./apps/dash/dist
COPY --from=build /app/packages/agents-sdk/package.json ./packages/agents-sdk/package.json
COPY --from=build /app/packages/agents-sdk/node_modules ./packages/agents-sdk/node_modules
COPY --from=build /app/packages/agents-sdk/dist ./packages/agents-sdk/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

RUN mkdir -p /root/.cli2api

EXPOSE 3000

CMD ["node", "apps/core/dist/server.js"]
