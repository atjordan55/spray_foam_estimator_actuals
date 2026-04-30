const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
}

async function initDatabase() {
  const sql = getDb();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS jobber_tokens (
        id INTEGER PRIMARY KEY DEFAULT 1,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      )
    `;
  } catch (err) {
    console.error('Database init error:', err);
  }
}

async function getTokens() {
  const sql = getDb();
  try {
    await initDatabase();
    const result = await sql`SELECT * FROM jobber_tokens WHERE id = 1`;
    if (result.length > 0) {
      return {
        access_token: result[0].access_token,
        refresh_token: result[0].refresh_token,
        expires_at: parseInt(result[0].expires_at),
      };
    }
    return null;
  } catch (err) {
    console.error('Get tokens error:', err);
    return null;
  }
}

async function saveTokens(tokens) {
  const sql = getDb();
  try {
    await initDatabase();
    await sql`
      INSERT INTO jobber_tokens (id, access_token, refresh_token, expires_at, updated_at)
      VALUES (1, ${tokens.access_token}, ${tokens.refresh_token}, ${tokens.expires_at}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        access_token = ${tokens.access_token},
        refresh_token = ${tokens.refresh_token},
        expires_at = ${tokens.expires_at},
        updated_at = NOW()
    `;
  } catch (err) {
    console.error('Save tokens error:', err);
  }
}

async function deleteTokens() {
  const sql = getDb();
  try {
    await sql`DELETE FROM jobber_tokens WHERE id = 1`;
  } catch (err) {
    console.error('Delete tokens error:', err);
  }
}

module.exports = { getDb, initDatabase, getTokens, saveTokens, deleteTokens };
