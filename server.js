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
 */
const bootstrapDB = async () => {
  console.log('[DB] Running bootstrap sequence...');
  try {
    const migrationPath = path.resolve('migrations.sql');
    const seedPath = path.resolve('seed.sql');

    const schema = `
        CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, username TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS topics (id UUID PRIMARY KEY, name TEXT UNIQUE NOT NULL);
        CREATE TABLE IF NOT EXISTS programs (id UUID PRIMARY KEY, title TEXT NOT NULL, description TEXT, language_primary TEXT DEFAULT 'en', languages_available JSONB DEFAULT '["en"]', status TEXT DEFAULT 'draft', topic_ids JSONB DEFAULT '[]', published_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS terms (id UUID PRIMARY KEY, program_id UUID REFERENCES programs(id) ON DELETE CASCADE, term_number INTEGER NOT NULL, title TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS lessons (id UUID PRIMARY KEY, term_id UUID REFERENCES terms(id) ON DELETE CASCADE, lesson_number INTEGER NOT NULL, title TEXT NOT NULL, content_type TEXT DEFAULT 'video', status TEXT DEFAULT 'draft', publish_at TIMESTAMPTZ, published_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS assets (id UUID PRIMARY KEY, parent_id UUID NOT NULL, language TEXT DEFAULT 'en', variant TEXT NOT NULL, asset_type TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(parent_id, language, variant, asset_type));
        
        CREATE INDEX IF NOT EXISTS idx_lessons_status_publish ON lessons (status, publish_at);
        CREATE INDEX IF NOT EXISTS idx_programs_status ON programs (status);
    `;

    if (fs.existsSync(migrationPath)) {
      console.log('[DB] Applying migrations from migrations.sql...');
      const migrations = fs.readFileSync(migrationPath, 'utf8');
      await query(migrations);
    } else {
      console.log('[DB] Applying standard schema...');
      await query(schema);
    }

    if (fs.existsSync(seedPath)) {
      console.log('[DB] Seeding data from seed.sql...');
      const seeds = fs.readFileSync(seedPath, 'utf8');
      await query(seeds);
    } else {
      const { rowCount } = await query("SELECT id FROM users LIMIT 1");
      if (rowCount === 0) {
          await query("INSERT INTO users (id, username, email, password, role) VALUES ('00000000-0000-4000-a000-000000000001', 'Administrator', 'admin@chaishorts.com', 'admin123', 'ADMIN') ON CONFLICT DO NOTHING");
          console.log('[DB] Default admin user created.');
      }
    }

    console.log('[DB] Bootstrap complete.');
  } catch (err) {
    console.error('[DB] Critical bootstrap error:', err);
  }
};

// --- BACKGROUND WORKER ---
let workerRunning = false;
const runWorker = async () => {
  if (workerRunning) return;
  workerRunning = true;
  
  let client;
  try {
    client = await pool.connect();
    
    // Check pending count for monitoring
    const { rows: pending } = await client.query("SELECT count(*) FROM lessons WHERE status = 'scheduled'");
    const scheduledCount = parseInt(pending[0].count);
    
    // Log worker heartbeat
    console.debug(`[Worker Heartbeat] ${new Date().toISOString()} - ${scheduledCount} lessons scheduled.`);

    await client.query('BEGIN');
    
    const { rows: dueLessons } = await client.query(
      `UPDATE lessons 
       SET status = 'published', 
           published_at = clock_timestamp(), 
           updated_at = clock_timestamp() 
       WHERE status = 'scheduled' 
       AND publish_at IS NOT NULL 
       AND publish_at <= clock_timestamp() 
       RETURNING id, title, term_id`
    );

    if (dueLessons.length > 0) {
      console.log(`[Worker] Successfully published ${dueLessons.length} lessons: ${dueLessons.map(l => l.title).join(', ')}`);
      
      for (const lesson of dueLessons) {
        const { rows: programInfo } = await client.query(
          "SELECT p.id, p.title, p.status FROM programs p JOIN terms t ON t.program_id = p.id WHERE t.id = $1",
          [lesson.term_id]
        );
        
        if (programInfo.length > 0) {
          const prog = programInfo[0];
          if (prog.status !== 'published') {
            const updateRes = await client.query(
              "UPDATE programs SET status = 'published', published_at = COALESCE(published_at, clock_timestamp()), updated_at = clock_timestamp() WHERE id = $1",
              [prog.id]
            );
            if (updateRes.rowCount > 0) {
              console.log(`[Worker] Cascade: Published parent program "${prog.title}"`);
            }
          }
        }
      }
    }
    
    await client.query('COMMIT');
  } catch (e) {
    if (client) {
        try { await client.query('ROLLBACK'); } catch(rbErr) { console.error('[Worker] Rollback Failed:', rbErr.message); }
    }
    console.error('[Worker] Fatal error during execution cycle:', e.message);
  } finally {
    if (client) client.release();
    workerRunning = false;
  }
};

setInterval(runWorker, 20000); 

// --- PUBLIC CATALOG API ---

app.get('/catalog/programs', async (req, res) => {
  try {
    const offset = parseInt(req.query.cursor) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const topic = req.query.topic;

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
    const publishAt = (typeof l.publish_at === 'string' && l.publish_at.trim() !== '') ? l.publish_at : null;
    await query(
        `UPDATE lessons SET title = $1, status = $2, publish_at = $3, updated_at = NOW() WHERE id = $4`,
        [l.title, l.status, publishAt, id]
    );
    res.json({ success: true });
});

app.post('/api/lessons', async (req, res) => {
    const l = req.body;
    const pubAt = (typeof l.publish_at === 'string' && l.publish_at.trim() !== '') ? l.publish_at : null;
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
