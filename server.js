const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  if (req.path.startsWith('/api/')) {
    console.log(`API Request: ${req.method} ${req.path}`);
  }
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID;
const JOBBER_CLIENT_SECRET = process.env.JOBBER_CLIENT_SECRET;
const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
const REDIRECT_URI = `https://${REPLIT_DEV_DOMAIN}/auth/jobber/callback`;
const JOBBER_AUTH_URL = 'https://api.getjobber.com/api/oauth/authorize';
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
const JOBBER_API_URL = 'https://api.getjobber.com/api/graphql';

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobber_tokens (
        id INTEGER PRIMARY KEY DEFAULT 1,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', err);
  }
}

async function getTokens() {
  try {
    const result = await pool.query('SELECT * FROM jobber_tokens WHERE id = 1');
    if (result.rows.length > 0) {
      return {
        access_token: result.rows[0].access_token,
        refresh_token: result.rows[0].refresh_token,
        expires_at: parseInt(result.rows[0].expires_at),
      };
    }
    return null;
  } catch (err) {
    console.error('Get tokens error:', err);
    return null;
  }
}

async function saveTokens(tokens) {
  try {
    await pool.query(`
      INSERT INTO jobber_tokens (id, access_token, refresh_token, expires_at, updated_at)
      VALUES (1, $1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        access_token = $1,
        refresh_token = $2,
        expires_at = $3,
        updated_at = NOW()
    `, [tokens.access_token, tokens.refresh_token, tokens.expires_at]);
  } catch (err) {
    console.error('Save tokens error:', err);
  }
}

async function deleteTokens() {
  try {
    await pool.query('DELETE FROM jobber_tokens WHERE id = 1');
  } catch (err) {
    console.error('Delete tokens error:', err);
  }
}

app.get('/auth/jobber', (req, res) => {
  const scopes = 'read_clients write_clients read_quotes write_quotes';
  const authUrl = `${JOBBER_AUTH_URL}?client_id=${JOBBER_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
  res.redirect(authUrl);
});

app.get('/auth/jobber/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.redirect('/?jobber_error=' + encodeURIComponent(error));
  }
  
  if (!code) {
    return res.redirect('/?jobber_error=no_code');
  }
  
  try {
    const tokenResponse = await fetch(JOBBER_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: JOBBER_CLIENT_ID,
        client_secret: JOBBER_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    });
    
    const tokens = await tokenResponse.json();
    console.log('Token response:', JSON.stringify(tokens, null, 2));
    
    if (tokens.error) {
      console.error('Token error:', tokens);
      return res.redirect('/?jobber_error=' + encodeURIComponent(tokens.error_description || tokens.error));
    }
    
    const expiresIn = tokens.expires_in || 3600;
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (expiresIn * 1000),
    };
    
    await saveTokens(tokenData);
    
    console.log('Jobber connected successfully');
    res.redirect('/?jobber_connected=true');
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.redirect('/?jobber_error=' + encodeURIComponent('Connection failed'));
  }
});

async function refreshTokenIfNeeded() {
  const tokens = await getTokens();
  if (!tokens) return null;
  
  if (Date.now() > tokens.expires_at - 60000) {
    try {
      const tokenResponse = await fetch(JOBBER_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          client_id: JOBBER_CLIENT_ID,
          client_secret: JOBBER_CLIENT_SECRET,
        }),
      });
      
      const newTokens = await tokenResponse.json();
      
      if (newTokens.error) {
        console.error('Token refresh error:', newTokens);
        await deleteTokens();
        return null;
      }
      
      const newExpiresIn = newTokens.expires_in || 3600;
      const tokenData = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: Date.now() + (newExpiresIn * 1000),
      };
      
      await saveTokens(tokenData);
      return tokenData;
    } catch (err) {
      console.error('Token refresh failed:', err.message);
      await deleteTokens();
      return null;
    }
  }
  return tokens;
}

async function jobberGraphQL(query, variables = {}) {
  const tokens = await refreshTokenIfNeeded();
  if (!tokens) {
    throw new Error('Not connected to Jobber');
  }
  
  const response = await fetch(JOBBER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.access_token}`,
      'X-JOBBER-GRAPHQL-VERSION': '2023-11-15',
    },
    body: JSON.stringify({ query, variables }),
  });
  
  const responseText = await response.text();
  console.log('GraphQL response status:', response.status);
  console.log('GraphQL response:', responseText.substring(0, 500));
  
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse GraphQL response:', responseText.substring(0, 200));
    throw new Error('Invalid response from Jobber API');
  }
  
  if (result.errors) {
    console.error('GraphQL errors:', JSON.stringify(result.errors, null, 2));
    throw new Error(result.errors[0]?.message || 'GraphQL error');
  }
  
  return result.data;
}

app.get('/api/jobber/status', async (req, res) => {
  const tokens = await getTokens();
  res.json({
    connected: !!tokens && Date.now() < tokens.expires_at,
  });
});

app.post('/api/jobber/disconnect', async (req, res) => {
  await deleteTokens();
  res.json({ success: true });
});

app.post('/api/jobber/find-or-create-client', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    
    if (email) {
      const searchQuery = `
        query SearchClients($searchTerm: String!) {
          clients(searchTerm: $searchTerm, first: 1) {
            nodes {
              id
              firstName
              lastName
              companyName
            }
          }
        }
      `;
      
      const searchResult = await jobberGraphQL(searchQuery, { searchTerm: email });
      
      if (searchResult.clients.nodes.length > 0) {
        return res.json({ client: searchResult.clients.nodes[0], created: false });
      }
    }
    
    const nameParts = (name || 'Unknown').split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const createMutation = `
      mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client {
            id
            firstName
            lastName
            companyName
          }
          userErrors {
            message
            path
          }
        }
      }
    `;
    
    const input = {
      firstName,
      lastName: lastName || undefined,
    };
    
    if (email) {
      input.emails = [{ description: 'MAIN', primary: true, address: email }];
    }
    
    if (phone) {
      input.phones = [{ description: 'MAIN', primary: true, number: phone }];
    }
    
    const createResult = await jobberGraphQL(createMutation, { input });
    
    if (createResult.clientCreate.userErrors?.length > 0) {
      throw new Error(createResult.clientCreate.userErrors[0].message);
    }
    
    res.json({ client: createResult.clientCreate.client, created: true });
  } catch (err) {
    console.error('Find/create client error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobber/create-quote', async (req, res) => {
  try {
    const { clientId, title, lineItems, notes } = req.body;
    
    const createMutation = `
      mutation CreateQuote($input: QuoteCreateInput!) {
        quoteCreate(input: $input) {
          quote {
            id
            quoteNumber
            total
            jobberWebUri
          }
          userErrors {
            message
            path
          }
        }
      }
    `;
    
    const input = {
      clientId,
      title: title || 'Spray Foam Estimate',
      lineItems: lineItems.map(item => ({
        name: item.name,
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
      })),
    };
    
    if (notes) {
      input.internalNotes = notes;
    }
    
    const result = await jobberGraphQL(createMutation, { input });
    
    if (result.quoteCreate.userErrors?.length > 0) {
      throw new Error(result.quoteCreate.userErrors[0].message);
    }
    
    res.json({ quote: result.quoteCreate.quote });
  } catch (err) {
    console.error('Create quote error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 5000;

initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Redirect URI: ${REDIRECT_URI}`);
    console.log('Important: Add this redirect URI to your Jobber Developer App settings');
  });
});
