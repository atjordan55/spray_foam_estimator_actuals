const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
}

async function deleteTokens() {
  const sql = getDb();
  try {
    await sql`DELETE FROM jobber_tokens WHERE id = 1`;
  } catch (err) {
    console.error('Delete tokens error:', err);
  }
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
    await deleteTokens();
    res.json({ success: true });
  } catch (err) {
    console.error('Disconnect error:', err);
    res.status(500).json({ error: err.message });
  }
};
