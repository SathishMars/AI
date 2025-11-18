# DevOps Deployment Guide

This guide provides step-by-step instructions for deploying the Workflows application to staging and production environments, including all required environment variables and nginx configuration.

## Prerequisites

- Access to target environment (staging/production)
- AWS KMS key configured in Rails
- Database access (MongoDB or DocumentDB)
- Nginx or reverse proxy access
- Environment variable management system (AWS Secrets Manager, etc.)

## Deployment Steps

### 1. Environment Preparation

#### 1.1 Create Environment Variables

Set the following environment variables in your deployment system (AWS ECS, Kubernetes, etc.):

```bash
# =============================================================================
# Authentication Configuration
# =============================================================================
AUTH_MODE=embedded
RAILS_BASE_URL=https://app.groupize.com
NEXT_PUBLIC_RAILS_BASE_URL=https://app.groupize.com
JWKS_URL=https://app.groupize.com/.well-known/jwks.json
JWT_ISSUER=groupize
JWT_AUDIENCE=workflows
COOKIE_NAME=gpw_session

# =============================================================================
# Application Configuration
# =============================================================================
NEXT_PUBLIC_BASE_PATH=/aime/aimeworkflows
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.groupize.com

# =============================================================================
# Database Configuration
# =============================================================================
DATABASE_ENVIRONMENT=documentdb  # or 'local' for MongoDB
DOCUMENTDB_URI=mongodb://user:password@docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/groupize-workflows?tls=true&tlsCAFile=/path/to/rds-ca-2019-root.pem
# OR for MongoDB:
# MONGODB_URI=mongodb://user:password@mongodb-host:27017/groupize-workflows

# =============================================================================
# AI/LLM Configuration
# =============================================================================
ANTHROPIC_API_KEY=sk-ant-your-production-key-here
ANTHROPIC_MODEL_WORKFLOW=claude-3-5-sonnet-20241022

# =============================================================================
# Port Configuration (if needed)
# =============================================================================
PORT=3001
```

#### 1.2 Environment-Specific Values

**Staging Environment:**
```bash
RAILS_BASE_URL=https://staging.groupize.com
NEXT_PUBLIC_RAILS_BASE_URL=https://staging.groupize.com
JWKS_URL=https://staging.groupize.com/.well-known/jwks.json
NEXT_PUBLIC_APP_URL=https://staging.groupize.com
NODE_ENV=staging
```

**Production Environment:**
```bash
RAILS_BASE_URL=https://app.groupize.com
NEXT_PUBLIC_RAILS_BASE_URL=https://app.groupize.com
JWKS_URL=https://app.groupize.com/.well-known/jwks.json
NEXT_PUBLIC_APP_URL=https://app.groupize.com
NODE_ENV=production
```

### 2. Build Application

#### 2.1 Install Dependencies

```bash
cd Workflows
npm ci --legacy-peer-deps
```

#### 2.2 Build for Production

```bash
npm run build
```

This creates an optimized production build in `.next/` directory.

### 3. Docker Configuration (if using containers)

#### 3.1 Dockerfile

Ensure your Dockerfile includes:

```dockerfile
FROM node:20.10.0-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001

CMD ["node", "server.js"]
```

#### 3.2 Build Docker Image

```bash
docker build -t workflows:latest .
```

### 4. Nginx Configuration

#### 4.1 Complete Nginx Configuration

Create or update your nginx configuration file:

```nginx
# Upstream configuration
upstream rails_upstream {
  server 127.0.0.1:3000;  # Or your Rails server address
  keepalive 64;
}

upstream next_upstream {
  server 127.0.0.1:3001;  # Or your Next.js server address
  keepalive 64;
}

# Required for $connection_upgrade var (WebSocket support)
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  listen [::]:80;
  server_name app.groupize.com;  # Update for your domain

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name app.groupize.com;  # Update for your domain

  # SSL Configuration
  ssl_certificate /path/to/ssl/cert.pem;
  ssl_certificate_key /path/to/ssl/key.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # Security Headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # ---- Next.js Workflows Micro-App: /aime/aimeworkflows/* ----
  # With basePath: '/aime/aimeworkflows' in next.config.ts
  # Pass the full path including /aime/aimeworkflows to Next.js
  location /aime/aimeworkflows/ {
    proxy_pass http://next_upstream;
    proxy_http_version 1.1;

    # Preserve host and forwarding info
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;

    # Support Next.js HMR websockets (for development)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    # Avoid double compression issues
    proxy_set_header Accept-Encoding "";

    # CRITICAL: Forward cookies so Next.js can read JWT
    proxy_set_header Cookie $http_cookie;

    # Don't cache to preserve authentication
    add_header Cache-Control "no-cache, no-store, must-revalidate";

    # Increased timeouts for AI workflow generation (can take 5+ minutes)
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    proxy_buffering off;
  }

  # Handle /aime/aimeworkflows without trailing slash
  location = /aime/aimeworkflows {
    return 301 /aime/aimeworkflows/;
  }

  # ---- Next.js Internal Routes (fonts, static assets, etc.) with basePath ----
  location ~ ^/aime/aimeworkflows/(__|_next)/ {
    proxy_pass http://next_upstream;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    # Cache static assets aggressively
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # ---- Next.js Internal Routes (fallback for routes without basePath) ----
  location ~ ^/(__|_next)/ {
    proxy_pass http://next_upstream;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    # Don't cache dev tools
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  # ---- Everything else → Rails ----
  location / {
    proxy_pass http://rails_upstream;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Cookie $http_cookie;

    proxy_set_header Accept-Encoding "";
  }

  # Helpful for debugging
  access_log /var/log/nginx/workflows.access.log;
  error_log  /var/log/nginx/workflows.error.log;
}
```

