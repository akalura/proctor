const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const DB_PATH = path.join(__dirname, 'db', 'db.sqlite');
const SHARED_FOLDER = path.join(__dirname, 'sharedFolder');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask user for confirmation
function askConfirmation() {
  return new Promise((resolve) => {
    rl.question('\n⚠️  WARNING: This will delete ALL questions from the database and ALL files from sharedFolder!\n\nDo you want to proceed? (yes/no): ', (answer) => {
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Function to delete all records from question table
function clearDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.run('DELETE FROM question', [], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`✓ Deleted ${this.changes} records from question table`);
          resolve(this.changes);
        }
        
        db.close();
      });
    });
  });
}

// Function to delete all files from sharedFolder
function clearSharedFolder() {
  return new Promise((resolve, reject) => {
    fs.readdir(SHARED_FOLDER, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      if (files.length === 0) {
        console.log('✓ Shared folder is already empty');
        resolve(0);
        return;
      }

      let deletedCount = 0;
      let errors = [];

      files.forEach((file, index) => {
        const filePath = path.join(SHARED_FOLDER, file);
        
        fs.stat(filePath, (err, stats) => {
          if (err) {
            errors.push(`Error checking ${file}: ${err.message}`);
          } else if (stats.isFile()) {
            fs.unlink(filePath, (err) => {
              if (err) {
                errors.push(`Error deleting ${file}: ${err.message}`);
              } else {
                deletedCount++;
                console.log(`  - Deleted: ${file}`);
              }

              // Check if this is the last file
              if (index === files.length - 1) {
                if (errors.length > 0) {
                  console.error('\n❌ Errors occurred:');
                  errors.forEach(e => console.error(`  ${e}`));
                }
                console.log(`✓ Deleted ${deletedCount} files from sharedFolder`);
                resolve(deletedCount);
              }
            });
          } else {
            // Skip directories
            if (index === files.length - 1) {
              console.log(`✓ Deleted ${deletedCount} files from sharedFolder`);
              resolve(deletedCount);
            }
          }
        });
      });
    });
  });
}

// Main execution
(async () => {
  console.log('=== Question Reset Tool ===\n');
  
  const confirmed = await askConfirmation();
  
  if (!confirmed) {
    console.log('\n❌ Reset cancelled by user');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔄 Starting reset process...\n');

  try {
    // Clear database
    await clearDatabase();
    
    // Clear shared folder
    await clearSharedFolder();
    
    console.log('\n✅ Reset completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during reset:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
})();
