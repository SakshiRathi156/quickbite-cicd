# QuickBite container for Google Cloud Run.
# One container serves both the React site and the Node.js API (Express serves the build).

# Stage 1: build the React frontend
FROM node:20-slim AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Stage 2: production API image
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY backend/src ./src
COPY backend/db ./db
COPY --from=web /web/dist ./public

# Commit id shown in the site footer and checked by the smoke test.
ARG COMMIT=local
ARG BUILD_ID=local
RUN echo "{\"commit\":\"$COMMIT\",\"builtAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"buildId\":\"$BUILD_ID\"}" > version.json

USER node
# Cloud Run sets PORT (8080); config.js reads it.
CMD ["node", "src/server.js"]
