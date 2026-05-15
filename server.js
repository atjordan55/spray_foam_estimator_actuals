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
const REPLIT_DOMAIN = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
const REDIRECT_URI = `https://${REPLIT_DOMAIN}/auth/jobber/callback`;
const JOBBER_AUTH_URL = 'https://api.getjobber.com/api/oauth/authorize';
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
const JOBBER_API_URL = 'https://api.getjobber.com/api/graphql';

const DEFAULT_FOAM_TYPES = [
  {
    id: 'open-cell',
    name: 'Open Cell', productName: 'Open Cell',
    productCategory: 'foam',
    active: true,
    category: 'Open',
    containerType: '110-gallon set',
    grossGallonsPerSet: 110,
    usableGallonsPerSet: 100,
    thicknessType: 'inch',
    foamThickness: 6, defaultThicknessInches: 6,
    foamCostPerSet: 1870, cost: 1870,
    materialCostPct: 20,
    boardFeetPerSet: 14000,
    materialMarkup: 76.77, materialMarkupPercent: 76.77,
    wasteFactorPercent: 0,
    defaultPricePerSqFt: 1.70,
    notes: '',
  },
  {
    id: 'closed-cell',
    name: 'Closed Cell', productName: 'Closed Cell',
    productCategory: 'foam',
    active: true,
    category: 'Closed',
    containerType: '110-gallon set',
    grossGallonsPerSet: 110,
    usableGallonsPerSet: 100,
    thicknessType: 'inch',
    foamThickness: 2, defaultThicknessInches: 2,
    foamCostPerSet: 2300, cost: 2300,
    materialCostPct: 20,
    boardFeetPerSet: 4000,
    materialMarkup: 66.67, materialMarkupPercent: 66.67,
    wasteFactorPercent: 0,
    defaultPricePerSqFt: 2.30,
    notes: '',
  }
];

