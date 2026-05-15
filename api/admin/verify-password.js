const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;
    const sql = getDb();
    const result = await sql`SELECT settings FROM admin_settings WHERE id = 1`;
    if (result.length === 0) {
      return res.status(401).json({ error: 'No settings configured' });
    }
    if (result[0].settings.adminPassword === password) {
      res.json({ verified: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (err) {
    console.error('Verify password error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