#### 4.2 Install Nginx Configuration

**macOS (Homebrew):**
```bash
sudo cp nginx.conf /opt/homebrew/etc/nginx/servers/workflows.conf
sudo brew services restart nginx
```

**Linux:**
```bash
sudo cp nginx.conf /etc/nginx/sites-available/workflows
sudo ln -s /etc/nginx/sites-available/workflows /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 5. Application Deployment

#### 5.1 Start Next.js Application

**Using PM2:**
```bash
pm2 start npm --name "workflows" -- start
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

**Using systemd:**
```bash
# Create service file: /etc/systemd/system/workflows.service
[Unit]
Description=Groupize Workflows Next.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/workflows
Environment=NODE_ENV=production
EnvironmentFile=/opt/workflows/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable workflows
sudo systemctl start workflows
```

**Using Docker:**
```bash
docker run -d \
  --name workflows \
  -p 3001:3001 \
  --env-file .env.production \
  workflows:latest
```

**Using AWS ECS:**
- Create ECS task definition with environment variables
- Deploy to ECS service
- Ensure task has access to AWS Secrets Manager for sensitive variables

### 6. Rails Configuration

#### 6.1 Verify Rails JWKS Endpoint

Ensure Rails is configured to expose JWKS endpoint:

```bash
# Test JWKS endpoint
curl https://app.groupize.com/.well-known/jwks.json

# Should return:
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "...",
      "use": "sig",
      "alg": "PS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

#### 6.2 Verify Rails JWT Configuration

Ensure Rails has these environment variables set:

```bash
JWT_GSSO_GROUPIZE_KEY_ID=arn:aws:kms:us-east-1:123456789:key/xxxx-xxxx-xxxx
JWT_ISSUER=groupize
JWT_AUDIENCE=workflows
```

### 7. Database Setup

#### 7.1 DocumentDB (Production)

```bash
# Ensure DocumentDB cluster is accessible
# Update security groups to allow Next.js application
# Test connection:
mongosh "mongodb://user:password@docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/groupize-workflows?tls=true&tlsCAFile=/path/to/rds-ca-2019-root.pem"
```

#### 7.2 MongoDB (Staging/Development)

```bash
# Ensure MongoDB is accessible
# Test connection:
mongosh "mongodb://user:password@mongodb-host:27017/groupize-workflows"
```

### 8. Health Checks

#### 8.1 Application Health Check

Create a health check endpoint or use Next.js default:

```bash
# Test application is running
curl https://app.groupize.com/aime/aimeworkflows/

# Should return HTML (not 502/503)
```

#### 8.2 Database Health Check

```bash
# Test database connection (from application server)
node -e "
const { MongoClient } = require('mongodb');
const uri = process.env.DOCUMENTDB_URI || process.env.MONGODB_URI;
MongoClient.connect(uri).then(client => {
  console.log('Database connected');
  client.close();
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});
"
```

### 9. Monitoring and Logging

#### 9.1 Application Logs

**PM2:**
```bash
pm2 logs workflows
```

**systemd:**
```bash
sudo journalctl -u workflows -f
```

**Docker:**
```bash
docker logs -f workflows
```

#### 9.2 Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/workflows.access.log

# Error logs
tail -f /var/log/nginx/workflows.error.log
```

#### 9.3 Set Up Monitoring

- **Application Metrics**: CPU, memory, response times
- **Authentication Metrics**: Token verification failures, renewal failures
- **Database Metrics**: Connection pool, query performance
- **Error Tracking**: Sentry, DataDog, or similar

### 10. Post-Deployment Verification

#### 10.1 Verify Authentication

1. Log into Rails application
2. Navigate to `/aime/aimeworkflows/`
3. Verify you're authenticated (check user context)
4. Verify token renewal is working (check browser network tab)

#### 10.2 Verify Service-to-Service Auth

1. Test Rails calling Next.js internal API:
```bash
# From Rails console or test script
token = WorkflowsServiceTokenService.generate(user: current_user)
response = HTTParty.get(
  'https://app.groupize.com/aime/aimeworkflows/api/internal/workflows',
  headers: { 'Authorization' => "Bearer #{token}" }
)
```

#### 10.3 Verify Database Access

