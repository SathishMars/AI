# Environment Configuration Guide

## Environment Files Overview

This project uses environment files to manage configuration across different environments. Here's how they're organized:

### Files Tracked in Git ✅
- **`.env.example`** - Template file with all required environment variables
- **`.env.sample`** - Alternative template name (if used)
- **`.env.template`** - Alternative template name (if used)

### Files Excluded from Git ❌
- **`.env`** - Local environment file (never commit)
- **`.env.local`** - Next.js local environment file (never commit)
- **`.env.development`** - Development environment (never commit)
- **`.env.staging`** - Staging environment (never commit)
- **`.env.production`** - Production environment (never commit)
- **`.env.test`** - Test environment (never commit)

## Setup Instructions

### For Developers
1. Copy the template file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your actual API keys and configuration values in `.env.local`

3. Never commit `.env.local` or any files containing real credentials

### For CI/CD Systems
1. Use `.env.example` as a reference for required environment variables
2. Set environment variables directly in your CI/CD system
3. Or create environment-specific files and inject them during deployment

## Git Configuration

The `.gitignore` file is configured to:
- ✅ **Include** template files (`.env.example`, `.env.sample`, `.env.template`)
- ❌ **Exclude** actual environment files with credentials
- 🔒 **Protect** sensitive information from being accidentally committed

## Security Best Practices

1. **Never commit actual credentials** to git
2. **Use strong, unique passwords** for each environment
3. **Rotate credentials regularly** in production
4. **Use environment-specific secrets management** for production deployments
5. **Review `.env.example`** to ensure no sensitive defaults are included

## Environment Variables Reference

See `.env.example` for the complete list of required and optional environment variables with descriptions and example values.