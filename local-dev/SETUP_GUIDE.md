# Local Development Setup Guide

**Complete guide for running the Workflows Next.js app in different modes**

---

## 📋 Quick Overview

Two development modes available:

1. **Local Embedded** - Both Rails and Next.js running on your machine (`http://groupize.local`)
   - Use when: Working on full-stack features or need to modify Rails
   
2. **Split-Routing** - Local Next.js only, uses real testing Rails API (`https://testing.app.groupize.com`)
   - Use when: Working on Next.js/AI features without needing Rails locally
   - Benefits: Faster setup, real authentication/data, no Rails server needed

**Using nginx** for reliable HTTP proxying with stable WebSocket connections.

---

## 🚀 One-Time Setup

### Step 1: Install nginx

```bash
# Install nginx
brew install nginx
```

### Step 2: Configure /etc/hosts

```bash
sudo nano /etc/hosts
```

Add these two lines at the end:

```
127.0.0.1 groupize.local
127.0.0.1 testing.app.groupize.com
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

**Verify:**
```bash
ping -c 2 groupize.local
ping -c 2 testing.app.groupize.com
# Both should resolve to 127.0.0.1
```

---

## 🏠 Mode 1: Local Embedded Development

Run both Rails and Next.js locally on your machine.

### One-Time Setup for Local Embedded

```bash
# Copy nginx config to nginx servers directory
cd /Users/mdarwin/Projects/Workflows/local-dev
cp nginx.local.conf /opt/homebrew/etc/nginx/servers/groupize.local.conf

# Start nginx
brew services restart nginx
```

### Start Everything

```bash
# nginx should already be running from setup above
# If not, restart it:
brew services restart nginx

# Terminal 1: Start Rails (port 3000)
cd /Users/mdarwin/Projects/reg_app
bin/rails server -p 3000

# Terminal 2: Start Next.js (port 3001)
cd /Users/mdarwin/Projects/Workflows
npm run dev -- -p 3001
```

### Test It

Open browser: `http://groupize.local/`

- Main app (Rails): `http://groupize.local/`
- Workflows (Next.js): `http://groupize.local/aime/`

### Stop It

```bash
# Stop Rails and Next.js
# Press Ctrl+C in each terminal

# Stop nginx (if needed)
brew services stop nginx
```

---

## 🔀 Mode 2: Split-Routing (Real Testing Auth + Local Next.js)

**Purpose:** Develop on Next.js locally WITHOUT running Rails. Use the real testing environment's Rails API and JWT authentication.

**Why this is useful:**
- No need to run Rails locally (saves setup time and resources)
- Use real testing data and authentication
- Your local Next.js receives actual JWT tokens from testing.app.groupize.com
- Speeds up AI team development - focus on Next.js only

### One-Time Setup for Split-Routing

#### A. Create SSL Certificates

```bash
# Install mkcert
brew install mkcert nss

# Initialize mkcert
mkcert -install

# Create certificate directory
mkdir -p ~/.local-dev-certs
cd ~/.local-dev-certs

# Generate certificate
mkcert testing.app.groupize.com

# Verify
ls -la
# Should see: testing.app.groupize.com.pem and testing.app.groupize.com-key.pem
```

#### B. Create Your Personal Configs

Create personal copies of the templates:

```bash
cd /Users/mdarwin/Projects/Workflows

# 1. Create nginx config
cd local-dev
cp nginx.testing.example nginx.testing.conf

# Edit to replace YOUR_USERNAME with your actual username
nano nginx.testing.conf
# Find and replace: YOUR_USERNAME → mdarwin (or your username)
# Save and exit

# Install to nginx servers directory
cp nginx.testing.conf /opt/homebrew/etc/nginx/servers/testing.app.groupize.com.conf

# 2. Create environment config for Next.js
cd ..
cp .env.example .env.testing

# Edit to use split-routing values (see comments in .env.example):
nano .env.testing
# Update these values:
#   RAILS_BASE_URL=https://104.18.10.206
#   NEXT_PUBLIC_RAILS_BASE_URL=https://104.18.10.206
#   NEXT_PUBLIC_APP_URL=https://testing.app.groupize.com
# Keep your API keys and other secrets
```

**Note:** If testing.app.groupize.com's IP ever changes:
- Update line 109 in `nginx.testing.conf`
- Update the RAILS_BASE_URL values in `.env.testing`
- See `.env.example` for instructions on finding the new IP
- Reinstall the config: `cp nginx.testing.conf /opt/homebrew/etc/nginx/servers/testing.app.groupize.com.conf`
- Restart nginx: `brew services restart nginx`

### Daily Use - Split-Routing

```bash
# Make sure nginx is running with the testing config
brew services restart nginx

# Start Next.js with testing environment config
cd /Users/mdarwin/Projects/Workflows
npm run dev
# Automatically uses .env.testing if it exists (points to real testing Rails API)
```

### Test It

Open browser: `https://testing.app.groupize.com/`

**Expected behavior:**
- Visit `/` → See real testing environment login
- Log in with your testing credentials
- Browse around → Real testing data
- Visit `/aime/` → Your LOCAL Next.js dev server
- Auth cookies work seamlessly between both!

