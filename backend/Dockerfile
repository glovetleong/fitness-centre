# Build stage: install production dependencies only.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Runtime: distroless — no bundled npm (avoids tar/cross-spawn/glob CVEs in base node image).
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
USER nonroot
CMD ["server.js"]
