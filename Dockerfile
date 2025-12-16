# ---- Stage 1: Base ----
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=development

# Copy package files
COPY package*.json ./


# Copy source files
COPY . .
# Clear any stale modules and reinstall (just to be safe)
RUN rm -rf node_modules .next

# Install dependencies for build and dev
RUN npm install


# ---- Stage 2: Build for Production ----
FROM base AS builder
ENV NODE_ENV=production


# Set NEXT_PUBLIC_BASE_PATH for build-time embedding
ENV NEXT_PUBLIC_BASE_PATH=/aime

# optout of tracking telemetry from nextjs
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app (ensure next.config.js has output: 'standalone')
RUN npm run build

# ---- Stage 3: Production Runtime ----
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0


# (Optional) Pass runtime base path if needed for dynamic overrides
ENV NEXT_PUBLIC_BASE_PATH=/aime

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy production build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Ensure certificates are available, download AWS RDS combined CA bundle with wget
# Store it at /app/rds-combined-ca-bundle.pem and make it readable by the app
RUN apt-get update && apt-get install -y ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

# Download RDS CA bundle
RUN wget -qO /app/rds-combined-ca-bundle.pem "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" \
  && chmod 0444 /app/rds-combined-ca-bundle.pem

# Path to DocumentDB CA bundle available to the application
ENV DOCUMENTDB_CA_FILE_PATH=/app/rds-combined-ca-bundle.pem


# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/aime/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3000
USER nextjs

# Start Next.js standalone server
CMD ["node", "server.js"]
