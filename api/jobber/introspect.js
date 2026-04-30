const { neon } = require('@neondatabase/serverless');

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const tokens = await getTokens();
    if (!tokens) {
      return res.status(401).json({ error: 'Not connected to Jobber' });
    }
    
    const typeName = req.query.type || 'PropertyCreateInput';
    
    const introspectionQuery = `
      query IntrospectType($typeName: String!) {
        __type(name: $typeName) {
          name
          kind
          inputFields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch(JOBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.access_token}`,
        'X-JOBBER-GRAPHQL-VERSION': '2025-04-16',
      },
      body: JSON.stringify({ 
        query: introspectionQuery, 
        variables: { typeName } 
      }),
    });
    
    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Introspection error:', err);
    res.status(500).json({ error: err.message });
  }
};
