const { getPool, setHeaders } = require('../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: 'rows array is required and must be non-empty.' });
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const {
        material_type_id, material_type_name,
        material_category = 'foam',
        gallons,
        inventory_unit = 'gallons',
        container_type = null,
        container_equivalent = null,
        cost_per_gallon = 0,
        source = 'manual_addition',
        committed_at = null,
        committed_to_estimate = null,
        source_estimate_name = null,
        source_job_date = null,
        notes = null,
        a_side_gallons = null,
        b_side_gallons = null,
        ratio_percent = null,
        batch_id = null,
        drum_number = null,
        is_surplus = false,
      } = r;
      if (!material_type_id || !material_type_name) {
        throw new Error(`Row ${i + 1}: material_type_id and material_type_name are required.`);
      }
      let finalGallons = gallons;
      let finalASide = a_side_gallons;
      let finalBSide = b_side_gallons;
      if (material_category === 'foam') {
        const aNum = a_side_gallons === '' || a_side_gallons === null || a_side_gallons === undefined
          ? null : parseFloat(a_side_gallons);
        const bNum = b_side_gallons === '' || b_side_gallons === null || b_side_gallons === undefined
          ? null : parseFloat(b_side_gallons);
        if (aNum === null || bNum === null || Number.isNaN(aNum) || Number.isNaN(bNum)) {
          throw new Error(`Row ${i + 1}: foam entries require both a_side_gallons and b_side_gallons.`);
        }
        if (aNum === 0 && bNum === 0) {
          throw new Error(`Row ${i + 1}: at least one of a_side_gallons or b_side_gallons must be non-zero.`);
        }
        finalASide = aNum;
        finalBSide = bNum;
        finalGallons = Math.round((aNum + bNum) * 100) / 100;
      } else if (gallons === undefined || gallons === null || gallons === '' || parseFloat(gallons) === 0) {
        throw new Error(`Row ${i + 1}: a non-zero gallons value is required for non-foam entries.`);
      }
      let finalIsSurplus = !!is_surplus;
      let finalCost = cost_per_gallon;
      if (source === 'surplus_material' || source === 'job_surplus') {
        finalIsSurplus = true;
        finalCost = 0;
      }
      const result = await client.query(`
        INSERT INTO material_inventory
          (material_type_id, material_type_name, material_category, gallons, inventory_unit,
           container_type, container_equivalent, cost_per_gallon, source,
           committed_at, committed_to_estimate, source_estimate_name, source_job_date, notes,
           a_side_gallons, b_side_gallons, ratio_percent, batch_id, drum_number, is_surplus)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        RETURNING *
      `, [
        material_type_id, material_type_name, material_category, finalGallons, inventory_unit,
        container_type, container_equivalent, finalCost, source,
        committed_at, committed_to_estimate, source_estimate_name, source_job_date, notes,
        finalASide, finalBSide, ratio_percent, batch_id, drum_number, finalIsSurplus
      ]);
      inserted.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.json({ entries: inserted });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Batch insert inventory error:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};