### Stop It

```bash
# Stop Next.js
# Press Ctrl+C in the terminal

# Stop nginx (if needed)
brew services stop nginx
```

---

## 🔄 Switching Between Modes

### To Local Embedded

```bash
# Make sure local config is installed
cd /Users/mdarwin/Projects/Workflows/local-dev
cp nginx.local.conf /opt/homebrew/etc/nginx/servers/groupize.local.conf

# Remove testing config (if present)
rm -f /opt/homebrew/etc/nginx/servers/testing.app.groupize.com.conf

# Restart nginx
brew services restart nginx

# Start Rails (port 3000) + Next.js (port 3001)
```

### To Split-Routing

```bash
# Make sure testing config is installed
cd /Users/mdarwin/Projects/Workflows/local-dev
cp nginx.testing.conf /opt/homebrew/etc/nginx/servers/testing.app.groupize.com.conf

# Remove local config (if present)
rm -f /opt/homebrew/etc/nginx/servers/groupize.local.conf

# Restart nginx
brew services restart nginx

# Start Next.js (port 3000)
```

### To Real Servers (No Local Proxy)

```bash
# Stop nginx
brew services stop nginx

# Comment out /etc/hosts
sudo nano /etc/hosts
# Add # in front of both lines:
# # 127.0.0.1 groupize.local
# # 127.0.0.1 testing.app.groupize.com

# Now browser goes directly to real servers
```

---

## 📊 Quick Reference Table

| Mode | nginx Config | Rails Port | Next.js Port | URL | What's Local | What's Remote |
|------|-------------|------------|--------------|-----|--------------|---------------|
| **Local Embedded** | `nginx.local.conf` | 3000 | 3001 | `http://groupize.local` | Both apps | Nothing |
| **Split-Routing** | `nginx.testing.conf` | - | 3000 | `https://testing.app.groupize.com` | Next.js only | Everything else |
| **No Proxy** | (nginx stopped) | - | - | Real URLs | Nothing | Everything |

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000
sudo lsof -i :3001

# Stop nginx
brew services stop nginx
```

### DNS Not Resolving

```bash
# Check /etc/hosts
cat /etc/hosts | grep -E "groupize|testing"

# Should show:
# 127.0.0.1 groupize.local
# 127.0.0.1 testing.app.groupize.com

# Flush DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### Certificate Errors (Split-Routing)

```bash
# Reinstall mkcert CA
mkcert -install

# Regenerate certificates
cd ~/.local-dev-certs
mkcert testing.app.groupize.com

# Restart nginx
brew services restart nginx
```

### "Permission denied" on Port 443

nginx installed via Homebrew should handle privileged ports automatically. If you get permission errors:

```bash
# Check nginx is installed correctly
brew services list | grep nginx

# Reinstall if needed
brew reinstall nginx
brew services restart nginx
```

### Page Keeps Spinning / Not Loading

**Check if Next.js is running:**
```bash
lsof -i :3000
# Should show node/npm process
```

**Check if nginx is running:**
```bash
brew services list | grep nginx
# Should show "started"

# Or check processes
ps aux | grep nginx
# Should show nginx processes
```

**For split-routing, start Next.js:**
```bash
cd /Users/mdarwin/Projects/Workflows
npm run dev
```

### Check nginx Configuration

```bash
# Test nginx config for syntax errors
nginx -t

# View nginx error log
tail -f /opt/homebrew/var/log/nginx/error.log

# View specific site logs (local)
tail -f /opt/homebrew/var/log/nginx/groupize.error.log

# View specific site logs (split-routing)
tail -f /opt/homebrew/var/log/nginx/testing-split.error.log
```

### Can't Access testing.app.groupize.com

1. **Check /etc/hosts has the entry**
2. **Make sure nginx is running with `nginx.testing.conf`**
3. **Check nginx isn't showing 502 errors** (if so, the IP might have changed - see below)

### "Blocked hosts: testing.app.groupize.com" Error

If you see a Rails "Blocked hosts" error when visiting `/aime/`, it means your Next.js is successfully running but can't talk to the Rails API.

**Solution:** Make sure you have `.env.testing` configured:

```bash
cd /Users/mdarwin/Projects/Workflows

# If .env.testing doesn't exist, create it from .env.example
cp .env.example .env.testing

# Update for split-routing (see comments in .env.example):
#   RAILS_BASE_URL=https://104.18.10.206
#   NEXT_PUBLIC_RAILS_BASE_URL=https://104.18.10.206
#   NEXT_PUBLIC_APP_URL=https://testing.app.groupize.com
nano .env.testing

# Restart Next.js
npm run dev
```

The `.env.testing` file uses the real testing IP (`104.18.10.206`) instead of `testing.app.groupize.com` to bypass the `/etc/hosts` localhost override.

### 502 Bad Gateway Error

The testing environment's IP address may have changed. Update it:

