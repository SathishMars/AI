# PostgreSQL Attendee Database Setup (Development Only)

## ⚠️ IMPORTANT: Development/Testing Only

**This script should NEVER be run in production environments.**

## What This Script Does

- Creates the `attendee` database (if it doesn't exist)
- Creates the `public.attendee` table schema
- Creates a view `public.attendee_excel` for Excel column name compatibility
- **Inserts 50 rows of hardcoded test data** (fake emails, names, etc.)

## When to Use

✅ **Use this script for:**
- Local development setup
- Testing/QA environments
- Demo environments
- Initial development database setup

❌ **DO NOT use this script for:**
- Production deployments
- Staging environments (unless specifically for testing)
- Any environment with real user data

## Usage

```bash
# Development only
psql -U postgres -f db-scripts/attendee_setup.sql
```

## Production Database Setup

For production, follow these steps:

1. **Database Creation**: Done by infrastructure/DBA team
   ```sql
   CREATE DATABASE attendee;
   ```

2. **Schema Migration**: Use proper migration tools (e.g., Flyway, Liquibase, or custom migration system)
   - Schema changes should be versioned
   - Migrations should be idempotent
   - Should be part of CI/CD pipeline

3. **Data Loading**: 
   - Load from real data sources (CSV, API, ETL pipeline)
   - Never use hardcoded test data
   - Use proper data import tools

## Recommended Improvements

1. **Separate Schema Script**: Create `attendee_schema.sql` with only DDL (no data)
2. **Separate Seed Data**: Create `attendee_seed_data.sql` for dev/test data
3. **Migration System**: Implement proper database migrations
4. **Environment Checks**: Add checks to prevent running in production

## Current Limitations

- ❌ No environment validation
- ❌ Hardcoded test data mixed with schema
- ❌ No versioning/migration tracking
- ❌ Manual execution required

