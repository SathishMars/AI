# Stage 1: Build the Next.js application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using npm
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy application source (includes .env.local if it exists)
COPY . .

# Validate that .env.local exists (required for build)
RUN if [ ! -f .env.local ]; then \
      echo "ERROR: .env.local file not found!"; \
      echo "Please ensure .env.local exists in your project root before building."; \
      exit 1; \
    fi

# Build the Next.js application
RUN npm run build

# Stage 2: Create the final production image
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output from the builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy the .env.local file to the runner stage
COPY --from=builder /app/.env.local ./.env.local

# Change ownership to the nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set the port environment variable
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the Next.js application
CMD ["node", "server.js"]