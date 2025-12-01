const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { browserPlay } = require('./geminiAgent.js');

// Configuration
const DB_PATH = path.join(__dirname, 'db', 'db.sqlite');
const SHARED_FOLDER = path.join(__dirname, 'sharedFolder');
const OUTPUT_FILE = path.join(__dirname, 'nodeHttpServer', 'question.json');
const INTERVAL_MS = 10000; // 10 seconds

let isProcessing = false;
let db = null;

// Initialize database connection
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      } else {
        console.log('✓ Connected to database');
        resolve(db);
      }
    });
  });
}

// Query unscraped questions and process them
async function processUnscrapedQuestions() {
  if (isProcessing) {
    console.log('⏳ Already processing, skipping this cycle...');
    return;
  }

  if (!db) {
    console.error('❌ Database not initialized');
    return;
  }

  isProcessing = true;

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, filename FROM question WHERE is_scraped = 0 ORDER BY id DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (rows.length === 0) {
      console.log('✓ No unscraped questions found');
      isProcessing = false;
      return;
    }

    console.log(`\n📋 Found ${rows.length} unscraped questions`);

    for (const row of rows) {
      console.log(`\nProcessing question ID: ${row.id}, File: ${row.filename}`);
      
      const imagePath = path.join(SHARED_FOLDER, row.filename);
      
      try {
        const scrapedData = await browserPlay(imagePath);
        
        // Validate if output is valid JSON
        try {
          JSON.parse(scrapedData);
          
          // Update database with scraped data only if valid JSON
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE question SET is_scraped = 1, scraped_data = ? WHERE id = ?`,
              [scrapedData, row.id],
              (err) => {
                if (err) reject(err);
                else {
                  console.log(`✓ Updated record ${row.id} with scraped data`);
                  resolve();
                }
              }
            );
          });
        } catch (jsonError) {
          console.error(`❌ Invalid JSON returned for question ${row.id}. Data not saved.`);
          console.error(`Received data: ${scrapedData}`);
        }
      } catch (error) {
        console.error(`Error processing question ${row.id}:`, error.message);
      }
    }

    console.log('\n✓ Processing cycle completed');
    await exportScrapedQuestions(db);
    
  } catch (error) {
    console.error('Error during processing:', error.message);
  } finally {
    isProcessing = false;
  }
}

// Export scraped questions to JSON file
function exportScrapedQuestions(db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT scraped_data FROM question WHERE is_scraped = 1 ORDER BY id`,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error querying scraped questions:', err.message);
          reject(err);
          return;
        }

        console.log(`\n📤 Exporting ${rows.length} scraped questions to JSON file...`);

        // Parse each scraped_data and create array
        const questionsArray = rows.map(row => {
          try {
            return JSON.parse(row.scraped_data);
          } catch (e) {
            console.error('Error parsing scraped_data:', e.message);
            return null;
          }
        }).filter(q => q !== null);

        // Write to file
        fs.writeFile(OUTPUT_FILE, JSON.stringify(questionsArray, null, 2), (err) => {
          if (err) {
            console.error('Error writing JSON file:', err.message);
            reject(err);
          } else {
            console.log(`✓ Exported ${questionsArray.length} questions to ${OUTPUT_FILE}`);
            resolve();
          }
        });
      }
    );
  });
}

// Main execution
(async () => {
  try {
    await initDatabase();
    
    console.log('🚀 Auto-processing questions started');
    console.log(`⏰ Running every ${INTERVAL_MS / 1000} seconds`);
    console.log('Press Ctrl+C to stop\n');

    // Run immediately on start
    processUnscrapedQuestions();

    // Then run every 30 seconds
    const intervalId = setInterval(() => {
      console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Running scheduled check...`);
      processUnscrapedQuestions();
    }, INTERVAL_MS);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping auto-processor...');
      clearInterval(intervalId);
      
      if (db) {
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('✓ Database connection closed');
          }
          console.log('✓ Stopped');
          process.exit(0);
        });
      } else {
        console.log('✓ Stopped');
        process.exit(0);
      }
    });
  } catch (error) {
    console.error('Failed to initialize:', error.message);
    process.exit(1);
  }
})();
