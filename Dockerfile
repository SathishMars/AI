# -----------------------------
# 1️⃣ Base image
# -----------------------------
FROM node:20-alpine

WORKDIR /app

# Install git
RUN apk add --no-cache git

# Build-time argument
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
ENV PORT=3000

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy all source code
COPY . .

# Build only if not in development
RUN if [ "$NODE_ENV" != "development" ]; then npm run build; fi

# Expose port
EXPOSE 3000

# CMD based on NODE_ENV
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then npm run dev; else npm start; fi"]
