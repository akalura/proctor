const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const SHARED_FOLDER = path.join(__dirname, 'sharedFolder');
const DB_PATH = path.join(__dirname, 'db', 'db.sqlite');

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});


// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS question (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    fileMetaData TEXT,
    is_scraped INTEGER,
    scraped_data TEXT,
    scraped_answer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  } else {
    console.log('Files table ready');
  }
});

// Track existing files to avoid duplicate inserts on startup
const existingFiles = new Set();

// Function to insert file info into database
function insertFileRecord(filename, filepath) {
  fs.stat(filepath, (err, stats) => {
    if (err) {
      console.error(`Error getting file stats for ${filename}:`, err.message);
      return;
    }

    // [filename, filepath, stats.size]
    db.run(
      `INSERT INTO question (filename, is_scraped) VALUES (?, ?)`,
      [filename, 0],
      function(err) {
        if (err) {
          console.error('Error inserting file record:', err.message);
        } else {
          console.log(`✓ Inserted: ${filename} (ID: ${this.lastID}, Size: ${stats.size} bytes)`);
        }
      }
    );
  });
}

// Initialize existing files
fs.readdir(SHARED_FOLDER, (err, files) => {
  if (err) {
    console.error('Error reading shared folder:', err.message);
    return;
  }
  
  files.forEach(file => {
    const filepath = path.join(SHARED_FOLDER, file);
    fs.stat(filepath, (err, stats) => {
      if (!err && stats.isFile()) {
        existingFiles.add(file);
      }
    });
  });
  
  console.log(`Monitoring folder: ${SHARED_FOLDER}`);
  console.log(`Loaded ${files.length} existing files`);
});

// Watch the shared folder for changes
const watcher = fs.watch(SHARED_FOLDER, { persistent: true }, (eventType, filename) => {
  if (!filename) return;

  const filepath = path.join(SHARED_FOLDER, filename);

  // Check if it's a new file
  if (eventType === 'rename') {
    // 'rename' event fires for both creation and deletion
    fs.stat(filepath, (err, stats) => {
      if (!err && stats.isFile()) {
        // File exists - it's a new file or renamed file
        if (!existingFiles.has(filename)) {
          existingFiles.add(filename);
          console.log(`\n📁 New file detected: ${filename}`);
          insertFileRecord(filename, filepath);
        }
      } else {
        // File doesn't exist - it was deleted
        if (existingFiles.has(filename)) {
          existingFiles.delete(filename);
          console.log(`\n🗑️  File removed: ${filename}`);
        }
      }
    });
  }
});

console.log('\n🔍 File monitor started. Watching for new files...');
console.log('Press Ctrl+C to stop\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  watcher.close();
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
