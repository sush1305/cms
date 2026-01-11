
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://chaishorts:password123@db:5432/chaishorts_cms',
});

const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err;
  }
};

// --- Background Worker Logic ---
const runWorker = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    // 1. Find scheduled lessons that are due
    const { rows: dueLessons } = await client.query(
      "UPDATE lessons SET status = 'published', published_at = NOW() WHERE status = 'scheduled' AND publish_at <= NOW() RETURNING id, term_id"
    );

    if (dueLessons.length > 0) {
      console.log(`[Worker] Published ${dueLessons.length} lessons.`);
      
      // 2. Identify programs that need auto-publishing
      for (const lesson of dueLessons) {
        const { rows: programInfo } = await client.query(
          "SELECT p.id FROM programs p JOIN terms t ON t.program_id = p.id WHERE t.id = $1",
          [lesson.term_id]
        );
        
        if (programInfo.length > 0) {
          const progId = programInfo[0].id;
          await client.query(
            "UPDATE programs SET status = 'published', published_at = COALESCE(published_at, NOW()) WHERE id = $1 AND status != 'published'",
            [progId]
          );
        }
      }
    }
    
    await client.query('COMMIT');
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error('[Worker Error]', e.message);
  } finally {
    if (client) client.release();
  }
};

// Start worker every 15 seconds
setInterval(runWorker, 15000); 

// --- API Endpoints ---

app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

const sendList = (res, rows) => res.json(Array.isArray(rows) ? rows : []);

// Users
app.get('/api/users', async (req, res) => {
  try {
    const result = await query('SELECT id, username, email, role, password FROM users');
    sendList(res, result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { id, username, email, password, role } = req.body;
    await query('INSERT INTO users (id, username, email, password, role) VALUES ($1, $2, $3, $4, $5)', [id, username, email, password, role]);
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, email, role } = req.body;
    await query('UPDATE users SET username=$1, email=$2, role=$3 WHERE id=$4', [username, email, role, req.params.id]);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Programs
app.get('/api/programs', async (req, res) => {
  try {
    const result = await query('SELECT * FROM programs ORDER BY created_at DESC');
    sendList(res, result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

app.post('/api/programs', async (req, res) => {
  try {
    const p = req.body;
    await query('INSERT INTO programs (id, title, description, language_primary, languages_available, status, topic_ids) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
      [p.id, p.title, p.description, p.language_primary, JSON.stringify(p.languages_available), p.status, JSON.stringify(p.topic_ids)]);
    res.status(201).json({ success: true, id: p.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create program' });
  }
});

app.delete('/api/programs/:id', async (req, res) => {
  try {
    await query('DELETE FROM programs WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

// Terms
app.get('/api/terms', async (req, res) => {
  try {
    const result = await query('SELECT * FROM terms ORDER BY term_number ASC');
    sendList(res, result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

app.post('/api/terms', async (req, res) => {
  try {
    const { id, program_id, term_number, title } = req.body;
    await query('INSERT INTO terms (id, program_id, term_number, title) VALUES ($1, $2, $3, $4)', [id, program_id, term_number, title]);
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create term' });
  }
});

app.delete('/api/terms/:id', async (req, res) => {
  try {
    await query('DELETE FROM terms WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete term' });
  }
});

// Lessons
app.get('/api/lessons', async (req, res) => {
  try {
    const result = await query('SELECT * FROM lessons ORDER BY lesson_number ASC');
    sendList(res, result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

app.post('/api/lessons', async (req, res) => {
  try {
    const l = req.body;
    await query(`INSERT INTO lessons (id, term_id, lesson_number, title, content_type, duration_ms, is_paid, content_language_primary, content_languages_available, content_urls_by_language, status, publish_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, 
      [l.id, l.term_id, l.lesson_number, l.title, l.content_type, l.duration_ms || 0, l.is_paid || false, l.content_language_primary, JSON.stringify(l.content_languages_available || []), JSON.stringify(l.content_urls_by_language || {}), l.status, l.publish_at]);
    res.status(201).json({ success: true, id: l.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

app.put('/api/lessons/:id', async (req, res) => {
  try {
    const l = req.body;
    await query(`UPDATE lessons SET term_id=$1, lesson_number=$2, title=$3, content_type=$4, duration_ms=$5, is_paid=$6, content_language_primary=$7, content_languages_available=$8, content_urls_by_language=$9, status=$10, publish_at=$11, updated_at=NOW() WHERE id=$12`, 
      [l.term_id, l.lesson_number, l.title, l.content_type, l.duration_ms, l.is_paid, l.content_language_primary, JSON.stringify(l.content_languages_available), JSON.stringify(l.content_urls_by_language), l.status, l.publish_at, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

app.delete('/api/lessons/:id', async (req, res) => {
  try {
    await query('DELETE FROM lessons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// Assets
app.get('/api/assets', async (req, res) => {
  try {
    const result = await query('SELECT * FROM assets');
    sendList(res, result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

app.post('/api/assets/upsert', async (req, res) => {
  try {
    const { id, parent_id, language, variant, asset_type, url } = req.body;
    await query(`INSERT INTO assets (id, parent_id, language, variant, asset_type, url) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (parent_id, language, variant, asset_type) DO UPDATE SET url = EXCLUDED.url`, 
      [id, parent_id, language, variant, asset_type, url]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upsert asset' });
  }
});

// Topics
app.get('/api/topics', async (req, res) => {
  try {
    const result = await query('SELECT * FROM topics');
    sendList(res, result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
