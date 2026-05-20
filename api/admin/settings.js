const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
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
      const settings = { ...result[0].settings };
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
      const updatedSettings = { ...settings, adminPassword: current[0].settings.adminPassword };
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
