# Nginx Container Management

This unified script provides a menu-driven interface for managing the Nginx reverse proxy container, similar to the MongoDB script.

## Usage

```bash
npm run nginx [command]
```

## Commands

| Command | Description |
|---------|-------------|
| `start` | Start the Nginx container (default) |
| `stop` | Stop the Nginx container |
| `restart` | Restart the Nginx container |
| `status` | Show container status |
| `logs` | Stream container logs in real-time |
| `health` | Check container health |
| `help` | Show help menu |

## Examples

```bash
# Start container (default - no command needed)
npm run nginx

# View help menu
npm run nginx help

# Stop container
npm run nginx stop

# View logs
npm run nginx logs

# Check status
npm run nginx status

# Restart container
npm run nginx restart

# Health check
npm run nginx health
```

## Typical Development Workflow

```bash
# Terminal 1: Start Nginx reverse proxy
npm run nginx

# Terminal 2: Start Next.js dev server
npm run dev

# Terminal 3 (optional): Monitor Nginx logs
npm run nginx logs
```

## Prerequisites (One-time Setup)

### 1. Docker Desktop
Ensure Docker Desktop is installed and running.

### 2. /etc/hosts Entry
```bash
sudo nano /etc/hosts
# Add this line:
127.0.0.1 testing.app.groupize.com
```

### 3. SSL Certificates (Auto-generated)
Certificates are **automatically generated** on first run. No installation needed!

The script uses Docker to generate self-signed certificates:
- First time you run `npm run nginx`, certificates are created automatically
- Stored in `~/.local-dev-certs/`
- Reused on subsequent runs
- You'll see a browser certificate warning (click through it - it's safe for local dev)

## Access Points

Once running, access your application at:
- **Next.js app**: `https://testing.app.groupize.com/aime`
- **Testing environment**: `https://testing.app.groupize.com`
- **Health check**: `https://testing.app.groupize.com/health`

## Features

✅ Zero local installations required (except Docker)
✅ Auto-generates self-signed SSL certificates
✅ Color-coded output for easy reading
✅ Automatic validation of prerequisites
✅ Docker container management
✅ Health checks and diagnostics
✅ Real-time log streaming
✅ Helpful error messages and suggestions

## Troubleshooting

### Docker not running
```bash
# Open Docker Desktop
open -a Docker
```

### Certificate errors
```bash
# Delete and regenerate
rm ~/.local-dev-certs/testing.app.groupize.com*
npm run nginx  # Auto-generates new certificates
```

### DNS not resolving
```bash
# Add /etc/hosts entry
sudo nano /etc/hosts
# Add: 127.0.0.1 testing.app.groupize.com
```

### Browser certificate warning
This is normal for self-signed certificates. Click through to proceed:
- Chrome: Click "Advanced" → "Proceed to testing.app.groupize.com"
- Firefox: Click "Advanced" → "Accept the Risk and Continue"
- Safari: "Show Details" → "Visit this website"

### View full logs
```bash
npm run nginx logs
```

### Container issues
```bash
# Check status
npm run nginx status

# Check health
npm run nginx health

# Restart
npm run nginx restart
```

