// Shared DB helpers for Vercel serverless functions.
//   sql        — neon HTTP client; use for single-statement reads/writes.
//   getPool()  — neon WebSocket Pool; use for multi-statement transactions
//                (BEGIN / COMMIT, SELECT FOR UPDATE, etc.).
const { neon, Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Pool needs a WebSocket constructor in Node serverless runtime.
if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws;
}

const sql = neon(process.env.DATABASE_URL);

let _pool = null;
function getPool() {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

// Tiny helper: every function should send no-store + JSON content type.
function setHeaders(res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}

module.exports = { sql, getPool, setHeaders };
