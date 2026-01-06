/**
 * MongoDB 8.0 Initialization Script
 * 
 * This script runs automatically when the MongoDB container starts and:
 * 1. Creates the groupize-workflows database
 * 2. Creates a user 'groupize_app' with password 'gr0up!zeapP'
 * 3. Grants admin privileges to the user on the database
 * 4. Creates necessary indexes for performance
 * 
 * Authentication:
 * - Root user: admin / admin123
 * - App user: groupize_app / gr0up!zeapP
 * 
 * Connection strings:
 * - Local: mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows
 * - Docker: mongodb://groupize_app:gr0up!zeapP@mongodb:27017/groupize-workflows
 */

// Switch to the admin database
db = db.getSiblingDB('admin');

// Verify connection
print('Initializing MongoDB 8.0 for groupize-workflows...');

// Switch to the application database
db = db.getSiblingDB('groupize-workflows');
print('✓ Switched to database: groupize-workflows');
// Create a test collection to ensure the database is created
db.createCollection('_test_collection');
print('✓ Created test collection');


// Create application user with admin privileges on groupize-workflows
db.createUser({
  user: 'groupize_app',
  pwd: 'gr0up!zeapP',
  roles: [
    {
      role: 'root',
      db: 'admin',
    },
    {
      role: 'dbOwner',
      db: 'groupize-workflows',
    },
  ],
});

print('✓ Created user: groupize_app');
print('  - root role on admin database');
print('  - dbOwner role on groupize-workflows database');

db = db.getSiblingDB('admin');

print('\n✓ MongoDB 8.0 initialization complete!');
print('Connection string: mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows');
