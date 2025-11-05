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

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js standalone server
CMD ["node", "server.js"]

EXPOSE 3000
USER nextjs
