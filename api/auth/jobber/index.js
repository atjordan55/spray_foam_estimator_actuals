const JOBBER_AUTH_URL = 'https://api.getjobber.com/api/oauth/authorize';

module.exports = async function handler(req, res) {
  try {
    const clientId = process.env.JOBBER_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({ error: 'JOBBER_CLIENT_ID environment variable not set' });
    }
    
    const redirectUri = 'https://spray-form-estimator.vercel.app/api/auth/jobber/callback';
    const scopes = 'read_clients write_clients read_quotes write_quotes';
    
    const authUrl = `${JOBBER_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
    
    res.redirect(307, authUrl);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};
