const { getPool, setHeaders } = require('../../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const client = await getPool().connect();
  try {
    const estimateId = req.query.id;
    await client.query('BEGIN');
    await client.query(`INSERT INTO estimates (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [estimateId]);
    const est = await client.query(
      `UPDATE estimates SET signed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [estimateId]
    );
    await client.query(
      `UPDATE inventory_reservations SET status = 'committed', updated_at = NOW()
       WHERE estimate_id = $1 AND status = 'reserved'`,
      [estimateId]
    );
    await client.query('COMMIT');
    res.json({ estimate: est.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('sign estimate error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