1. Test workflow creation/retrieval
2. Verify data is scoped to account/org
3. Check database connection pool metrics

### 11. Rollback Procedure

If deployment fails:

#### 11.1 Application Rollback

**PM2:**
```bash
pm2 restart workflows --update-env
```

**systemd:**
```bash
sudo systemctl restart workflows
```

**Docker:**
```bash
docker stop workflows
docker run -d --name workflows -p 3001:3001 --env-file .env.production workflows:previous-version
```

**AWS ECS:**
- Revert to previous task definition
- Update service to use previous task definition

#### 11.2 Nginx Rollback

```bash
# Revert nginx config
sudo cp nginx.conf.backup /etc/nginx/sites-available/workflows
sudo nginx -t
sudo systemctl reload nginx
```

### 12. Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AUTH_MODE` | No | Authentication mode (default: `embedded`) | `embedded` |
| `RAILS_BASE_URL` | Yes | Rails application base URL | `https://app.groupize.com` |
| `NEXT_PUBLIC_RAILS_BASE_URL` | Yes | Rails URL (client-side accessible) | `https://app.groupize.com` |
| `JWKS_URL` | No | JWKS endpoint (defaults to `${RAILS_BASE_URL}/.well-known/jwks.json`) | `https://app.groupize.com/.well-known/jwks.json` |
| `JWT_ISSUER` | No | JWT issuer (default: `groupize`) | `groupize` |
| `JWT_AUDIENCE` | No | JWT audience (default: `workflows`) | `workflows` |
| `COOKIE_NAME` | No | JWT cookie name (default: `gpw_session`) | `gpw_session` |
| `NEXT_PUBLIC_BASE_PATH` | No | Next.js base path (default: `/aime/aimeworkflows`) | `/aime/aimeworkflows` |
| `NODE_ENV` | Yes | Node environment | `production` |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL | `https://app.groupize.com` |
| `DATABASE_ENVIRONMENT` | Yes | Database environment (`local` or `documentdb`) | `documentdb` |
| `DOCUMENTDB_URI` | Yes* | DocumentDB connection string | `mongodb://...` |
| `MONGODB_URI` | Yes* | MongoDB connection string | `mongodb://...` |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for AI features | `sk-ant-...` |
| `ANTHROPIC_MODEL_WORKFLOW` | No | Anthropic model (default: `claude-3-5-sonnet-20241022`) | `claude-3-5-sonnet-20241022` |
| `PORT` | No | Application port (default: `3001`) | `3001` |

*Required based on `DATABASE_ENVIRONMENT`

### 13. Troubleshooting

#### Issue: 502 Bad Gateway

**Causes:**
- Next.js application not running
- Wrong port in nginx upstream
- Application crashed

**Solutions:**
1. Check application is running: `pm2 status` or `systemctl status workflows`
2. Check application logs for errors
3. Verify port matches nginx upstream configuration
4. Restart application

#### Issue: Authentication Failures

**Causes:**
- JWKS endpoint not accessible
- Wrong `RAILS_BASE_URL`
- Cookie domain mismatch

**Solutions:**
1. Test JWKS endpoint: `curl ${RAILS_BASE_URL}/.well-known/jwks.json`
2. Verify `RAILS_BASE_URL` matches actual Rails URL
3. Check cookie domain matches (should be same domain or subdomain)
4. Verify Rails is setting `gpw_session` cookie

#### Issue: Database Connection Failures

**Causes:**
- Wrong connection string
- Network/firewall blocking
- Invalid credentials

**Solutions:**
1. Verify connection string format
2. Test connection from application server
3. Check security groups/firewall rules
4. Verify credentials in secrets manager

#### Issue: Static Assets Not Loading

**Causes:**
- Wrong `basePath` configuration
- Nginx not proxying `_next` routes correctly

**Solutions:**
1. Verify `NEXT_PUBLIC_BASE_PATH` matches nginx location blocks
2. Check nginx config includes `/_next/` location block
3. Verify nginx is proxying to correct upstream

### 14. Security Checklist

- [ ] All environment variables set in secrets manager (not in code)
- [ ] HTTPS enforced (SSL certificates valid)
- [ ] Secure cookies enabled (`Secure` flag)
- [ ] HttpOnly cookies enabled
- [ ] SameSite=Lax for cookies
- [ ] AWS KMS key configured in Rails
- [ ] Database credentials in secrets manager
- [ ] API keys in secrets manager
- [ ] Firewall rules restrict database access
- [ ] Monitoring and alerting configured
- [ ] Log rotation configured
- [ ] Backup strategy in place

## Summary

1. **Set environment variables** in your deployment system
2. **Build application** with `npm run build`
3. **Configure nginx** with provided configuration
4. **Deploy application** using your preferred method (PM2, systemd, Docker, ECS)
5. **Verify Rails JWKS endpoint** is accessible
6. **Test authentication** end-to-end
7. **Monitor logs** for errors
8. **Set up alerts** for critical failures

For questions or issues, contact the DevOps team.

