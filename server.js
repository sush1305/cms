import express from 'express';
import pg from 'pg';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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
    console.error(`[Database Query Error] ${text}:`, err.message);
    throw err;
  }
};

/**
 * INITIALIZATION & AUTO-MIGRATION
 * Robust sequence to ensure DB state matches requirement.
 */
const bootstrapDB = async () => {
  console.log('[DB] Running bootstrap sequence...');
  try {
    // 1. Load SQL from files for consistency if they exist, otherwise use fallback
    const migrationPath = path.resolve('migrations.sql');
    const seedPath = path.resolve('seed.sql');

    if (fs.existsSync(migrationPath)) {
      console.log('[DB] Applying migrations from migrations.sql...');
      const migrations = fs.readFileSync(migrationPath, 'utf8');
      await query(migrations);
    } else {
      console.warn('[DB] migrations.sql not found, using internal schema definition.');
      // Internal fallback same as migrations.sql
      await query(`
        CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, username TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS topics (id UUID PRIMARY KEY, name TEXT UNIQUE NOT NULL);
        CREATE TABLE IF NOT EXISTS programs (id UUID PRIMARY KEY, title TEXT NOT NULL, description TEXT, language_primary TEXT DEFAULT 'en', languages_available JSONB DEFAULT '["en"]', status TEXT DEFAULT 'draft', topic_ids JSONB DEFAULT '[]', published_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS terms (id UUID PRIMARY KEY, program_id UUID REFERENCES programs(id) ON DELETE CASCADE, term_number INTEGER NOT NULL, title TEXT, created_at TIMESTAMP DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS lessons (id UUID PRIMARY KEY, term_id UUID REFERENCES terms(id) ON DELETE CASCADE, lesson_number INTEGER NOT NULL, title TEXT NOT NULL, content_type TEXT DEFAULT 'video', status TEXT DEFAULT 'draft', publish_at TIMESTAMP, published_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS assets (id UUID PRIMARY KEY, parent_id UUID NOT NULL, language TEXT DEFAULT 'en', variant TEXT NOT NULL, asset_type TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(parent_id, language, variant, asset_type));
      `);
    }

    // 2. Seed data
    if (fs.existsSync(seedPath)) {
      console.log('[DB] Seeding data from seed.sql...');
      const seeds = fs.readFileSync(seedPath, 'utf8');
      await query(seeds);
    } else {
      console.log('[DB] seed.sql not found, running internal check.');
      const { rowCount } = await query("SELECT id FROM users LIMIT 1");
      if (rowCount === 0) {
          // Minimal internal seed if file missing
          await query("INSERT INTO users (id, username, email, password, role) VALUES ('00000000-0000-4000-a000-000000000001', 'Administrator', 'admin@chaishorts.com', 'admin123', 'ADMIN') ON CONFLICT DO NOTHING");
      }
    }

    console.log('[DB] Bootstrap complete.');
  } catch (err) {
    console.error('[DB] Critical bootstrap error:', err);
  }
};

// --- BACKGROUND WORKER ---
const runWorker = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    // Publish due lessons
    const { rows: dueLessons } = await client.query(
      "UPDATE lessons SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE status = 'scheduled' AND publish_at <= NOW() RETURNING id, term_id"
    );

    if (dueLessons.length > 0) {
      console.log(`[Worker] Activated ${dueLessons.length} scheduled lessons.`);
      
      for (const lesson of dueLessons) {
        // Automatically publish parent programs that are currently drafts
        const { rows: programInfo } = await client.query(
          "SELECT p.id, p.title FROM programs p JOIN terms t ON t.program_id = p.id WHERE t.id = $1",
          [lesson.term_id]
        );
        
        if (programInfo.length > 0) {
          const prog = programInfo[0];
          const updateRes = await client.query(
            "UPDATE programs SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1 AND status != 'published'",
            [prog.id]
          );
          if (updateRes.rowCount > 0) {
            console.log(`[Worker] Activated parent program: "${prog.title}"`);
          }
        }
      }
    }
    
    await client.query('COMMIT');
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error('[Worker] Fatal Error:', e.message);
  } finally {
    if (client) client.release();
  }
};

// Run worker every 30 seconds
setInterval(runWorker, 30000); 

// --- PUBLIC CATALOG API ---

