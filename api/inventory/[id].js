const { sql, setHeaders } = require('../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await sql`DELETE FROM material_inventory WHERE id = ${req.query.id}`;
    res.json({ deleted: true });
  } catch (err) {
    console.error('delete inventory error:', err);
    res.status(500).json({ error: err.message });
  }
};
