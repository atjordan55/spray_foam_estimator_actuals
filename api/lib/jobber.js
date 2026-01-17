const { getTokens, saveTokens, deleteTokens } = require('./database');

const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
const JOBBER_API_URL = 'https://api.getjobber.com/api/graphql';

function getRedirectUri() {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/api/auth/jobber/callback`;
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
  getRedirectUri, 
  refreshTokenIfNeeded, 
  jobberGraphQL, 
  getClientProperty, 
  createPropertyForClient,
  JOBBER_TOKEN_URL 
};
