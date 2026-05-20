const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
}

function migrateLegacyJobberDescriptions(settings) {
  const legacy = settings.jobberDescriptions;
  if (!legacy || typeof legacy !== 'object' || Object.keys(legacy).length === 0) {
    return { settings, changed: false };
  }

  const next = { ...settings };
  const jli = {
    labor: { name: '', description: '' },
    foamTypes: {},
    coatingTypes: {},
    ...(next.jobberLineItems || {}),
  };
  jli.labor = { name: '', description: '', ...(jli.labor || {}) };
  jli.foamTypes = { ...(jli.foamTypes || {}) };
  jli.coatingTypes = { ...(jli.coatingTypes || {}) };

  if (legacy.labor && !((jli.labor.description || '').trim())) {
    jli.labor = { ...jli.labor, description: legacy.labor };
  }

  const pickLegacyForCategory = (cat) => {
    const suffix = `-${cat}`;
    let best = '';
    for (const [k, v] of Object.entries(legacy)) {
      if (k === 'labor') continue;
      if (!k.endsWith(suffix)) continue;
      const text = (v || '').toString().trim();
      if (!text) continue;
      if (!best || text.length > best.length) best = text;
    }
    return best;
  };

  const openText = pickLegacyForCategory('Open');
  const closedText = pickLegacyForCategory('Closed');

  for (const ft of (next.foamTypes || [])) {
    const key = ft.id || ft.productName || ft.name;
    if (!key) continue;
    const existing = jli.foamTypes[key] || { name: '', description: '' };
    if ((existing.description || '').trim()) continue;
    const cat = ft.category;
    const seed = cat === 'Closed' ? closedText : cat === 'Open' ? openText : '';
    if (seed) {
      jli.foamTypes[key] = { name: existing.name || '', description: seed };
    }
  }

  next.jobberLineItems = jli;
  delete next.jobberDescriptions;
  return { settings: next, changed: true };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT settings FROM admin_settings WHERE id = 1`;
      if (result.length === 0) {
        return res.json({ settings: null });
      }
      let stored = result[0].settings;
      const { settings: migrated, changed } = migrateLegacyJobberDescriptions(stored);
      if (changed) {
        const toPersist = { ...migrated };
        if (stored.adminPassword && !toPersist.adminPassword) {
          toPersist.adminPassword = stored.adminPassword;
        }
        try {
          await sql`UPDATE admin_settings SET settings = ${JSON.stringify(toPersist)}, updated_at = NOW() WHERE id = 1`;
        } catch (persistErr) {
          console.error('Persist migrated jobberDescriptions failed:', persistErr.message);
        }
        stored = toPersist;
      }
      const settings = { ...stored };
      delete settings.adminPassword;
      res.json({ settings });
    } catch (err) {
      console.error('Get admin settings error:', err.message);
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { password, settings } = req.body;
      const current = await sql`SELECT settings FROM admin_settings WHERE id = 1`;
      if (current.length === 0) {
        return res.status(404).json({ error: 'No settings found' });
      }
      if (current[0].settings.adminPassword !== password) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      const incoming = { ...settings };
      delete incoming.jobberDescriptions;
      const updatedSettings = { ...incoming, adminPassword: current[0].settings.adminPassword };
      if (settings.newPassword) {
        updatedSettings.adminPassword = settings.newPassword;
        delete updatedSettings.newPassword;
      }
      await sql`UPDATE admin_settings SET settings = ${JSON.stringify(updatedSettings)}, updated_at = NOW() WHERE id = 1`;
      const responseSettings = { ...updatedSettings };
      delete responseSettings.adminPassword;
      res.json({ settings: responseSettings });
    } catch (err) {
      console.error('Update admin settings error:', err.message);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
