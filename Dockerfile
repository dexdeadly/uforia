# ─────────────────────────────────────────────────────────────────────────────
# Uforia — production Docker image
# Multi-stage build: install deps, build, then run a slim runtime image.
# ─────────────────────────────────────────────────────────────────────────────

# ---- Dependencies ----------------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Native modules (sharp, onnxruntime, tesseract) need build tooling + libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock* ./
# Use a relaxed install so the lockfile differences across registries don't break builds.
RUN corepack enable && yarn install --network-timeout 600000

# ---- Builder ---------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client must be generated before the Next.js build.
RUN npx prisma generate
# Build (use the default .next dist dir inside the container).
ENV NEXT_DIST_DIR=.next
RUN yarn build

# ---- Runtime ---------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_DIST_DIR=.next
ENV PORT=3000

# Runtime libs required by sharp / tesseract.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

# Push the schema (idempotent) then start the server.
CMD ["sh", "-c", "npx prisma db push --skip-generate && yarn start"]