app.get('/catalog/programs', async (req, res) => {
  try {
    const offset = parseInt(req.query.cursor) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const topic = req.query.topic;

    // Filter logic: Must be 'published' AND have at least one 'published' lesson
    let sql = `
      SELECT p.*, 
        COALESCE((
            SELECT jsonb_agg(t.name) 
            FROM topics t 
            WHERE t.id::text IN (
                SELECT jsonb_array_elements_text(
                    CASE WHEN jsonb_typeof(p.topic_ids) = 'array' THEN p.topic_ids ELSE '[]'::jsonb END
                )
            )
        ), '[]'::jsonb) as topics,
        COALESCE((
            SELECT jsonb_object_agg(a.variant, a.url) 
            FROM assets a 
            WHERE a.parent_id = p.id AND a.asset_type = 'poster'
        ), '{}'::jsonb) as posters
      FROM programs p
      WHERE p.status = 'published'
      AND EXISTS (
        SELECT 1 FROM terms t 
        JOIN lessons l ON l.term_id = t.id 
        WHERE t.program_id = p.id AND l.status = 'published'
      )
    `;
    const params = [];

    if (topic) {
        params.push(topic);
        sql += ` AND p.topic_ids @> jsonb_build_array($${params.length})`;
    }

    sql += ` ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    
    const countSql = `
        SELECT count(*) FROM programs p 
        WHERE p.status = 'published' 
        AND EXISTS (SELECT 1 FROM terms t JOIN lessons l ON l.term_id = t.id WHERE t.program_id = p.id AND l.status = 'published')
    `;
    const countResult = await query(countSql, []);
    
    res.json({
        data: result.rows,
        pagination: {
            next_cursor: result.rows.length === limit ? offset + limit : null,
            total: parseInt(countResult.rows[0].count),
            limit: limit
        }
    });
  } catch (err) {
    console.error('[API] Catalog retrieval failed:', err);
    res.status(500).json({ error: 'Catalog retrieval failed', details: err.message });
  }
});

// --- SYSTEM DEBUG & UTILITIES ---

app.get('/api/debug/stats', async (req, res) => {
  try {
    const programs = await query("SELECT status, count(*) FROM programs GROUP BY status", []);
    const lessons = await query("SELECT status, count(*) FROM lessons GROUP BY status", []);
    res.json({ programs: programs.rows, lessons: lessons.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/debug/bootstrap', async (req, res) => {
  try {
    await bootstrapDB();
    res.json({ success: true, message: 'Bootstrap triggered.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN API ENDPOINTS ---

app.get('/api/users', async (req, res) => {
    const r = await query('SELECT id, username, email, role FROM users ORDER BY created_at ASC');
    res.json(r.rows);
});

app.post('/api/users', async (req, res) => {
    const { id, username, email, password, role } = req.body;
    await query('INSERT INTO users (id, username, email, password, role) VALUES ($1, $2, $3, $4, $5)', [id, username, email, password, role]);
    res.status(201).json({ success: true });
});

app.get('/api/programs', async (req, res) => {
    const r = await query('SELECT * FROM programs ORDER BY created_at DESC');
    res.json(r.rows);
});

app.post('/api/programs', async (req, res) => {
    const p = req.body;
    const langs = JSON.stringify(p.languages_available || [p.language_primary]);
    const topics = JSON.stringify(p.topic_ids || []);
    await query(
      'INSERT INTO programs (id, title, description, language_primary, languages_available, status, topic_ids, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
      [p.id, p.title, p.description, p.language_primary, langs, p.status, topics]
    );
    res.status(201).json({ success: true });
});

app.get('/api/topics', async (req, res) => {
    const r = await query('SELECT * FROM topics ORDER BY name ASC');
    res.json(r.rows);
});

app.get('/api/terms', async (req, res) => {
    const r = await query('SELECT * FROM terms ORDER BY term_number ASC');
    res.json(r.rows);
});

app.post('/api/terms', async (req, res) => {
    const { id, program_id, term_number, title } = req.body;
    await query('INSERT INTO terms (id, program_id, term_number, title) VALUES ($1, $2, $3, $4)', [id, program_id, term_number, title]);
    res.status(201).json({ success: true });
});

app.get('/api/lessons', async (req, res) => {
    const r = await query('SELECT * FROM lessons ORDER BY lesson_number ASC');
    res.json(r.rows);
});

app.put('/api/lessons/:id', async (req, res) => {
    const { id } = req.params;
    const l = req.body;
    await query(
        `UPDATE lessons SET title = $1, status = $2, publish_at = $3, updated_at = NOW() WHERE id = $4`,
        [l.title, l.status, l.publish_at, id]
    );
    res.json({ success: true });
});

app.post('/api/lessons', async (req, res) => {
    const l = req.body;
    const pubAt = l.publish_at || null;
    await query(
        `INSERT INTO lessons (id, term_id, lesson_number, title, content_type, status, publish_at, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [l.id, l.term_id, l.lesson_number, l.title, l.content_type, l.status, pubAt]
    );
    res.status(201).json({ success: true });
});

app.get('/api/assets', async (req, res) => {
    const r = await query('SELECT * FROM assets');
    res.json(r.rows);
});

app.post('/api/assets/upsert', async (req, res) => {
    const { id, parent_id, language, variant, asset_type, url } = req.body;
    await query(
        `INSERT INTO assets (id, parent_id, language, variant, asset_type, url) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (parent_id, language, variant, asset_type) DO UPDATE SET url = EXCLUDED.url`,
        [id, parent_id, language, variant, asset_type, url]
    );
    res.json({ success: true });
});

app.listen(port, async () => {
    console.log(`[API] CMS Engine online at port ${port}`);
    await bootstrapDB();
});