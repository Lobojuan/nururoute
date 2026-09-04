# NuruNode API — container image for Fly.io / Railway / Render.
# Build from the repository root:  docker build -f deploy/api.Dockerfile -t nurunode-api .
FROM oven/bun:1 AS base
WORKDIR /app

# Workspace manifests first for layer caching
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY packages/ledger/package.json packages/ledger/
COPY packages/payment-adapters/package.json packages/payment-adapters/
COPY packages/provider-adapters/package.json packages/provider-adapters/
RUN bun install --frozen-lockfile --ignore-scripts

COPY apps/api apps/api
COPY packages packages

ENV NODE_ENV=production
ENV API_PORT=4000
EXPOSE 4000
WORKDIR /app/apps/api
# Run pending migrations, then start Fastify.
CMD ["sh", "-c", "bun run migrate && bun run start"]
