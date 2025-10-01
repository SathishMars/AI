// MongoDB Setup Script for Groupize Workflows
// Run this script using: mongosh < setup-mongodb.js
// Or run each section manually in mongosh

print("=== Setting up MongoDB for Groupize Workflows ===");

// Switch to admin database to create user
use('admin');

print("Creating user 'groupize_app' in admin database...");

// Create user with full permissions on groupize-workflows database
db.createUser({
  user: "groupize_app",
  pwd: "gr0up!zeapP",
  roles: [
    {
      role: "readWrite",
      db: "groupize-workflows"
    },
    {
      role: "dbAdmin", 
      db: "groupize-workflows"
    }
  ]
});

print("User 'groupize_app' created successfully with full permissions on 'groupize-workflows' database.");

// Switch to the groupize-workflows database
use('groupize-workflows');

print("Switched to 'groupize-workflows' database.");

// Create the workflowTemplates collection
print("Creating 'workflowTemplates' collection...");
db.createCollection("workflowTemplates");

// Create unique index on the 'name' field
print("Creating unique index on 'name' field...");
db.workflowTemplates.createIndex(
  { name: 1 }, 
  { unique: true }
);

print("Unique index created on 'name' field in 'workflowTemplates' collection.");

// Verify the setup
print("\n=== Verification ===");
print("Database name: " + db.getName());
print("Collections:");
db.getCollectionNames().forEach(function(collection) {
  print("  - " + collection);
});

print("\nIndexes on workflowTemplates collection:");
db.workflowTemplates.getIndexes().forEach(function(index) {
  print("  - " + index.name + ": " + JSON.stringify(index.key));
});

print("\n=== Setup Complete ===");
print("Database: groupize-workflows");
print("User: groupize_app (with full permissions)");
print("Collection: workflowTemplates (with unique index on 'name')");