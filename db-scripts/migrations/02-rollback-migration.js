// db-scripts/migrations/02-rollback-migration.js
/**
 * Rollback Script: Restore Workflows from Backup
 * 
 * This script restores workflows from a backup file created during migration.
 * 
 * USAGE:
 *   node db-scripts/migrations/02-rollback-migration.js --backup-path=/path/to/backup.json
 *   node db-scripts/migrations/02-rollback-migration.js --list-backups
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
const listBackups = args.includes('--list-backups');
const backupPathArg = args.find(arg => arg.startsWith('--backup-path='));
const backupPath = backupPathArg ? backupPathArg.split('=')[1] : null;

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[level] || 'ℹ️';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function listAvailableBackups() {
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    log('No backups directory found', 'warning');
    return;
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    log('No backup files found', 'warning');
    return;
  }
  
  log('Available backups:', 'info');
  files.forEach((file, index) => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  ${index + 1}. ${file}`);
    console.log(`     Date: ${stats.mtime.toISOString()}`);
    console.log(`     Size: ${(stats.size / 1024).toFixed(2)} KB`);
  });
}

async function rollback() {
  if (listBackups) {
    listAvailableBackups();
    return;
  }
  
  if (!backupPath) {
    log('Error: --backup-path required', 'error');
    log('Usage: node 02-rollback-migration.js --backup-path=/path/to/backup.json', 'info');
    log('Or: node 02-rollback-migration.js --list-backups', 'info');
    process.exit(1);
  }
  
  if (!fs.existsSync(backupPath)) {
    log(`Backup file not found: ${backupPath}`, 'error');
    process.exit(1);
  }
  
  log('='.repeat(60), 'info');
  log('WORKFLOW ROLLBACK', 'info');
  log('='.repeat(60), 'info');
  log(`Backup: ${backupPath}`, 'info');
  log('', 'info');
  
  let client;
  
  try {
    // Read backup file
    log('Reading backup file...', 'info');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    log(`Found ${backupData.length} workflows in backup`, 'success');
    
    // Connect to MongoDB
    log('Connecting to MongoDB...', 'info');
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    log('Connected successfully', 'success');
    
    // Restore workflows
    log('Restoring workflows...', 'info');
    let restored = 0;
    let errors = 0;
    
    for (const workflow of backupData) {
      try {
        await collection.replaceOne(
          { _id: workflow._id },
          workflow,
          { upsert: true }
        );
        restored++;
      } catch (error) {
        log(`Error restoring workflow ${workflow._id}: ${error.message}`, 'error');
        errors++;
      }
    }
    
    log('', 'info');
    log('='.repeat(60), 'info');
    log('ROLLBACK SUMMARY', 'info');
    log('='.repeat(60), 'info');
    log(`Total workflows: ${backupData.length}`, 'info');
    log(`Restored: ${restored}`, restored > 0 ? 'success' : 'info');
    log(`Errors: ${errors}`, errors > 0 ? 'error' : 'info');
    log('', 'info');
    log('✅ Rollback completed', 'success');
    log('='.repeat(60), 'info');
    
  } catch (error) {
    log(`Rollback failed: ${error.message}`, 'error');
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

rollback()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
