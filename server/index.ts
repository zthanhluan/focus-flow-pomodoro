import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import validator from 'validator';

const app = express();
const PORT = process.env.PORT || 3001;

// --- Database Setup ---
let db: any;
async function initDb() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  
  // Create table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      tasks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add 'tasks' column if it was missing from a previous version
  try {
    await db.exec('ALTER TABLE subscribers ADD COLUMN tasks TEXT');
  } catch (e) {
    // Column already exists, ignore error
  }
  
  console.log('Database initialized.');
}

// --- Middleware ---
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());

const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many subscription attempts, please try again later.' }
});

// --- API Endpoints ---

// 1. Collect student email & sync initial data
app.post('/api/subscribe', subscribeLimiter, async (req, res) => {
  const { email, tasks } = req.body;

  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid student email address.' });
  }

  try {
    const tasksJson = JSON.stringify(tasks || []);
    // Upsert logic
    await db.run(
      'INSERT INTO subscribers (email, tasks) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET tasks = excluded.tasks', 
      [email.toLowerCase().trim(), tasksJson]
    );
    return res.status(201).json({ message: 'Cloud Sync Active! Your sessions are now safely backed up.' });
  } catch (err: any) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
});

// --- Admin Endpoints (Secret) ---
const ADMIN_SECRET_KEY = 'focus_admin_2024'; 

app.get('/api/admin/subscribers', async (req, res) => {
  const { key } = req.query;

  if (key !== ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Access denied. Invalid secret key.' });
  }

  try {
    const rows = await db.all('SELECT id, email, tasks, created_at FROM subscribers ORDER BY created_at DESC');
    const data = rows.map((row: any) => ({
      ...row,
      tasks: JSON.parse(row.tasks || '[]')
    }));
    return res.json({ count: data.length, subscribers: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch subscribers.' });
  }
});

// 2. Serve Static Files
const rootPath = process.cwd();
app.use(express.static(rootPath));

app.use((req, res) => {
  res.sendFile(path.join(rootPath, 'index.html'));
});

// Start Server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend Architect: Server running on http://localhost:${PORT}`);
  });
});