const DEFAULT_JOBBER_DESCRIPTIONS = {
  'General Area-Open': 'Spray foam insulation applied to general area surfaces. Provides air sealing, thermal resistance, and sound deadening.',
  'General Area-Closed': 'Closed cell spray foam insulation applied to general area surfaces. Provides thermal barrier, moisture seal, and structural enhancement.',
  'Exterior Walls-Open': 'Open cell spray foam insulation applied to exterior wall cavities. Provides air seal, sound deadening, and thermal resistance.',
  'Exterior Walls-Closed': 'Closed cell spray foam insulation applied to exterior wall cavities. Provides thermal barrier, moisture seal, and structural enhancement.',
  'Roof Deck-Open': 'Open cell spray foam insulation applied to roof deck. Provides air seal, sound deadening, and thermal resistance.',
  'Roof Deck-Closed': 'Closed cell spray foam insulation applied to roof deck. Provides air seal, moisture barrier, and thermal resistance.',
  'Gable-Open': 'Open cell spray foam insulation applied to gable area. Provides air seal and thermal resistance.',
  'Gable-Closed': 'Closed cell spray foam insulation applied to gable area. Provides thermal barrier and moisture seal.',
  'labor': 'Includes a full-service spray foam insulation package: on-site evaluation, masking and surface prep, application at the specified thickness, and post-job cleanup. Designed to deliver maximum R-value, air sealing, and moisture control for residential or commercial projects.',
};

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        settings JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT admin_single_row CHECK (id = 1)
      )
    `);

    const existing = await pool.query('SELECT settings FROM admin_settings WHERE id = 1');
    if (existing.rows.length === 0) {
      const defaultSettings = {
        companyName: 'Eco Innovations',
        adminPassword: 'admin123',
        foamTypes: DEFAULT_FOAM_TYPES,
        coatingTypes: [],
        generator: { burnRate: 0.86, warmupHours: 1.0, cleanupHours: 0.5, truckMpg: 12, runtimeMultiplierDefault: 1.15 },
        fuelMarkupPercent: 30,
        wasteDisposalMarkupPercent: 30,
        equipmentRentalMarkupPercent: 30,
        jobberDescriptions: DEFAULT_JOBBER_DESCRIPTIONS,
        labor: { laborRate: 65, laborMarkup: 40 },
        project: { travelDistance: 50, travelRate: 0.70, wasteDisposal: 50, equipmentRental: 0 },
        commission: { tier1Threshold: 30, tier1Rate: 10, tier2Threshold: 35, tier2Rate: 12 },
      };
      await pool.query('INSERT INTO admin_settings (id, settings) VALUES (1, $1)', [JSON.stringify(defaultSettings)]);
    } else {
      // Migrate existing settings to add new fields
      const s = existing.rows[0].settings;
      let changed = false;
      if (!s.foamTypes) {
        s.foamTypes = DEFAULT_FOAM_TYPES.map(ft => ({ ...ft }));
        changed = true;
      } else {
        // Migrate each foam type to add new flexible profile fields with backward compat
        s.foamTypes = s.foamTypes.map(ft => {
          const updated = { ...ft };
          let modified = false;
          if (updated.productName === undefined) { updated.productName = updated.name || ''; modified = true; }
          if (updated.name === undefined) { updated.name = updated.productName || ''; modified = true; }
          if (updated.productCategory === undefined) { updated.productCategory = 'foam'; modified = true; }
          if (updated.active === undefined) { updated.active = true; modified = true; }
          if (updated.cost === undefined) { updated.cost = updated.foamCostPerSet ?? 0; modified = true; }
          if (updated.foamCostPerSet === undefined) { updated.foamCostPerSet = updated.cost ?? 0; modified = true; }
          if (updated.materialMarkupPercent === undefined) { updated.materialMarkupPercent = updated.materialMarkup ?? 0; modified = true; }
          if (updated.materialMarkup === undefined) { updated.materialMarkup = updated.materialMarkupPercent ?? 0; modified = true; }
          if (updated.wasteFactorPercent === undefined) { updated.wasteFactorPercent = 0; modified = true; }
          if (updated.notes === undefined) { updated.notes = ''; modified = true; }
          if (updated.containerType === undefined) { updated.containerType = '110-gallon set'; modified = true; }
          if (updated.grossGallonsPerSet === undefined) { updated.grossGallonsPerSet = 110; modified = true; }
          if (updated.usableGallonsPerSet === undefined) { updated.usableGallonsPerSet = 100; modified = true; }
          if (updated.thicknessType === undefined) { updated.thicknessType = 'inch'; modified = true; }
          if (updated.defaultThicknessInches === undefined) { updated.defaultThicknessInches = updated.foamThickness ?? 0; modified = true; }
          if (updated.foamThickness === undefined) { updated.foamThickness = updated.defaultThicknessInches ?? 0; modified = true; }
          if (modified) changed = true;
          return updated;
        });
      }
      if (!s.coatingTypes) { s.coatingTypes = []; changed = true; }
      else {
        // Migrate each coating type to add new flexible profile fields
        s.coatingTypes = s.coatingTypes.map(ct => {
          const updated = { ...ct };
          let modified = false;
          if (updated.productName === undefined) { updated.productName = updated.name || ''; modified = true; }
          if (updated.name === undefined) { updated.name = updated.productName || ''; modified = true; }
          if (updated.productCategory === undefined) { updated.productCategory = 'coating'; modified = true; }
          if (updated.active === undefined) { updated.active = true; modified = true; }
          if (updated.cost === undefined) { updated.cost = updated.foamCostPerContainer ?? 0; modified = true; }
          if (updated.foamCostPerContainer === undefined) { updated.foamCostPerContainer = updated.cost ?? 0; modified = true; }
          if (updated.materialMarkupPercent === undefined) { updated.materialMarkupPercent = updated.materialMarkup ?? 0; modified = true; }
          if (updated.materialMarkup === undefined) { updated.materialMarkup = updated.materialMarkupPercent ?? 0; modified = true; }
          if (updated.wasteFactorPercent === undefined) { updated.wasteFactorPercent = 0; modified = true; }
          if (updated.notes === undefined) { updated.notes = ''; modified = true; }
          if (updated.containerType === undefined) { updated.containerType = '5 gallon bucket'; modified = true; }
          if (updated.containerGallons === undefined) { updated.containerGallons = 5; modified = true; }
          if (updated.usableGallonsPerSet === undefined) { updated.usableGallonsPerSet = updated.containerGallons ?? 5; modified = true; }
          if (updated.calculationMethod === undefined) { updated.calculationMethod = 'manualOverride'; modified = true; }
          if (updated.thicknessType === undefined) { updated.thicknessType = 'none'; modified = true; }
          if (updated.defaultThickness === undefined) { updated.defaultThickness = 0; modified = true; }
          if (updated.sqFtPerGallon === undefined) { updated.sqFtPerGallon = 0; modified = true; }
          if (updated.solidsByVolumePercent === undefined) { updated.solidsByVolumePercent = 0; modified = true; }
          if (updated.maxSinglePassWetMils === undefined) { updated.maxSinglePassWetMils = 0; modified = true; }
          if (updated.defaultPricePerSqFt === undefined) { updated.defaultPricePerSqFt = 0; modified = true; }
          if (modified) changed = true;
          return updated;
        });
      }
      if (!s.generator) { s.generator = { burnRate: 0.86, warmupHours: 1.0, cleanupHours: 0.5, truckMpg: 12, runtimeMultiplierDefault: 1.15 }; changed = true; }
      // Split combined additionalJobCostMarkupPct into 3 separate markup fields
      const legacyMarkup = s.additionalJobCostMarkupPct ?? 30;
      if (s.fuelMarkupPercent === undefined) { s.fuelMarkupPercent = legacyMarkup; changed = true; }
      if (s.wasteDisposalMarkupPercent === undefined) { s.wasteDisposalMarkupPercent = legacyMarkup; changed = true; }
      if (s.equipmentRentalMarkupPercent === undefined) { s.equipmentRentalMarkupPercent = legacyMarkup; changed = true; }
      if (!s.jobberDescriptions) { s.jobberDescriptions = DEFAULT_JOBBER_DESCRIPTIONS; changed = true; }
      if (changed) {
        await pool.query('UPDATE admin_settings SET settings = $1, updated_at = NOW() WHERE id = 1', [JSON.stringify(s)]);
      }
    }

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
      'X-JOBBER-GRAPHQL-VERSION': '2025-04-16',
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
    
    const searchQuery = `
      query SearchClients($searchTerm: String!) {
        clients(searchTerm: $searchTerm, first: 5) {
          nodes {
            id
            firstName
            lastName
            companyName
          }
        }
      }
    `;
    
    const searchTerms = [email, phone, name].filter(Boolean);
    
    for (const term of searchTerms) {
      if (!term) continue;
      
      try {
        const searchResult = await jobberGraphQL(searchQuery, { searchTerm: term });
        
        if (searchResult.clients.nodes.length > 0) {
          const client = searchResult.clients.nodes[0];
          let propertyId = await getClientProperty(client.id);
          
          if (!propertyId && address) {
            propertyId = await createPropertyForClient(client.id, address);
          }
          
          return res.json({ 
            client, 
            propertyId,
            created: false 
          });
        }
      } catch (searchErr) {
        console.log(`Search by "${term}" failed:`, searchErr.message);
      }
    }
    
    const nameParts = (name || 'Unknown Customer').split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';
    
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
      lastName,
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
    
    const client = createResult.clientCreate.client;
    let propertyId = null;
    
    if (address) {
      propertyId = await createPropertyForClient(client.id, address);
    }
    
    res.json({ 
      client, 
      propertyId,
      created: true 
    });
  } catch (err) {
    console.error('Find/create client error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/api/jobber/introspect-quote', async (req, res) => {
  try {
    const introspectionQuery = `
      query IntrospectQuoteCreateAttributes {
        __type(name: "QuoteCreateAttributes") {
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
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await jobberGraphQL(introspectionQuery);
    res.json({ QuoteCreateAttributes: result.__type });
  } catch (err) {
    console.error('Introspection error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobber/create-quote', async (req, res) => {
  try {
    const { clientId, propertyId, title, lineItems, notes, discount, deposit } = req.body;
    
    if (!propertyId) {
      throw new Error('Property ID is required to create a quote');
    }
    
    const formattedLineItems = lineItems.map(item => ({
      name: item.name,
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPrice: parseFloat(item.unitPrice.toFixed(2)),
      saveToProductsAndServices: false,
    }));
    
    const createMutation = `
      mutation CreateQuote($clientId: EncodedId!, $propertyId: EncodedId!, $title: String, $lineItems: [QuoteCreateLineItemAttributes!]!, $discount: CostModifierAttributes, $deposit: CostModifierAttributes) {
        quoteCreate(attributes: {
          clientId: $clientId
          propertyId: $propertyId
          title: $title
          lineItems: $lineItems
          discount: $discount
          deposit: $deposit
        }) {
          quote {
            id
            quoteNumber
            jobberWebUri
          }
          userErrors {
            message
            path
          }
        }
      }
    `;
    
    const variables = {
      clientId,
      propertyId,
      title: title || 'Spray Foam Estimate',
      lineItems: formattedLineItems,
    };
    
    if (discount && discount.rate > 0) {
      variables.discount = {
        rate: discount.rate,
        type: discount.type,
      };
    }
    
    if (deposit && deposit.rate > 0) {
      variables.deposit = {
        rate: deposit.rate,
        type: deposit.type,
      };
    }
    
    console.log('Creating quote with variables:', JSON.stringify(variables, null, 2));
    
    const result = await jobberGraphQL(createMutation, variables);
    
    if (result.quoteCreate.userErrors?.length > 0) {
      throw new Error(result.quoteCreate.userErrors[0].message);
    }
    
    res.json({ quote: result.quoteCreate.quote });
  } catch (err) {
    console.error('Create quote error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT settings FROM admin_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ settings: null });
    }
    const settings = { ...result.rows[0].settings };
    delete settings.adminPassword;
    res.json({ settings });
  } catch (err) {
    console.error('Get admin settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    const result = await pool.query('SELECT settings FROM admin_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'No settings configured' });
    }
    const settings = result.rows[0].settings;
    if (settings.adminPassword === password) {
      res.json({ verified: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (err) {
    console.error('Verify password error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/settings', async (req, res) => {
  try {
    const { password, settings } = req.body;
    const current = await pool.query('SELECT settings FROM admin_settings WHERE id = 1');
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'No settings found' });
    }
    if (current.rows[0].settings.adminPassword !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const updatedSettings = { ...settings, adminPassword: current.rows[0].settings.adminPassword };
    if (settings.newPassword) {
      updatedSettings.adminPassword = settings.newPassword;
      delete updatedSettings.newPassword;
    }
    await pool.query(
      'UPDATE admin_settings SET settings = $1, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(updatedSettings)]
    );
    const responseSettings = { ...updatedSettings };
    delete responseSettings.adminPassword;
    res.json({ settings: responseSettings });
  } catch (err) {
    console.error('Update admin settings error:', err.message);
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
