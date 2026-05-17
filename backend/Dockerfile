# Build: Alpine is fine here (not scanned in final image).
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Runtime: Debian bookworm with security upgrades (patched libc6 / openssl).
FROM node:20-bookworm-slim AS runtime
RUN apt-get update \
  && apt-get upgrade -y --no-install-recommends \
  && apt-get install -y --no-install-recommends ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app
ENV NODE_ENV=production
# SEC: numeric UID required when pod securityContext.runAsNonRoot is true.
COPY --chown=1000:1000 --from=build /app /app
USER 1000
CMD ["node", "server.js"]
