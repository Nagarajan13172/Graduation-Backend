// src/controllers/adminController.js
const db = require('../db');
const fs = require('fs');
const path = require('path');

exports.adminLogin = (req, res) => {
  const { username, password } = req.body;

  // 🔑 Simple hardcoded login — make secure later
  if (username === 'admin' && password === 'secret123') {
    return res.json({ token: 'admin-access-token' });
  } else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};

exports.deleteStudent = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  // Fetch the complete student record before deletion
  db.get('SELECT * FROM students WHERE id = ?', [id], (err, studentRecord) => {
    if (err) {
      console.error('Error fetching student:', err);
      return res.status(500).json({ error: 'Database error while fetching student' });
    }

    if (!studentRecord) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Create deleted-records directory if it doesn't exist
    const deletedRecordsDir = path.join(__dirname, '..', '..', 'data', 'deleted-records');
    if (!fs.existsSync(deletedRecordsDir)) {
      fs.mkdirSync(deletedRecordsDir, { recursive: true });
    }

    // Save the record as JSON with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `student_${id}_${timestamp}.json`;
    const filepath = path.join(deletedRecordsDir, filename);

    const recordData = {
      ...studentRecord,
      deleted_at: new Date().toISOString(),
      deleted_by: 'admin' // You can modify this to include actual admin user info
    };

    fs.writeFile(filepath, JSON.stringify(recordData, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error saving deleted record:', writeErr);
        return res.status(500).json({ error: 'Failed to save deleted record backup' });
      }

      // Now delete the student record from database
      db.run('DELETE FROM students WHERE id = ?', [id], function(deleteErr) {
        if (deleteErr) {
          console.error('Error deleting student:', deleteErr);
          return res.status(500).json({ error: 'Failed to delete student record' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Student not found' });
        }

        res.json({ 
          message: 'Student record deleted successfully',
          deletedId: id,
          changes: this.changes,
          backupFile: filename,
          backupPath: filepath
        });
      });
    });
  });
};
