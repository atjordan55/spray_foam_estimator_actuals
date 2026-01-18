const { Pool } = require('pg');

const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
const BASE_URL = 'https://spray-form-estimator.vercel.app';
const REDIRECT_URI = `${BASE_URL}/api/auth/jobber/callback`;

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
  const db = getPool();
  await db.query(`
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
}

async function saveTokens(tokens) {
  const db = getPool();
  await initDatabase();
  await db.query(`
    INSERT INTO jobber_tokens (id, access_token, refresh_token, expires_at, updated_at)
    VALUES (1, $1, $2, $3, NOW())
    ON CONFLICT (id) DO UPDATE SET
      access_token = $1,
      refresh_token = $2,
      expires_at = $3,
      updated_at = NOW()
  `, [tokens.access_token, tokens.refresh_token, tokens.expires_at]);
}

module.exports = async function handler(req, res) {
  const { code, error } = req.query;
  
  if (error) {
    return res.redirect(307, `${BASE_URL}/?jobber_error=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    return res.redirect(307, `${BASE_URL}/?jobber_error=no_code`);
  }
  
  try {
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    
    const tokenResponse = await fetchFn(JOBBER_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.JOBBER_CLIENT_ID,
        client_secret: process.env.JOBBER_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('Token error:', tokens);
      return res.redirect(307, `${BASE_URL}/?jobber_error=${encodeURIComponent(tokens.error_description || tokens.error)}`);
    }
    
    const expiresIn = tokens.expires_in || 3600;
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (expiresIn * 1000),
    };
    
    await saveTokens(tokenData);
    
    res.redirect(307, `${BASE_URL}/?jobber_connected=true`);
  } catch (err) {
    console.error('OAuth error:', err);
    res.redirect(307, `${BASE_URL}/?jobber_error=${encodeURIComponent(err.message || 'Connection failed')}`);
  }
};
