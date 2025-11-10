# Environment Variables

Copy this content to create your `.env.local` file. Never commit `.env.local` to version control.

```bash
# =============================================================================
# Groupize Workflows - Environment Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Authentication Mode
# -----------------------------------------------------------------------------
# Controls how the application authenticates users
# Options:
#   - embedded: Uses Rails JWT from gpw_session cookie (for production and with Rails)
#   - mock: Generates mock JWT tokens (for standalone frontend development)
# Default: embedded
AUTH_MODE=embedded

# -----------------------------------------------------------------------------
# Rails Backend Configuration
# -----------------------------------------------------------------------------
# Base URL for the Rails application (where JWKS and auth endpoints live)
# Used in embedded mode and production
RAILS_BASE_URL=http://groupize.local

# JWKS endpoint URL (used to verify JWT signatures in embedded mode and production)
# If not set, defaults to ${RAILS_BASE_URL}/.well-known/jwks.json
# JWKS_URL=http://groupize.local/.well-known/jwks.json

# -----------------------------------------------------------------------------
# JWT Configuration
# -----------------------------------------------------------------------------
# JWT issuer (must match Rails configuration)
JWT_ISSUER=groupize

# JWT audience (must match Rails configuration)
JWT_AUDIENCE=workflows

# JWT secret (ONLY used in standalone mock mode for HS256 signing)
# Not used in embedded mode or production (which use JWKS/KMS)
# Should match Rails JWT_SECRET if you want to test with Rails-generated tokens
JWT_SECRET=dev-secret-change-me

# -----------------------------------------------------------------------------
# Cookie Configuration
# -----------------------------------------------------------------------------
# Name of the cookie containing the JWT token
# Must match Rails cookie name
COOKIE_NAME=gpw_session

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------
# Base path for the Next.js app (must match next.config.ts)
NEXT_PUBLIC_BASE_PATH=/aime/aimeworkflows

# Node environment
NODE_ENV=development

# Public app URL (for absolute URLs if needed)
# NEXT_PUBLIC_APP_URL=http://groupize.local
```

## Development Modes

### Standalone Mode (Default)
```bash
npm run dev
```
- Sets `AUTH_MODE=mock` automatically
- Generates mock JWT tokens automatically
- **No Rails connection needed**
- Great for frontend development
- Uses HS256 with `JWT_SECRET` for mock tokens
- Runs on `PORT=3000`

### Embedded Mode (With Rails)
```bash
npm run dev:embedded
```
- Sets `AUTH_MODE=embedded` automatically
- Expects Rails at `RAILS_BASE_URL`
- **Verifies JWT tokens via JWKS endpoint**
- Redirects to Rails login if unauthorized
- Full SSO experience with Rails
- Runs on `PORT=3001`

## Production Configuration

In production:
- `AUTH_MODE` should be `embedded` (or omitted, as it's the default)
- `RAILS_BASE_URL` should point to production Rails app
- JWT tokens are signed with **AWS KMS (PS256)** by Rails
- `JWKS_URL` points to production `/.well-known/jwks.json`
- All cookies use `Secure`, `HttpOnly`, `SameSite=Lax`
- `JWT_SECRET` is **NOT used** (JWKS handles verification)
- Tokens verified via JWKS with automatic caching and rotation

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_MODE` | No | `embedded` | Authentication mode: `embedded` or `mock` |
| `RAILS_BASE_URL` | Yes (embedded) | `http://groupize.local` | Rails application base URL |
| `JWKS_URL` | No | `${RAILS_BASE_URL}/.well-known/jwks.json` | JWKS endpoint for JWT verification |
| `JWT_ISSUER` | No | `groupize` | JWT issuer claim (must match Rails) |
| `JWT_AUDIENCE` | No | `workflows` | JWT audience claim (must match Rails) |
| `JWT_SECRET` | No | `dev-secret-change-me` | Shared secret for HS256 (mock mode only) |
| `COOKIE_NAME` | No | `gpw_session` | JWT cookie name (must match Rails) |
| `NEXT_PUBLIC_BASE_PATH` | No | `/aime/aimeworkflows` | Next.js base path |
| `NODE_ENV` | No | `development` | Node environment |

## JWT Verification Strategy by Mode

### Standalone Mode (`AUTH_MODE=mock`)
- **No JWKS used**
- Generates tokens with HS256 using `JWT_SECRET`
- Verifies tokens with same `JWT_SECRET`
- No network calls to Rails
- Perfect for frontend-only development

### Embedded Mode & Production (`AUTH_MODE=embedded`)
- **JWKS verification via `JWKS_URL`**
- Rails signs tokens with AWS KMS (PS256)
- Next.js fetches public keys from JWKS endpoint
- Automatic key caching (5 minutes)
- Automatic key rotation support
- Unknown `kid` triggers automatic refetch

## Quick Setup

### For Standalone Development (No Rails)
```bash
# Create .env.local
cat > .env.local << 'EOF'
AUTH_MODE=mock
JWT_SECRET=dev-secret-change-me
EOF

# Run
npm run dev
```

### For Full Stack Development (With Rails)
```bash
# Create .env.local
cat > .env.local << 'EOF'
AUTH_MODE=embedded
RAILS_BASE_URL=http://groupize.local
JWT_ISSUER=groupize
JWT_AUDIENCE=workflows
COOKIE_NAME=gpw_session
EOF

# Run Rails
cd reg_app && rails s -p 3000

# Run Next.js (in another terminal)
cd Workflows && npm run dev:embedded
```

