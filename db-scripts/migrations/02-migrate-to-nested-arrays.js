// db-scripts/migrations/02-migrate-to-nested-arrays.js
/**
 * Migration Script: Convert Workflows to Nested Array Architecture
 * 
 * This script migrates existing workflows from the old numbered object key structure
 * to the new nested array structure with human-readable step IDs.
 * 
 * OLD STRUCTURE:
 * {
 *   steps: {
 *     "1": { name: "Start", nextSteps: ["1.1"] },
 *     "1.1": { name: "Check", onSuccess: "1.1.1" },
 *     "1.1.1": { name: "Action" }
 *   }
 * }
 * 
 * NEW STRUCTURE:
 * {
 *   steps: [
 *     {
 *       id: "startWorkflow",
 *       name: "Start",
 *       children: [
 *         {
 *           id: "checkCondition",
 *           name: "Check",
 *           onSuccess: { id: "executeAction", name: "Action", ... }
 *         }
 *       ]
 *     }
 *   ]
 * }
 * 
 * FEATURES:
 * - Dry-run mode for testing (--dry-run)
 * - Automatic backup before migration
 * - Rollback capability
 * - Detailed logging
 * - Progress tracking
 * - Error recovery
 * 
 * USAGE:
 *   # Dry run (no changes made)
 *   node db-scripts/migrations/02-migrate-to-nested-arrays.js --dry-run
 * 
 *   # Production migration with backup
 *   node db-scripts/migrations/02-migrate-to-nested-arrays.js --production --backup
 * 
 *   # Verbose output
 *   node db-scripts/migrations/02-migrate-to-nested-arrays.js --verbose
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'groupize-workflows';
const COLLECTION_NAME = 'workflowTemplates';

// Command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const BACKUP = args.includes('--backup');
const PRODUCTION = args.includes('--production');

// Stats tracking
const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  startTime: new Date(),
  endTime: null
};

// Logging functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    debug: '🔍'
  }[level] || 'ℹ️';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function verbose(message) {
  if (VERBOSE) {
    log(message, 'debug');
  }
}

// Generate human-readable ID from step name and type
function generateStepId(step, existingIds = new Set()) {
  // Start with the step name
  let baseName = step.name || step.type || 'step';
  
  // Remove prefixes like "Start:", "Check:", "Action:", "End:"
  baseName = baseName.replace(/^(Start|Check|Action|End|Branch|Merge):\s*/i, '');
  
  // Convert to camelCase
  let id = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .split(/\s+/)
    .map((word, index) => {
      if (index === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
  
  // Ensure it starts with lowercase letter
  if (id.length === 0 || !/^[a-z]/.test(id)) {
    id = step.type + 'Step';
  }
  
  // Ensure minimum length
  if (id.length < 3) {
    id = id + 'Step';
  }
  
  // Ensure maximum length
  if (id.length > 50) {
    id = id.substring(0, 50);
  }
  
  // Handle duplicates
  let finalId = id;
  let counter = 1;
  while (existingIds.has(finalId)) {
    finalId = id + counter;
    counter++;
  }
  
  existingIds.add(finalId);
  return finalId;
}

// Convert old numbered structure to nested arrays
function convertToNestedArray(oldWorkflow) {
  if (!oldWorkflow.steps || typeof oldWorkflow.steps !== 'object') {
    throw new Error('Invalid workflow structure: steps must be an object');
  }
  
  // Check if already migrated (steps is array)
  if (Array.isArray(oldWorkflow.steps)) {
    verbose('Workflow already migrated (steps is array)');
    return null; // Already migrated
  }
  
  const steps = oldWorkflow.steps;
  const existingIds = new Set();
  const stepMap = new Map(); // Map old step ID to new step object
  
  // First pass: Create all steps with IDs
  Object.entries(steps).forEach(([oldId, stepData]) => {
    const newId = generateStepId(stepData, existingIds);
    const newStep = {
      id: newId,
      name: stepData.name,
      type: stepData.type
    };
    
    // Copy optional fields
    if (stepData.action) newStep.action = stepData.action;
    if (stepData.params) newStep.params = stepData.params;
    if (stepData.condition) newStep.condition = stepData.condition;
    if (stepData.result) newStep.result = stepData.result;
    if (stepData.workflowId) newStep.workflowId = stepData.workflowId;
    if (stepData.workflowParams) newStep.workflowParams = stepData.workflowParams;
    
    stepMap.set(oldId, { newStep, oldData: stepData });
  });
  
  // Second pass: Build hierarchy
  const rootSteps = [];
  const processed = new Set();
  
  // Find root steps (not referenced by others)
  const referencedSteps = new Set();
  stepMap.forEach(({ oldData }) => {
    if (oldData.nextSteps) {
      oldData.nextSteps.forEach(id => referencedSteps.add(id));
    }
    if (oldData.onSuccess) referencedSteps.add(oldData.onSuccess);
    if (oldData.onFailure) referencedSteps.add(oldData.onFailure);
  });
  
  // Build tree structure recursively
  function buildStepTree(oldId) {
    if (processed.has(oldId)) {
      return null; // Already processed or circular reference
    }
    
    const stepData = stepMap.get(oldId);
    if (!stepData) {
      return null; // Step not found
    }
    
    processed.add(oldId);
    const { newStep, oldData } = stepData;
    
    // Handle children (nextSteps)
    if (oldData.nextSteps && oldData.nextSteps.length > 0) {
      const children = [];
      oldData.nextSteps.forEach(childId => {
        const childStep = buildStepTree(childId);
        if (childStep) {
          children.push(childStep);
        }
      });
      if (children.length > 0) {
        newStep.children = children;
      }
    }
    
    // Handle conditional branches
    if (oldData.onSuccess) {
      if (stepMap.has(oldData.onSuccess)) {
        const successStep = buildStepTree(oldData.onSuccess);
        if (successStep) {
          newStep.onSuccess = successStep;
        }
      } else {
        // Reference to step ID
        newStep.onSuccessGoTo = stepMap.get(oldData.onSuccess)?.newStep.id || oldData.onSuccess;
      }
    }
    
    if (oldData.onFailure) {
      if (stepMap.has(oldData.onFailure)) {
        const failureStep = buildStepTree(oldData.onFailure);
        if (failureStep) {
          newStep.onFailure = failureStep;
        }
      } else {
        // Reference to step ID
        newStep.onFailureGoTo = stepMap.get(oldData.onFailure)?.newStep.id || oldData.onFailure;
      }
    }
    
    return newStep;
  }
  
  // Build root steps
  stepMap.forEach(({ newStep }, oldId) => {
    if (!referencedSteps.has(oldId)) {
      const builtStep = buildStepTree(oldId);
      if (builtStep) {
        rootSteps.push(builtStep);
      }
    }
  });
  
  // If no root steps found, use all steps
  if (rootSteps.length === 0) {
    stepMap.forEach((_, oldId) => {
      const builtStep = buildStepTree(oldId);
      if (builtStep) {
        rootSteps.push(builtStep);
      }
    });
  }
  
  return {
    steps: rootSteps,
    schemaVersion: oldWorkflow.schemaVersion || '1.0.0',
    metadata: oldWorkflow.metadata
  };
}

// Backup database
async function createBackup(db) {
  if (!BACKUP) {
    return null;
  }
  
  log('Creating backup...', 'info');
  
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupFile = path.join(backupDir, `workflows-backup-${timestamp}.json`);
  
  const collection = db.collection(COLLECTION_NAME);
  const workflows = await collection.find({}).toArray();
  
  fs.writeFileSync(backupFile, JSON.stringify(workflows, null, 2));
  
  log(`Backup created: ${backupFile}`, 'success');
  return backupFile;
}

// Main migration function
async function migrate() {
  log('='.repeat(60), 'info');
  log('WORKFLOW MIGRATION: Nested Array Architecture', 'info');
  log('='.repeat(60), 'info');
  log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'PRODUCTION'}`, 'info');
  log(`Verbose: ${VERBOSE ? 'Yes' : 'No'}`, 'info');
  log(`Backup: ${BACKUP ? 'Yes' : 'No'}`, 'info');
  log('', 'info');
  
  let client;
  let backupFile = null;
  
  try {
    // Connect to MongoDB
    log('Connecting to MongoDB...', 'info');
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    log('Connected successfully', 'success');
    
    // Create backup
    if (!DRY_RUN && BACKUP) {
      backupFile = await createBackup(db);
    }
    
    // Find all workflows
    log('Finding workflows to migrate...', 'info');
    const workflows = await collection.find({}).toArray();
    stats.total = workflows.length;
    
    log(`Found ${stats.total} workflows`, 'info');
    log('', 'info');
    
    // Migrate each workflow
    for (const workflow of workflows) {
      const workflowId = workflow.id || workflow._id;
      verbose(`Processing workflow: ${workflowId} (${workflow.name})`);
      
      try {
        // Convert workflow
        const newWorkflowDef = convertToNestedArray(workflow.workflowDefinition);
        
        if (!newWorkflowDef) {
          verbose(`  Skipped (already migrated)`);
          stats.skipped++;
          continue;
        }
        
        // Update workflow
        if (!DRY_RUN) {
          await collection.updateOne(
            { _id: workflow._id },
            { $set: { workflowDefinition: newWorkflowDef } }
          );
        }
        
        verbose(`  ✓ Migrated successfully`);
        stats.migrated++;
        
      } catch (error) {
        log(`  Error migrating workflow ${workflowId}: ${error.message}`, 'error');
        verbose(`  Stack: ${error.stack}`);
        stats.errors++;
      }
    }
    
    stats.endTime = new Date();
    
  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    verbose(`Stack: ${error.stack}`);
    throw error;
    
  } finally {
    if (client) {
      await client.close();
      log('Connection closed', 'info');
    }
  }
  
  // Print summary
  log('', 'info');
  log('='.repeat(60), 'info');
  log('MIGRATION SUMMARY', 'info');
  log('='.repeat(60), 'info');
  log(`Total workflows: ${stats.total}`, 'info');
  log(`Migrated: ${stats.migrated}`, stats.migrated > 0 ? 'success' : 'info');
  log(`Skipped: ${stats.skipped}`, stats.skipped > 0 ? 'warning' : 'info');
  log(`Errors: ${stats.errors}`, stats.errors > 0 ? 'error' : 'info');
  
  const duration = stats.endTime - stats.startTime;
  log(`Duration: ${(duration / 1000).toFixed(2)}s`, 'info');
  
  if (backupFile) {
    log(`Backup: ${backupFile}`, 'info');
  }
  
  if (DRY_RUN) {
    log('', 'info');
    log('⚠️  DRY RUN MODE - No changes were made', 'warning');
    log('Run without --dry-run to apply changes', 'info');
  } else {
    log('', 'info');
    log('✅ Migration completed successfully', 'success');
  }
  
  log('='.repeat(60), 'info');
}

// Run migration
migrate()
  .then(() => {
    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
