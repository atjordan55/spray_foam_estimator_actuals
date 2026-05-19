const { sql, setHeaders } = require('../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rows = await sql`
      SELECT r.*, e.estimate_name, e.customer_name
      FROM inventory_reservations r
      LEFT JOIN estimates e ON e.id = r.estimate_id
      WHERE r.status IN ('reserved','committed')
      ORDER BY r.created_at DESC
    `;
    res.json({ reservations: rows });
  } catch (err) {
    console.error('list reservations error:', err);
    res.status(500).json({ error: err.message });
  }
};
