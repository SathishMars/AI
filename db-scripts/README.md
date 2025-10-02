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

### initialize-fresh-database.js ⭐ **RECOMMENDED**
**Complete database initialization from scratch**
Sets up the entire database with:
- **Database**: `groupize-workflows`
- **Collections**: `workflowTemplates` and `workflowConfiguratorConversations`
- **Schema Validation**: Full JSON schema validation for both collections
- **Indexes**: Optimized indexes for account+organization+name uniqueness and query performance
- **Sample Data**: Demo account with organizations and sample templates
- **User**: `groupize-workflows-app` with proper permissions

### workflow-template-collections.js
**Individual collection setup** (for existing databases)
Updates only the workflow template collections and indexes.

## Usage for Fresh Database Setup

### Method 1: Complete Fresh Setup (Recommended)
```bash
mongosh < db-scripts/initialize-fresh-database.js
```

This script will:
1. Create the `groupize-workflows` database
2. Set up all collections with proper schemas
3. Create optimized indexes
4. Add sample data and demo account
5. Create database user with proper permissions

### Method 2: Individual Collection Setup (Existing Database)
```bash
mongosh < db-scripts/workflow-template-collections.js
```

Use this for updating existing databases with new schema changes.

## Connection Examples

### Local MongoDB
```bash
# Connect as application user
mongosh mongodb://groupize-workflows-app:secure-password-change-in-production@localhost:27017/groupize-workflows

# Connect as admin
mongosh mongodb://localhost:27017/groupize-workflows
```

// Create collection and index
db.createCollection("workflowTemplates")
db.workflowTemplates.createIndex({ name: 1 }, { unique: true })
```

## AWS DocumentDB Setup (Production)

### 1. Create DocumentDB Cluster
```bash
# Using AWS CLI
aws docdb create-db-cluster \
    --db-cluster-identifier groupize-workflows-cluster \
    --engine docdb \
    --engine-version 5.0.0 \
    --master-username admin \
    --master-user-password YourSecurePassword123 \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --storage-encrypted
```

### 2. Create DocumentDB Instance
```bash
aws docdb create-db-instance \
    --db-instance-identifier groupize-workflows-instance \
    --db-instance-class db.t3.medium \
    --engine docdb \
    --db-cluster-identifier groupize-workflows-cluster
```

### 3. Environment Configuration
Set these environment variables for DocumentDB:
```bash
DATABASE_ENVIRONMENT=documentdb
DOCUMENTDB_HOST=groupize-workflows-cluster.cluster-xyz.us-east-1.docdb.amazonaws.com
DOCUMENTDB_PORT=27017
DOCUMENTDB_USER=admin
DOCUMENTDB_PASSWORD=YourSecurePassword123
MONGODB_DATABASE=groupize-workflows
```

### 4. Security Group Configuration
Ensure your DocumentDB cluster security group allows inbound connections on port 27017 from your application servers.

### 5. Connect via DocumentDB
```javascript
// The application will automatically use DocumentDB when DATABASE_ENVIRONMENT=documentdb
// No code changes required - the connection pool handles the switch automatically
```

## Connection Strings

### Local MongoDB
```
mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows
```

### AWS DocumentDB
```
mongodb://admin:password@cluster-endpoint:27017/groupize-workflows?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

## Verification

### Local MongoDB
```javascript
// In mongosh, switch to the database
use groupize-workflows

// List collections
show collections

// Check indexes on workflowTemplates
db.workflowTemplates.getIndexes()
```

### AWS DocumentDB
```javascript
// Connect to DocumentDB via mongosh (requires SSL certificate)
mongosh --ssl --host cluster-endpoint:27017 --username admin --password

// Use database
use groupize-workflows

// Verify collections and indexes
show collections
db.workflowTemplates.getIndexes()
```

## MongoDB 5.0 Compatibility Notes

Both local MongoDB and AWS DocumentDB support MongoDB 5.0 API features:
- **Aggregation Pipeline**: Full support for complex aggregations
- **Transactions**: Multi-document ACID transactions
- **Change Streams**: Real-time data change notifications
- **Indexes**: All index types including compound, partial, and text indexes
- **GridFS**: For large file storage (if needed)

### Limitations in DocumentDB
- Some MongoDB administrative commands may not be available
- `retryWrites` must be set to `false`
- Custom server-side JavaScript is not supported
- Some aggregation operators may have limitations

## Security Best Practices

### Local Development
- Use strong passwords even in development
- Restrict network access to localhost only
- Enable authentication

### Production (DocumentDB)
- Use VPC security groups to restrict access
- Enable encryption at rest and in transit
- Use IAM database authentication when possible
- Regularly rotate passwords
- Monitor access logs
- Use least-privilege access principles

## Backup and Recovery

### Local MongoDB
```bash
# Backup
mongodump --db groupize-workflows --out /path/to/backup

# Restore
mongorestore --db groupize-workflows /path/to/backup/groupize-workflows
```

### AWS DocumentDB
- Automated backups are enabled by default
- Point-in-time recovery available
- Manual snapshots can be created via AWS Console or CLI
- Cross-region backup replication available

## Monitoring

### Local MongoDB
- Use MongoDB Compass for GUI monitoring
- Enable profiling for slow query analysis
- Monitor connection pool metrics

### AWS DocumentDB
- CloudWatch metrics are automatically available
- Set up CloudWatch alarms for key metrics
- Use Performance Insights for query analysis
- Monitor connection pool health via application logs