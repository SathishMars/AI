# Local Development Proxy Setup

**Run Workflows Next.js app in two modes:**
- **Local Embedded:** Both Rails + Next.js on your machine
- **Split-Routing:** Next.js locally with real testing Rails API (no local Rails needed!)

## 📖 Complete Documentation

**→ See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for full instructions**

## ⚡ Quick Start

### Local Development (Both Apps Local)

```bash
cd /Users/mdarwin/Projects/Workflows/local-dev
caddy run --config Caddyfile.local

# In other terminals: Start Rails (port 3000) + Next.js (port 3001)
# Visit: http://groupize.local/
```

### Split-Routing (Real Testing + Local Next.js)

```bash
cd /Users/mdarwin/Projects/Workflows/local-dev
sudo caddy run --config Caddyfile.testing

# In another terminal: Start Next.js (port 3000)
# Visit: https://testing.app.groupize.com/
```

## 📋 Prerequisites

1. Add to `/etc/hosts`:
   ```
   127.0.0.1 groupize.local
   127.0.0.1 testing.app.groupize.com
   ```

2. For split-routing:
   - Create `Caddyfile.testing` from `Caddyfile.testing.example`
   - Create `.env.testing` from `.env.example` (with split-routing values)

**For complete setup instructions, troubleshooting, and details:**

→ **[Read SETUP_GUIDE.md](./SETUP_GUIDE.md)**
