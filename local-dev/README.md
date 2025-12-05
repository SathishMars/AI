# Local Development Proxy Setup

**Run Workflows Next.js app in two modes:**
- **Local Embedded:** Both Rails + Next.js on your machine
- **Split-Routing:** Next.js locally with real testing Rails API (no local Rails needed!)

## 📖 Complete Documentation

**→ See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for full instructions**

## ⚡ Quick Start

### Local Development (Both Apps Local)

```bash
# Install nginx config
cd local-dev
cp nginx.local.conf /opt/homebrew/etc/nginx/servers/groupize.local.conf
brew services restart nginx

# In other terminals: Start Rails (port 3000) + Next.js (port 3001)
# Visit: http://groupize.local/
```

### Split-Routing (Real Testing + Local Next.js)

```bash
# Set up nginx config (one-time)
cd local-dev
cp nginx.testing.example nginx.testing.conf
nano nginx.testing.conf
# Replace YOUR_USERNAME with your actual username

cp nginx.testing.conf /opt/homebrew/etc/nginx/servers/testing.app.groupize.com.conf
brew services restart nginx

# In another terminal: Start Next.js (port 3000)
# Visit: https://testing.app.groupize.com/
```

## 📋 Prerequisites

1. Install nginx:
   ```
   brew install nginx
   ```

2. Add to `/etc/hosts`:
   ```
   127.0.0.1 groupize.local
   127.0.0.1 testing.app.groupize.com
   ```

3. For split-routing:
   - Generate mkcert certificates (see SETUP_GUIDE.md)
   - Create `nginx.testing.conf` from `nginx.testing.example`
   - Create `.env.testing` from `.env.example` (with split-routing values)

**For complete setup instructions, troubleshooting, and details:**

→ **[Read SETUP_GUIDE.md](./SETUP_GUIDE.md)**