```bash
# First, comment out /etc/hosts entry temporarily
sudo nano /etc/hosts
# Add # in front of: # 127.0.0.1 testing.app.groupize.com

# Get new IP
nslookup testing.app.groupize.com
# Note the IP address (e.g., 104.18.10.206)

# Put /etc/hosts back (remove the #)
sudo nano /etc/hosts

# Update nginx.testing.conf
nano /Users/mdarwin/Projects/Workflows/local-dev/nginx.testing.conf
# Find line 109: proxy_pass https://104.18.10.206;
# Replace with new IP

# Reinstall config and restart nginx
cp /Users/mdarwin/Projects/Workflows/local-dev/nginx.testing.conf /opt/homebrew/etc/nginx/servers/testing.app.groupize.com.conf
brew services restart nginx
```

### Connection Drops / Page Reloading

nginx provides more stable WebSocket connections than Caddy for Next.js HMR. If you still experience issues:

```bash
# Check nginx error logs
tail -f /opt/homebrew/var/log/nginx/error.log

# Ensure you're using the latest config
cd /Users/mdarwin/Projects/Workflows/local-dev
cp nginx.local.conf /opt/homebrew/etc/nginx/servers/groupize.local.conf
brew services restart nginx
```

---

## 🔐 Security Notes

### Split-Routing Security

✅ **Safe because:**
- Proxy binds to `127.0.0.1` only (localhost)
- DNS override via `/etc/hosts` only affects your machine
- Does NOT intercept other users' traffic
- mkcert certificates are local to your machine
- Still requires valid testing credentials

❌ **Never do:**
- Use split-routing for production domains
- Commit certificates (`.pem`, `.key`) to git
- Share your mkcert root CA
- Use this setup on production domains

### What Gets Committed to Git

✅ **Committed (templates):**
- `nginx.local.conf` - Ready to use
- `nginx.testing.example` - nginx template with placeholders
- `.env.example` - Environment template (documents all modes)

❌ **Gitignored (personal configs):**
- `nginx.testing.conf` - Your personal nginx config
- `.env.local` - Your local embedded environment
- `.env.testing` - Your split-routing environment
- `~/.local-dev-certs/` - Your SSL certificates

---

## 📁 File Reference

| File | Location | Purpose | Edit? | Commit? |
|------|----------|---------|-------|---------|
| `SETUP_GUIDE.md` | `local-dev/` | This guide | No | Yes ✅ |
| `README.md` | `local-dev/` | Quick reference | No | Yes ✅ |
| `nginx.local.conf` | `local-dev/` | Local embedded config | No | Yes ✅ |
| `nginx.testing.example` | `local-dev/` | Split-routing nginx template | No | Yes ✅ |
| `nginx.testing.conf` | `local-dev/` | Your personal nginx config | Yes | No ❌ |
| `.env.example` | Root | Environment template (all modes) | No | Yes ✅ |
| `.env.local` | Root | Local embedded env config | Yes | No ❌ |
| `.env.testing` | Root | Split-routing env config | Yes | No ❌ |
| `.local-dev-certs/*.pem` | Home dir | SSL certificates | No | No ❌ |

---

## ✅ Success Checklist

### Local Embedded Mode

- [ ] nginx is installed and running
- [ ] nginx.local.conf is copied to nginx servers directory
- [ ] Rails runs on port 3000
- [ ] Next.js runs on port 3001
- [ ] Visit `http://groupize.local/` → See Rails app
- [ ] Visit `http://groupize.local/aime/` → See Next.js app
- [ ] Hot reload works in both apps

### Split-Routing Mode

- [ ] mkcert certificates created
- [ ] `nginx.testing.conf` has your username (not `YOUR_USERNAME`)
- [ ] nginx.testing.conf is copied to nginx servers directory
- [ ] nginx is running
- [ ] Next.js runs on port 3000
- [ ] Visit `https://testing.app.groupize.com/` → See real testing login
- [ ] Can log in successfully
- [ ] Browse main app → See real testing data
- [ ] Visit `https://testing.app.groupize.com/aime/` → See local Next.js
- [ ] Hot reload works in local Next.js
- [ ] No certificate warnings in browser
- [ ] No 502 Bad Gateway errors

---

## 🎓 Team Onboarding

**New team member? Follow this order:**

1. Read "Quick Overview" at the top
2. Complete "One-Time Setup"
3. Try "Local Embedded Mode" first (simpler)
4. Then try "Split-Routing Mode" if needed
5. Refer to troubleshooting if issues arise

**Each developer needs to:**
- Run setup on their own machine
- Generate their own mkcert certificates
- Create their own `nginx.testing.conf` from the template
- Configure their own `/etc/hosts`

This setup is **per-developer** and doesn't affect others.

---

## 🆘 Still Having Issues?

1. **Read the troubleshooting section** above carefully
2. **Check nginx logs** for error messages (`nginx -t` and `tail -f /opt/homebrew/var/log/nginx/error.log`)
3. **Verify all setup steps** were completed
4. **Make sure /etc/hosts has both entries**
5. **Ensure you're using the right port** for Next.js (3001 for local, 3000 for split-routing)
6. **Ask in team chat** with error messages and what you've tried

---

**That's it! You're ready to develop! 🚀**

Questions? Check troubleshooting or ask the team!
