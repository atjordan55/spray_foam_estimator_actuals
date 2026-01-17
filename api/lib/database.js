const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initDatabase() {
  const pool = getPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobber_tokens (
        id INTEGER PRIMARY KEY DEFAULT 1,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      )
    `);
  } catch (err) {
    console.error('Database init error:', err);
  }
}

async function getTokens() {
  const pool = getPool();
  try {
    await initDatabase();
    const result = await pool.query('SELECT * FROM jobber_tokens WHERE id = 1');
    if (result.rows.length > 0) {
      return {
        access_token: result.rows[0].access_token,
        refresh_token: result.rows[0].refresh_token,
        expires_at: parseInt(result.rows[0].expires_at),
      };
    }
    return null;
  } catch (err) {
    console.error('Get tokens error:', err);
    return null;
  }
}

async function saveTokens(tokens) {
  const pool = getPool();
  try {
    await initDatabase();
    await pool.query(`
      INSERT INTO jobber_tokens (id, access_token, refresh_token, expires_at, updated_at)
      VALUES (1, $1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        access_token = $1,
        refresh_token = $2,
        expires_at = $3,
        updated_at = NOW()
    `, [tokens.access_token, tokens.refresh_token, tokens.expires_at]);
  } catch (err) {
    console.error('Save tokens error:', err);
  }
}

async function deleteTokens() {
  const pool = getPool();
  try {
    await pool.query('DELETE FROM jobber_tokens WHERE id = 1');
  } catch (err) {
    console.error('Delete tokens error:', err);
  }
}

module.exports = { getPool, initDatabase, getTokens, saveTokens, deleteTokens };
