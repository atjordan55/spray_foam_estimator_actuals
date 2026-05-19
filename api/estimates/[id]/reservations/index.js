const { getPool, sql, setHeaders } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  const estimateId = req.query.id;
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM inventory_reservations
        WHERE estimate_id = ${estimateId}
        ORDER BY material_type_name
      `;
      return res.json({ reservations: rows });
    }
    if (req.method === 'POST') {
      const { credits = {} } = req.body || {};
      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO estimates (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [estimateId]);
        await client.query(
          `DELETE FROM inventory_reservations WHERE estimate_id = $1 AND status = 'reserved'`,
          [estimateId]
        );
        const lockedRes = await client.query(
          `SELECT material_type_id FROM inventory_reservations
           WHERE estimate_id = $1 AND status IN ('committed','reconciled')`,
          [estimateId]
        );
        const lockedMaterials = new Set(lockedRes.rows.map(r => r.material_type_id));
        const inserted = [];
        for (const [materialTypeId, gallonsRaw] of Object.entries(credits)) {
          const gallons = parseFloat(gallonsRaw) || 0;
          if (gallons <= 0) continue;
          if (lockedMaterials.has(materialTypeId)) continue;
          const lookup = await client.query(
            `SELECT material_type_name, material_category FROM material_inventory
             WHERE material_type_id = $1 ORDER BY id DESC LIMIT 1`,
            [materialTypeId]
          );
          const name = lookup.rows[0]?.material_type_name || materialTypeId;
          const category = lookup.rows[0]?.material_category || 'foam';
          const row = await client.query(
            `INSERT INTO inventory_reservations
               (estimate_id, material_type_id, material_type_name, material_category,
                gallons_surplus, gallons_non_surplus, status, updated_at)
             VALUES ($1, $2, $3, $4, $5, 0, 'reserved', NOW())
             RETURNING *`,
            [estimateId, materialTypeId, name, category, gallons]
          );
          inserted.push(row.rows[0]);
        }
        await client.query('COMMIT');
        return res.json({ reservations: inserted });
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('reservations error:', err);
    res.status(500).json({ error: err.message });
  }
};
