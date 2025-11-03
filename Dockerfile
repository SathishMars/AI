# ---- Stage 1: Base ----
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=development

# Copy package files
COPY package*.json ./

# Install dependencies for dev & build
RUN npm install

# Copy all project files
COPY . .

# ---- Stage 2: Build for Production ----
FROM base AS builder
ENV NODE_ENV=production

#Set base path before build
ARG BASE_PATH=/n
ENV NEXT_PUBLIC_BASE_PATH=${BASE_PATH}

# Ensure standalone output is enabled in next.config.js
RUN npm run build

# ---- Stage 3: Production Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app

# Set production env
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy only the build output for production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command: if NODE_ENV=production → start server.js; else → start dev mode
CMD if [ "$NODE_ENV" = "production" ]; then \
      node server.js; \
    else \
      npm run dev -- --hostname 0.0.0.0; \
    fi

EXPOSE 3000

USER nextjs
