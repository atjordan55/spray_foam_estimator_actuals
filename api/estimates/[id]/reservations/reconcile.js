const { getPool, setHeaders } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const client = await getPool().connect();
  try {
    const estimateId = req.query.id;
    const { actuals = {} } = req.body || {};
    await client.query('BEGIN');
    const estLookup = await client.query(`SELECT estimate_name, signed_at FROM estimates WHERE id = $1`, [estimateId]);
    if (!estLookup.rows[0]?.signed_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Estimate must be marked as signed before reconciling inventory.' });
    }
    const estimateName = estLookup.rows[0]?.estimate_name || '';
    const resvRes = await client.query(
      `SELECT * FROM inventory_reservations
       WHERE estimate_id = $1 AND status = 'committed'
       FOR UPDATE`,
      [estimateId]
    );
    const updates = [];
    for (const r of resvRes.rows) {
      const reservedGallons = parseFloat(r.gallons_surplus) || 0;
      const actualUsedRaw = actuals[r.material_type_id];
      const actualUsed = actualUsedRaw != null && !isNaN(parseFloat(actualUsedRaw))
        ? Math.max(0, parseFloat(actualUsedRaw))
        : reservedGallons;
      const deductGallons = Math.min(actualUsed, reservedGallons);
      if (deductGallons > 0) {
        await client.query(`
          INSERT INTO material_inventory
            (material_type_id, material_type_name, material_category, gallons, inventory_unit,
             cost_per_gallon, source, source_estimate_name, committed_to_estimate,
             committed_at, is_surplus, notes)
          VALUES ($1, $2, $3, $4, 'gallons', 0, 'reservation_reconciliation', $5, $5, NOW(), true, $6)
        `, [
          r.material_type_id, r.material_type_name, r.material_category,
          -deductGallons, estimateName,
          `Reconciled from reservation #${r.id} (reserved ${reservedGallons.toFixed(1)} gal, used ${actualUsed.toFixed(1)} gal)`
        ]);
      }
      const upd = await client.query(
        `UPDATE inventory_reservations
         SET status = 'reconciled', actual_gallons_used = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [actualUsed, r.id]
      );
      updates.push(upd.rows[0]);
    }
    await client.query('COMMIT');
    res.json({ reservations: updates });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('reconcile error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
