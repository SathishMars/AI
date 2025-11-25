# ---- Stage 1: Base ----
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=development

# Copy package files
COPY package*.json ./

# Install dependencies for build and dev
RUN npm install

# Copy source files
COPY . .

# ---- Stage 2: Build for Production ----
FROM base AS builder
ENV NODE_ENV=production

# optout of tracking telemetry from nextjs
RUN npx next telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app (ensure next.config.js has output: 'standalone')
RUN npm run build

# ---- Stage 3: Production Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Ensures accessible by IP address, not internal DNS
ENV HOST=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy production build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Install curl and certificates, download AWS RDS combined CA bundle for DocumentDB TLS
# Store it at /app/rds-combined-ca-bundle.pem and make it readable by the app
# Ensure certificates are available, download AWS RDS combined CA bundle with wget
# Store it at /app/rds-combined-ca-bundle.pem and make it readable by the app
RUN apk add --no-cache ca-certificates \
  && wget -qO /app/rds-combined-ca-bundle.pem "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" \
  && chmod 0444 /app/rds-combined-ca-bundle.pem

# Path to DocumentDB CA bundle available to the application
ENV DOCUMENTDB_CA_FILE_PATH=/app/rds-combined-ca-bundle.pem

# optout of tracking telemetry from nextjs
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next telemetry disable

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js standalone server
CMD ["node", "server.js"]

EXPOSE 3000
USER nextjs
