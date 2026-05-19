const { sql, setHeaders } = require('../lib/db');

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rows = await sql`
      SELECT
        material_type_id,
        MAX(material_type_name) AS material_type_name,
        MAX(material_category) AS material_category,
        SUM(gallons) AS total_gallons,
        SUM(CASE WHEN is_surplus THEN gallons ELSE 0 END) AS surplus_gallons,
        SUM(CASE WHEN is_surplus THEN 0 ELSE gallons END) AS non_surplus_gallons,
        SUM(a_side_gallons) AS total_a_side,
        SUM(b_side_gallons) AS total_b_side,
        AVG(CASE WHEN gallons > 0 AND NOT is_surplus THEN cost_per_gallon END) AS avg_cost_per_gallon,
        (SELECT inventory_unit FROM material_inventory mi2
          WHERE mi2.material_type_id = mi.material_type_id
          GROUP BY inventory_unit ORDER BY COUNT(*) DESC LIMIT 1) AS inventory_unit,
        (SELECT container_type FROM material_inventory mi3
          WHERE mi3.material_type_id = mi.material_type_id AND container_type IS NOT NULL
          GROUP BY container_type ORDER BY COUNT(*) DESC LIMIT 1) AS container_type
      FROM material_inventory mi
      GROUP BY material_type_id
      HAVING SUM(gallons) > 0
      ORDER BY MAX(material_type_name)
    `;

    let reservedMap = {};
    try {
      const resv = await sql`
        SELECT material_type_id,
               SUM(gallons_non_surplus) AS reserved_non_surplus,
               SUM(gallons_surplus) AS reserved_surplus
        FROM inventory_reservations
        WHERE status IN ('reserved','committed')
        GROUP BY material_type_id
      `;
      for (const r of resv) {
        reservedMap[r.material_type_id] = {
          reserved_non_surplus: parseFloat(r.reserved_non_surplus) || 0,
          reserved_surplus: parseFloat(r.reserved_surplus) || 0,
        };
      }
    } catch (_) { /* reservations table absent — treat as zero */ }

    const summary = rows.map(r => {
      const total_a_side = r.total_a_side != null ? parseFloat(r.total_a_side) : null;
      const total_b_side = r.total_b_side != null ? parseFloat(r.total_b_side) : null;
      let is_balanced = false;
      if (total_a_side != null && total_b_side != null && total_a_side > 0 && total_b_side > 0) {
        const combined = total_a_side + total_b_side;
        const diff = Math.abs(total_a_side - total_b_side);
        is_balanced = combined > 0 && (diff / combined) <= 0.05;
      }
      const total_gallons = parseFloat(r.total_gallons) || 0;
      const surplus_gallons = parseFloat(r.surplus_gallons) || 0;
      const non_surplus_gallons = parseFloat(r.non_surplus_gallons) || 0;
      const reserved = reservedMap[r.material_type_id] || { reserved_non_surplus: 0, reserved_surplus: 0 };
      return {
        material_type_id: r.material_type_id,
        material_type_name: r.material_type_name,
        material_category: r.material_category,
        available_gallons: Math.max(0, surplus_gallons - reserved.reserved_surplus),
        total_gallons,
        surplus_gallons,
        non_surplus_gallons,
        reserved_surplus: reserved.reserved_surplus,
        reserved_non_surplus: reserved.reserved_non_surplus,
        available_surplus: Math.max(0, surplus_gallons - reserved.reserved_surplus),
        available_non_surplus: Math.max(0, non_surplus_gallons - reserved.reserved_non_surplus),
        avg_cost_per_gallon: r.avg_cost_per_gallon != null ? parseFloat(r.avg_cost_per_gallon) : 0,
        inventory_unit: r.inventory_unit || 'gallons',
        container_type: r.container_type || null,
        total_a_side,
        total_b_side,
        is_balanced,
      };
    });
    res.json({ summary });
  } catch (err) {
    console.error('inventory summary error:', err);
    res.status(500).json({ error: err.message });
  }
};
