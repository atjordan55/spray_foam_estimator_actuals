const { sql, setHeaders } = require('../../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rows = await sql`SELECT * FROM estimates WHERE id = ${req.query.id}`;
    res.json({ estimate: rows[0] || null });
  } catch (err) {
    console.error('get estimate error:', err);
    res.status(500).json({ error: err.message });
  }
};
