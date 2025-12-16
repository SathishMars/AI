# Database Initialization Scripts

This folder contains version-numbered database initialization scripts that automatically create required database objects (collections and indexes) on application startup.

## Overview

Database initialization is **automatic** and runs on:
- **Development**: Turbopack dev server startup
- **Build Server**: During build (if `ENABLE_DB_INIT_ON_BUILD=true`)
- **Production**: On first server startup (if database objects don't exist)

No manual script execution is needed.

## Script Format

Each script file must follow the naming convention: `v{MAJOR}.{MINOR}.{PATCH}.ts`

Examples: `v1.0.0.ts`, `v1.0.1.ts`, `v2.0.0.ts`

### Script Structure

```typescript
// src/db-init-scripts/v1.0.0.ts
import { Db } from 'mongodb';

export interface MigrationResult {
  success: boolean;
  message: string;
  details: {
    collectionsCreated: string[];
    indexesCreated: string[];
    collectionsSkipped: string[];
    indexesSkipped: string[];
  };
}

export async function migrate(db: Db): Promise<MigrationResult> {
  // Your migration logic here
  // Always check for collection/index existence before creating (idempotent)
  
  return {
    success: true,
    message: 'Migration completed',
    details: {
      collectionsCreated: [],
      indexesCreated: [],
      collectionsSkipped: [],
      indexesSkipped: [],
    },
  };
}
```

## Key Principles

### Idempotent
Scripts must be safe to run multiple times without errors. Always:
- Check if collection exists before creating: `db.listCollections().toArray()`
- Check if index exists before creating: `collection.listIndexes().toArray()`
- Use `upsert` patterns for data operations

### Non-Blocking
- Errors in one version don't prevent other versions from running
- Failed initializations are logged but don't prevent app startup
- Application starts even if database initialization fails

### Version-Based Execution
- Versions are discovered automatically from `src/db-init-scripts/`
- Executed in semantic version order (1.0.0 → 1.0.1 → 1.1.0 → 2.0.0)
- Each version is applied only once (tracked in `databaseVersionHistory` collection)

## Environment Variables

```bash
# Disable database initialization (useful for CI/CD)
SKIP_DB_INIT=true

# Control logging verbosity
DATABASE_INIT_LOGGING=verbose  # or 'normal' (default based on NODE_ENV)

# Enable initialization on build server
ENABLE_DB_INIT_ON_BUILD=true   # default: true for dev, false for production
```

## Database Version History

Initialization tracks applied versions in the `databaseVersionHistory` collection:

```typescript
{
  version: "1.0.0",
  appliedAt: "2025-12-09T10:00:00Z",
  status: "success",  // "success" | "failed" | "skipped"
  errorMessage: null,  // populated on failure
  duration: 1234,      // milliseconds
}
```

Query example:
```javascript
db.databaseVersionHistory.find({ status: "success" }).sort({ appliedAt: -1 })
```

## Creating a New Version Script

When adding a new database object or index:

1. **Create new version file**
   ```bash
   touch src/db-init-scripts/v2.0.0.ts  # increment version
   ```

2. **Implement migration**
   ```typescript
   export async function migrate(db: Db): Promise<MigrationResult> {
     // Implement migration logic
     // Check for existence before creating
     // Return detailed result
   }
   ```

3. **Test locally**
   ```bash
   npm run dev
   # Check logs for: [DB Init] Applying version: 2.0.0
   ```

4. **Verify with mongosh**
   ```javascript
   db.databaseVersionHistory.findOne({ version: "2.0.0" })
   db.newCollection.find().limit(1)
   db.newCollection.getIndexes()
   ```

## Troubleshooting

### No migrations running
- Check `DATABASE_INIT_LOGGING=verbose` to see detailed output
- Verify script files match pattern: `v{MAJOR}.{MINOR}.{PATCH}.ts`
- Check `databaseVersionHistory` collection for applied versions
- Ensure database connection is available

### Migration failed
- Check application logs for error message
- Run query on `databaseVersionHistory` to see failure details
- Manually fix the issue and optionally re-run with:
  ```bash
  # Delete the failed version record (WARNING: test first)
  db.databaseVersionHistory.deleteOne({ version: "1.0.0" })
  # Restart server to re-apply
  ```

### Index creation timeout
- Run background index creation manually if too slow:
  ```javascript
  db.collection.createIndex({...}, { background: true })
  ```

## References

- **Main Initialization Module**: `src/app/utils/database-initialization.ts`
- **Version Comparison**: `src/app/utils/version-comparison.ts`
- **Server Initialization Hook**: `src/app/utils/server-initialization.ts`
- **User Story**: `user-stories/story-automatic-database-initialization.md`
