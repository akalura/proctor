const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();


// Configuration
const DB_PATH = path.join(__dirname, 'db', 'db.sqlite');
const IMAGE_FOLDER = path.join(__dirname, "report", 'data', 'screencapture');
const OUTPUT_FILE = path.join(__dirname, 'report' , "data", 'report.html');
const NOTES_FILE = path.join(__dirname, 'report', "data", 'notes.txt');
const FEEDBACK_FILE = path.join(__dirname, 'report', "data", 'feedback.json');

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✓ Connected to database');
});

// Read notes file
function readNotes() {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      return fs.readFileSync(NOTES_FILE, 'utf8');
    }
    return '';
  } catch (error) {
    console.error('Error reading notes.txt:', error.message);
    return '';
  }
}

// Read existing feedback
function readFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading feedback.json:', error.message);
    return {};
  }
}

// Generate HTML report
function generateReport() {
  return new Promise((resolve, reject) => {
    const notesContent = readNotes();
    const feedbackData = readFeedback();
    
    db.all(
      `SELECT id, filename, scraped_data, is_scraped FROM question ORDER BY id`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`Found ${rows.length} questions in database`);

        let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Question Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .header {
            background: #2196F3;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .header h1 {
            margin-bottom: 10px;
        }
        
        .stats {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }
        
        .stat-item {
            background: rgba(255, 255, 255, 0.2);
            padding: 10px 15px;
            border-radius: 4px;
        }
        
        .question-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: background-color 0.3s ease;
        }
        
        .question-card.incorrect {
            background: #ffebee;
        }
        
        .question-card.unclear {
            background: #e8f5e9;
        }
        
        .question-card.alignment {
            background: #fff9c4;
        }
        
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .question-id {
            font-size: 24px;
            font-weight: bold;
            color: #2196F3;
        }
        
        .status-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }
        
        .status-scraped {
            background: #4CAF50;
            color: white;
        }
        
        .status-pending {
            background: #FF9800;
            color: white;
        }
        
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        
        .image-section {
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            padding: 10px;
        }
        
        .image-section h3 {
            margin-bottom: 10px;
            color: #333;
        }
        
        .image-section img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            cursor: pointer;
            transition: opacity 0.3s;
        }
        
        .image-section img:hover {
            opacity: 0.8;
        }
        
        .no-image {
            padding: 40px;
            text-align: center;
            background: #f5f5f5;
            color: #999;
            border-radius: 4px;
        }
        
        .data-section {
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            padding: 10px;
        }
        
        .data-section h3 {
            margin-bottom: 10px;
            color: #333;
        }
        
        .json-data {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .no-data {
            padding: 40px;
            text-align: center;
            background: #f5f5f5;
            color: #999;
            border-radius: 4px;
        }
        
        .metadata {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #666;
        }
        
        .metadata-item {
            margin-bottom: 5px;
        }
        
        .metadata-label {
            font-weight: bold;
            display: inline-block;
            width: 120px;
        }
        
        .notes-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .notes-section h2 {
            color: #2196F3;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .notes-content {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-x: auto;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            cursor: pointer;
        }
        
        .modal-content {
            margin: auto;
            display: block;
            max-width: 90%;
            max-height: 90%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .modal-close {
            position: absolute;
            top: 20px;
            right: 40px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .modal-close:hover {
            color: #bbb;
        }
        
        .feedback-section {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
        }
        
        .feedback-label {
            font-weight: bold;
            margin-right: 10px;
            color: #333;
        }
        
        .feedback-dropdown {
            padding: 8px 12px;
            border: 2px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            background: white;
            cursor: pointer;
            min-width: 180px;
        }
        
        .feedback-dropdown:focus {
            outline: none;
            border-color: #2196F3;
        }
        
        .feedback-dropdown.ok {
            border-color: #4CAF50;
        }
        
        .feedback-dropdown.incorrect {
            border-color: #f44336;
        }
        
        .feedback-dropdown.alignment {
            border-color: #FF9800;
        }
        
        .feedback-dropdown.unclear {
            border-color: #9C27B0;
        }
        
        .correct-answer-section {
            margin-top: 10px;
            display: none;
        }
        
        .correct-answer-section.show {
            display: block;
        }
        
        .correct-answer-label {
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
            display: block;
        }
        
        .correct-answer-input {
            width: 100%;
            padding: 10px;
            border: 2px solid #f44336;
            border-radius: 4px;
            font-size: 14px;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
        }
        
        .correct-answer-input:focus {
            outline: none;
            border-color: #d32f2f;
        }
    </style>
</head>
<body>
    <div id="imageModal" class="modal" onclick="closeModal()">
        <span class="modal-close">&times;</span>
        <img class="modal-content" id="modalImage">
    </div>
    <div class="header">
        <h1>📊 Question Report</h1>
        <div class="stats">
            <div class="stat-item">
                <strong>Total Questions:</strong> ${rows.length}
            </div>
            <div class="stat-item">
                <strong>Scraped:</strong> ${rows.filter(r => r.is_scraped === 1).length}
            </div>
            <div class="stat-item">
                <strong>Pending:</strong> ${rows.filter(r => r.is_scraped === 0).length}
            </div>
            <div class="stat-item">
                <strong>Generated:</strong> ${new Date().toLocaleString()}
            </div>
        </div>
    </div>
`;

        // Add notes section if content exists
        if (notesContent) {
          htmlContent += `
    <div class="notes-section">
        <h2>📝 Project Notes</h2>
        <div class="notes-content">${notesContent}</div>
    </div>
`;
        }

        rows.forEach(row => {
          const imagePath = path.join(IMAGE_FOLDER, row.filename);
          const imageExists = fs.existsSync(imagePath);
          const relativeImagePath = path.relative(path.dirname(IMAGE_FOLDER), imagePath).replace(/\\/g, '/');

          let scrapedDataFormatted = '';
          if (row.scraped_data) {
            try {
              const parsed = JSON.parse(row.scraped_data);
              scrapedDataFormatted = JSON.stringify(parsed, null, 2);
            } catch (e) {
              scrapedDataFormatted = row.scraped_data;
            }
          }

          htmlContent += `
    <div class="question-card">
        <div class="question-header">
            <div class="question-id">Question #${row.id}</div>
            <div class="status-badge ${row.is_scraped === 1 ? 'status-scraped' : 'status-pending'}">
                ${row.is_scraped === 1 ? '✓ Scraped' : '⏳ Pending'}
            </div>
        </div>
        
        <div class="content-grid">
            <div class="image-section">
                <h3>📷 Screenshot</h3>
                ${imageExists 
                  ? `<img src="${relativeImagePath}" alt="Question ${row.id}" onclick="openModal('${relativeImagePath}')" title="Click to zoom">` 
                  : '<div class="no-image">❌ Image not found</div>'}
            </div>
            
            <div class="data-section">
                <h3>📝 Scraped Data</h3>
                ${row.scraped_data 
                  ? `<div class="json-data">${scrapedDataFormatted}</div>` 
                  : '<div class="no-data">No data available</div>'}
            </div>
        </div>
        
        <div class="metadata">
            <div class="metadata-item">
                <span class="metadata-label">Filename:</span>
                <span>${row.filename}</span>
            </div>
        </div>
        
        <div class="feedback-section">
            <span class="feedback-label">📋 Feedback:</span>
            <select class="feedback-dropdown" id="feedback-${row.id}" onchange="saveFeedback(${row.id}, this.value)">
                <option value="Ok" ${(feedbackData[row.id] || 'Ok') === 'Ok' ? 'selected' : ''}>✓ Ok</option>
                <option value="Incorrect" ${(feedbackData[row.id] || 'Ok') === 'Incorrect' ? 'selected' : ''}>✗ Incorrect</option>
                <option value="Alignment Issue" ${(feedbackData[row.id] || 'Ok') === 'Alignment Issue' ? 'selected' : ''}>⚠ Alignment Issue</option>
                <option value="Answer not Clear" ${(feedbackData[row.id] || 'Ok') === 'Answer not Clear' ? 'selected' : ''}>❓ Answer not Clear</option>
            </select>
            <div class="correct-answer-section" id="correct-answer-${row.id}">
                <label class="correct-answer-label">✏️ Enter Correct Answer:</label>
                <input type="text" class="correct-answer-input" id="correct-input-${row.id}" 
                       placeholder="Type the correct answer here..." 
                       onchange="saveCorrectAnswer(${row.id}, this.value)">
            </div>
        </div>
    </div>
`;
        });

        htmlContent += `
    <script>
        let feedbackData = ${JSON.stringify(feedbackData)};
        let correctAnswers = {};
        
        function openModal(imageSrc) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImage');
            modal.style.display = 'block';
            modalImg.src = imageSrc;
        }
        
        function closeModal() {
            document.getElementById('imageModal').style.display = 'none';
        }
        
        function saveCorrectAnswer(questionId, value) {
            correctAnswers[questionId] = value;
            localStorage.setItem('correctAnswers', JSON.stringify(correctAnswers));
            console.log('Correct answer saved for question', questionId, ':', value);
        }
        
        function saveFeedback(questionId, value) {
            feedbackData[questionId] = value;
            
            // Update dropdown styling based on value
            const dropdown = document.getElementById('feedback-' + questionId);
            dropdown.className = 'feedback-dropdown';
            if (value === 'Ok') dropdown.classList.add('ok');
            else if (value === 'Incorrect') dropdown.classList.add('incorrect');
            else if (value === 'Alignment Issue') dropdown.classList.add('alignment');
            else if (value === 'Answer not Clear') dropdown.classList.add('unclear');
            
            // Update question card background
            const card = dropdown.closest('.question-card');
            card.className = 'question-card';
            if (value === 'Incorrect') {
                card.classList.add('incorrect');
            } else if (value === 'Answer not Clear') {
                card.classList.add('unclear');
            } else if (value === 'Alignment Issue') {
                card.classList.add('alignment');
            }
            
            // Show/hide correct answer textbox
            const correctAnswerSection = document.getElementById('correct-answer-' + questionId);
            if (value === 'Incorrect') {
                correctAnswerSection.classList.add('show');
            } else {
                correctAnswerSection.classList.remove('show');
            }
            
            // Save to localStorage
            localStorage.setItem('questionFeedback', JSON.stringify(feedbackData));
            
            console.log('Feedback saved for question', questionId, ':', value);
        }
        
        // Load feedback from localStorage on page load
        window.addEventListener('DOMContentLoaded', function() {
            const saved = localStorage.getItem('questionFeedback');
            const savedAnswers = localStorage.getItem('correctAnswers');
            
            if (savedAnswers) {
                correctAnswers = JSON.parse(savedAnswers);
            }
            
            if (saved) {
                feedbackData = JSON.parse(saved);
                // Update all dropdowns and card backgrounds
                Object.keys(feedbackData).forEach(id => {
                    const dropdown = document.getElementById('feedback-' + id);
                    if (dropdown) {
                        dropdown.value = feedbackData[id];
                        dropdown.className = 'feedback-dropdown';
                        const value = feedbackData[id];
                        if (value === 'Ok') dropdown.classList.add('ok');
                        else if (value === 'Incorrect') dropdown.classList.add('incorrect');
                        else if (value === 'Alignment Issue') dropdown.classList.add('alignment');
                        else if (value === 'Answer not Clear') dropdown.classList.add('unclear');
                        
                        // Update question card background
                        const card = dropdown.closest('.question-card');
                        card.className = 'question-card';
                        if (value === 'Incorrect') {
                            card.classList.add('incorrect');
                        } else if (value === 'Answer not Clear') {
                            card.classList.add('unclear');
                        } else if (value === 'Alignment Issue') {
                            card.classList.add('alignment');
                        }
                        
                        // Show correct answer textbox if incorrect
                        const correctAnswerSection = document.getElementById('correct-answer-' + id);
                        if (value === 'Incorrect') {
                            correctAnswerSection.classList.add('show');
                            // Restore saved correct answer
                            if (correctAnswers[id]) {
                                document.getElementById('correct-input-' + id).value = correctAnswers[id];
                            }
                        }
                    }
                });
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
    </script>
</body>
</html>`;

        // Ensure report directory exists
        const reportDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }

        // Write HTML file
        fs.writeFile(OUTPUT_FILE, htmlContent, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`✓ Report generated: ${OUTPUT_FILE}`);
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
    await generateReport();
    console.log('\n✅ Report generation completed!');
    console.log(`📄 Open ${OUTPUT_FILE} in your browser to view the report`);
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
      process.exit(0);
    });
  }
})();
