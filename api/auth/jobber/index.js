const { getRedirectUri } = require('../../lib/jobber');

const JOBBER_AUTH_URL = 'https://api.getjobber.com/api/oauth/authorize';

module.exports = async function handler(req, res) {
  const redirectUri = getRedirectUri();
  const scopes = 'read_clients write_clients read_quotes write_quotes';
  
  const authUrl = `${JOBBER_AUTH_URL}?client_id=${process.env.JOBBER_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
  
  res.redirect(307, authUrl);
};
