const { sql, setHeaders } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rows = await sql`
      UPDATE inventory_reservations
      SET status = 'released', updated_at = NOW()
      WHERE estimate_id = ${req.query.id} AND status IN ('reserved','committed')
      RETURNING *
    `;
    res.json({ reservations: rows });
  } catch (err) {
    console.error('release reservations error:', err);
    res.status(500).json({ error: err.message });
  }
};
