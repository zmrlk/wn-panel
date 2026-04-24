# syntax=docker/dockerfile:1.7
# Multi-stage build dla wn-panel (SvelteKit + adapter-node + Postgres)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_APP_COMMIT=unknown
ENV NODE_ENV=production
# Stub env vars wymagane przez SvelteKit prerender stage (importuje $lib/server/*).
# Real values come from runtime .env — never used at runtime.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build \
    KEYCLOAK_ISSUER=https://build.invalid/realms/build \
    KEYCLOAK_CLIENT_ID=build \
    KEYCLOAK_CLIENT_SECRET=build-stub
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata wget \
    && ln -sf /usr/share/zoneinfo/Europe/Warsaw /etc/localtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TZ=Europe/Warsaw
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/static ./static
COPY --from=build /app/drizzle ./drizzle
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "build"]
