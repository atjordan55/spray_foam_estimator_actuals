const { sql, setHeaders } = require('../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM material_inventory ORDER BY created_at DESC`;
      return res.json({ entries: rows });
    }
    if (req.method === 'POST') {
      const b = req.body || {};
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
      } = b;
      if (!material_type_id || !material_type_name || gallons === undefined || gallons === null || gallons === '') {
        return res.status(400).json({ error: 'material_type_id, material_type_name, and gallons are required' });
      }
      let finalIsSurplus = !!is_surplus;
      let finalCost = cost_per_gallon;
      if (source === 'surplus_material' || source === 'job_surplus') {
        finalIsSurplus = true;
        finalCost = 0;
      }
      const rows = await sql`
        INSERT INTO material_inventory
          (material_type_id, material_type_name, material_category, gallons, inventory_unit,
           container_type, container_equivalent, cost_per_gallon, source,
           committed_at, committed_to_estimate, source_estimate_name, source_job_date, notes,
           a_side_gallons, b_side_gallons, ratio_percent, batch_id, drum_number, is_surplus)
        VALUES (${material_type_id}, ${material_type_name}, ${material_category}, ${gallons}, ${inventory_unit},
                ${container_type}, ${container_equivalent}, ${finalCost}, ${source},
                ${committed_at}, ${committed_to_estimate}, ${source_estimate_name}, ${source_job_date}, ${notes},
                ${a_side_gallons}, ${b_side_gallons}, ${ratio_percent}, ${batch_id}, ${drum_number}, ${finalIsSurplus})
        RETURNING *
      `;
      return res.json({ entry: rows[0] });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('inventory error:', err);
    res.status(500).json({ error: err.message });
  }
};
