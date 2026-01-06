# MongoDB Database Setup Scripts

## Overview
This folder contains database scripts for setting up and managing the MongoDB database for the Groupize Workflows application. The application supports both local MongoDB (development) and AWS DocumentDB (production).

## Database Environments

### Local MongoDB (Development)
- **Environment**: `DATABASE_ENVIRONMENT=local`
- **MongoDB Version**: 5.0 compatible
- **Setup**: Use the initialization script below

### AWS DocumentDB (Production)
- **Environment**: `DATABASE_ENVIRONMENT=documentdb`
- **Compatibility**: MongoDB 5.0 API compatible
- **SSL**: Required (automatically configured)
- **Setup**: Use AWS Console or CLI

## Scripts

### Execution Order
Scripts are numbered to indicate their proper execution sequence:

1. **01-initialize-fresh-database.js** - Fresh database setup (new installations)
# DB scripts — single-entry usage

This folder previously contained multiple database scripts. We now use a single, recommended initialization script:

- `01-initialize-fresh-database.js` — complete database initialization for a fresh install

This README summarizes what that script does and how to run it.

## What the script does

- Creates the `groupize-workflows` database (local or target environment)
- Creates `workflowTemplates` and `aimeWorkflowConversations` collections
- Creates optimized indexes used by the application (uniqueness and common lookup queries)
- (Optionally) drops existing collections if present to recreate them cleanly
- Prints example queries you can run in `mongosh` to inspect data and indexes

## Indexes created

- `workflowTemplates`
  - Unique composite index: `{ account: 1, organization: 1, id: 1, version: 1 }` (prevents duplicates)
  - Lookup index: `{ account: 1, organization: 1, id: 1, 'metadata.status': 1, version: -1 }`
  - Search by status: `{ account: 1, organization: 1, 'metadata.status': 1 }`
  - Search by label+status: `{ account: 1, organization: 1, 'metadata.label': 1, 'metadata.status': 1 }`
  - Latest-version helper: `{ id: 1, 'metadata.status': 1, version: -1 }`

- `aimeWorkflowConversations`
  - Unique message id per conversation: `{ account: 1, organization: 1, templateId: 1, id: 1 }`
  - Conversation query (newest first): `{ account: 1, organization: 1, templateId: 1, timestamp: -1 }`
  - Recent messages across orgs: `{ account: 1, templateId: 1, timestamp: -1 }`

## Usage

Run the script using `mongosh` (local MongoDB or DocumentDB with appropriate connection parameters):

```bash
mongosh < db-scripts/01-initialize-fresh-database.js
```

This will create the collections and indexes described above. The script prints progress and example queries to the console.

## Example mongosh queries

Find latest published templates for an account/org:

```js
db.workflowTemplates.find({ account: 'acct1', organization: 'orgA', 'metadata.status': 'published' }).sort({ version: -1 })
```

Lookup a specific template version by composite key:

```js
db.workflowTemplates.findOne({ account: 'acct1', organization: 'orgA', id: 'a1b2c3d4e5', version: '1.0.0' })
```

Search templates by label and status:

```js
db.workflowTemplates.find({ account: 'acct1', organization: 'orgA', 'metadata.label': /Approval/i, 'metadata.status': 'published' })
```

## Notes

- The script is safe to review before running: it prints actions and only drops collections if the script's drop logic is enabled.
- For production (DocumentDB) use, ensure you connect with SSL and appropriate credentials; the script assumes you run it against the intended cluster/connection URL.

If you'd like, I can add a small wrapper script or Makefile target to run the mongosh command with a configurable connection string.