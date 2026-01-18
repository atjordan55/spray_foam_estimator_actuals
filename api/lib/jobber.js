const { neon } = require('@neondatabase/serverless');

const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
const JOBBER_API_URL = 'https://api.getjobber.com/api/graphql';

function getDb() {
  return neon(process.env.DATABASE_URL);
}

async function initDatabase() {
  const sql = getDb();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS jobber_tokens (
        id INTEGER PRIMARY KEY DEFAULT 1,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      )
    `;
  } catch (err) {
    console.error('Database init error:', err);
  }
}

async function getTokens() {
  const sql = getDb();
  try {
    await initDatabase();
    const result = await sql`SELECT * FROM jobber_tokens WHERE id = 1`;
    if (result.length > 0) {
      return {
        access_token: result[0].access_token,
        refresh_token: result[0].refresh_token,
        expires_at: parseInt(result[0].expires_at),
      };
    }
    return null;
  } catch (err) {
    console.error('Get tokens error:', err);
    return null;
  }
}

async function saveTokens(tokens) {
  const sql = getDb();
  try {
    await initDatabase();
    await sql`
      INSERT INTO jobber_tokens (id, access_token, refresh_token, expires_at, updated_at)
      VALUES (1, ${tokens.access_token}, ${tokens.refresh_token}, ${tokens.expires_at}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        access_token = ${tokens.access_token},
        refresh_token = ${tokens.refresh_token},
        expires_at = ${tokens.expires_at},
        updated_at = NOW()
    `;
  } catch (err) {
    console.error('Save tokens error:', err);
  }
}

async function deleteTokens() {
  const sql = getDb();
  try {
    await sql`DELETE FROM jobber_tokens WHERE id = 1`;
  } catch (err) {
    console.error('Delete tokens error:', err);
  }
}

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
          client_id: process.env.JOBBER_CLIENT_ID,
          client_secret: process.env.JOBBER_CLIENT_SECRET,
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
      'X-JOBBER-GRAPHQL-VERSION': '2025-04-16',
    },
    body: JSON.stringify({ query, variables }),
  });
  
  const responseText = await response.text();
  
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

async function getClientProperty(clientId) {
  try {
    const propertiesQuery = `
      query GetClientProperties($clientId: EncodedId!) {
        client(id: $clientId) {
          properties {
            id
          }
        }
      }
    `;
    
    const result = await jobberGraphQL(propertiesQuery, { clientId });
    const properties = result.client?.properties;
    if (Array.isArray(properties) && properties.length > 0) {
      return properties[0].id;
    }
    return null;
  } catch (err) {
    console.error('Get client property error:', err.message);
    return null;
  }
}

async function createPropertyForClient(clientId, address) {
  try {
    const createPropertyMutation = `
      mutation CreateProperty($clientId: EncodedId!, $input: PropertyCreateInput!) {
        propertyCreate(clientId: $clientId, input: $input) {
          properties {
            id
          }
          userErrors {
            message
            path
          }
        }
      }
    `;
    
    const result = await jobberGraphQL(createPropertyMutation, {
      clientId,
      input: {
        address: {
          street1: address,
        }
      },
    });
    
    if (result.propertyCreate.userErrors?.length > 0) {
      console.error('Property create error:', result.propertyCreate.userErrors);
      return null;
    }
    
    const properties = result.propertyCreate?.properties;
    if (Array.isArray(properties) && properties.length > 0) {
      return properties[0].id;
    }
    return null;
  } catch (err) {
    console.error('Create property error:', err.message);
    return null;
  }
}

module.exports = { 
  jobberGraphQL, 
  getClientProperty, 
  createPropertyForClient,
  getTokens,
  deleteTokens
};
