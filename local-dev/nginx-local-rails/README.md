# Nginx Docker Configuration for Local Rails + Next.js

This directory contains the Docker-based nginx setup for reverse proxying between locally running Rails and Next.js applications.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser: http://groupize.local                        │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  nginx Docker Container (port 80)                      │
│  - Routes /aime/* → Next.js (port 3001 on host)       │
│  - Routes /* → Rails (port 3000 on host)              │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌─────────────────────────┐
│  Next.js         │         │  Rails                  │
│  localhost:3001  │         │  localhost:3000         │
│  /aime routes    │         │  All other routes       │
└──────────────────┘         └─────────────────────────┘
```

## Files

- **docker-compose.yml** - Docker Compose configuration for nginx container
- **nginx.conf** - Main nginx configuration (logging, gzip, etc.)
- **conf.d/default.conf** - Server configuration with proxy rules
- **start.sh** - Management script for the nginx container

## Quick Start

```bash
# Run automated setup (one time)
npm run setup:local-rails

# Or manually:
# 1. Add to /etc/hosts
echo "127.0.0.1 groupize.local" | sudo tee -a /etc/hosts

# 2. Start nginx
npm run nginx:local-rails

# 3. Start Rails
cd <rails-app-path>
rails s -p 3000

# 4. Start Next.js
npm run dev:local-rails

# 5. Visit http://groupize.local/aime
```

## Management Commands

All commands use the `start.sh` script via npm:

```bash
# Start nginx
npm run nginx:local-rails
npm run nginx:local-rails start

# Stop nginx
npm run nginx:local-rails stop

# Restart nginx
npm run nginx:local-rails restart

# Check status
npm run nginx:local-rails status

# View logs
npm run nginx:local-rails logs

# Health check
npm run nginx:local-rails health

# Help
npm run nginx:local-rails help
```

## Container Details

- **Container Name**: `groupize-workflows-nginx-local`
- **Image**: `nginx:alpine`
- **Ports**: 80 (HTTP only, no SSL)
- **Network**: `groupize-local` bridge network
- **Host Access**: Uses `host.docker.internal` to reach Rails/Next.js on host machine

## Configuration Details

### Proxy Rules

1. **Next.js Routes** (`/aime/*`)
   - Proxies to `http://host.docker.internal:3001`
   - Includes WebSocket support for HMR
   - Forwards cookies for JWT authentication
   - Extended timeouts (5+ minutes) for AI operations

2. **Next.js Internal Routes** (`/aime/_next/*`, `/aime/__nextjs*`)
   - Proxies to Next.js dev server
   - WebSocket support for HMR
   - Cache headers for fonts

3. **Rails Routes** (all others)
   - Proxies to `http://host.docker.internal:3000`
   - Forwards cookies for authentication
   - WebSocket support for ActionCable
   - Buffered responses

### Health Check

The container includes a health check that tests the `/health` endpoint:

```bash
# Manual health check
curl http://localhost/health

# Via management script (also tests Rails/Next.js connectivity)
npm run nginx:local-rails health
```

## Troubleshooting

### Nginx won't start

```bash
# Check if port 80 is in use
lsof -i :80

# Check Docker is running
docker info

# View container logs
docker logs groupize-workflows-nginx-local
npm run nginx:local-rails logs
```

### Can't access Rails or Next.js

```bash
# Test Rails directly
curl http://localhost:3000

# Test Next.js directly
curl http://localhost:3001/aime

# Run health check
npm run nginx:local-rails health
```

### "Connection refused" errors

1. Verify Rails is running: `lsof -i :3000`
2. Verify Next.js is running: `lsof -i :3001`
3. Check nginx logs: `npm run nginx:local-rails logs`
4. Verify `/etc/hosts` entry: `grep groupize.local /etc/hosts`

### DNS not resolving

```bash
# Flush DNS cache
# macOS:
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Linux:
sudo systemd-resolve --flush-caches
```

## Cleanup

```bash
# Stop nginx
npm run nginx:local-rails stop

# Remove /etc/hosts entry
sudo sed -i '' '/groupize.local/d' /etc/hosts  # macOS
sudo sed -i '/groupize.local/d' /etc/hosts     # Linux
```

## Comparison with Split-Routing Mode

| Feature | Local Rails Mode | Split-Routing Mode |
|---------|-----------------|-------------------|
| Rails location | localhost:3000 | testing.app.groupize.com |
| Next.js location | localhost:3001 | localhost:3000 |
| Domain | groupize.local | testing.app.groupize.com |
| SSL | No (HTTP only) | Yes (mkcert certificates) |
| nginx container | groupize-workflows-nginx-local | groupize-workflows-nginx |
| Use case | Full local development | Next.js dev with remote Rails |

## See Also

- [Main README](../../README.md) - Project setup and documentation
- [Split-Routing nginx](../nginx/) - nginx for testing.app.groupize.com
- [Setup Script](../setup-local-rails.sh) - Automated setup script
