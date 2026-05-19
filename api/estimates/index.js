const { sql, setHeaders } = require('../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { id, estimate_name = null, customer_name = null, customer_email = null, customer_phone = null } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    const rows = await sql`
      INSERT INTO estimates (id, estimate_name, customer_name, customer_email, customer_phone, updated_at)
      VALUES (${id}, ${estimate_name}, ${customer_name}, ${customer_email}, ${customer_phone}, NOW())
      ON CONFLICT (id) DO UPDATE
        SET estimate_name = EXCLUDED.estimate_name,
            customer_name = EXCLUDED.customer_name,
            customer_email = EXCLUDED.customer_email,
            customer_phone = EXCLUDED.customer_phone,
            updated_at = NOW()
      RETURNING *
    `;
    res.json({ estimate: rows[0] });
  } catch (err) {
    console.error('upsert estimate error:', err);
    res.status(500).json({ error: err.message });
  }
};
