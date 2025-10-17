const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 80;
const BASE = __dirname;

// Setup uploads
const UPLOAD_DIR = path.join(BASE, 'submissions');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

// Serve static files
app.use('/', express.static(path.join(BASE, 'public')));
app.use('/submissions', express.static(UPLOAD_DIR));

// Create DB
const DB_PATH = path.join(BASE, 'votes.db');
const db = new sqlite3.Database(DB_PATH);


db.serialize(() => {
  // حذف الجدول القديم إذا كان موجودًا (للتصحيح)
  db.run(`DROP TABLE IF EXISTS submissions`);
  db.run(`DROP TABLE IF EXISTS votes`);

  // إنشاء جدول submissions صحيح مع AUTOINCREMENT
  db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    originalName TEXT NOT NULL,
    votes INTEGER DEFAULT 0
  )`);

  // إنشاء جدول votes
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submissionId INTEGER NOT NULL,
    ip TEXT,
    createdAt TEXT,
    UNIQUE(submissionId, ip)
  )`);
});



// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  db.run(
    `INSERT INTO submissions (filename, originalName) VALUES (?, ?)`,
    [req.file.filename, req.file.originalname],
    function(err) {
      if (err) return res.status(500).send(err.message);
      res.redirect('/');
    }
  );
});

// Get submissions
app.get('/api/submissions', (req, res) => {
  db.all(`SELECT * FROM submissions`, (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

// Vote
app.post('/api/vote/:id', (req, res) => {
  const ip = req.ip;
  const id = req.params.id;
  const now = new Date().toISOString();

  db.run(
    `INSERT OR IGNORE INTO votes (submissionId, ip, createdAt) VALUES (?, ?, ?)`,
    [id, ip, now],
    function(err) {
      if (err) return res.status(500).send(err.message);
      db.run(`UPDATE submissions SET votes = votes + 1 WHERE id = ?`, [id], function(err2) {
        if (err2) return res.status(500).send(err2.message);
        res.json({ success: true });
      });
    }
  );
});

// Top 5 for admin
app.get('/api/top', (req, res) => {
  db.all(`SELECT * FROM submissions ORDER BY votes DESC LIMIT 5`, (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

// Redirect shortcuts
app.get('/admin', (req, res) => res.redirect('/admin.html'));
app.get('/upload', (req, res) => res.redirect('/'));

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
