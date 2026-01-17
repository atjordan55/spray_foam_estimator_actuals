const { saveTokens } = require('../../lib/database');
const { getRedirectUri, JOBBER_TOKEN_URL } = require('../../lib/jobber');

module.exports = async function handler(req, res) {
  const { code, error } = req.query;
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.BASE_URL || 'http://localhost:5000';
  
  if (error) {
    return res.redirect(307, `${baseUrl}/?jobber_error=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    return res.redirect(307, `${baseUrl}/?jobber_error=no_code`);
  }
  
  try {
    const redirectUri = getRedirectUri();
    
    const tokenResponse = await fetch(JOBBER_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.JOBBER_CLIENT_ID,
        client_secret: process.env.JOBBER_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('Token error:', tokens);
      return res.redirect(307, `${baseUrl}/?jobber_error=${encodeURIComponent(tokens.error_description || tokens.error)}`);
    }
    
    const expiresIn = tokens.expires_in || 3600;
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (expiresIn * 1000),
    };
    
    await saveTokens(tokenData);
    
    res.redirect(307, `${baseUrl}/?jobber_connected=true`);
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.redirect(307, `${baseUrl}/?jobber_error=${encodeURIComponent('Connection failed')}`);
  }
};
