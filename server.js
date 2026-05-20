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

const INVENTORY_SOURCE_LABELS = {
  manual_addition: 'Manual Addition',
  initial_seed: 'Initial Seed',
  purchase_delivery: 'Purchase / Delivery',
  job_surplus: 'Job Surplus',
  inventory_commitment: 'Inventory Committed',
  commitment_reversal: 'Commitment Reversed',
  adjustment: 'Adjustment',
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_inventory (
        id SERIAL PRIMARY KEY,
        material_type_id TEXT NOT NULL,
        material_type_name TEXT NOT NULL,
        material_category TEXT NOT NULL DEFAULT 'foam',
        gallons NUMERIC(10,2) NOT NULL,
        inventory_unit TEXT NOT NULL DEFAULT 'gallons',
        container_type TEXT,
        container_equivalent NUMERIC(10,4),
        cost_per_gallon NUMERIC(10,2) NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'manual_addition'
          CHECK (source IN (
            'manual_addition',
            'initial_seed',
            'purchase_delivery',
            'job_surplus',
            'surplus_material',
            'inventory_commitment',
            'commitment_reversal',
            'reservation_reconciliation',
            'adjustment'
          )),
        committed_at TIMESTAMP,
        committed_to_estimate TEXT,
        source_estimate_name TEXT,
        source_job_date TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE material_inventory
        ADD COLUMN IF NOT EXISTS a_side_gallons NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS b_side_gallons NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS ratio_percent NUMERIC(5,2),
        ADD COLUMN IF NOT EXISTS batch_id TEXT,
        ADD COLUMN IF NOT EXISTS drum_number TEXT,
        ADD COLUMN IF NOT EXISTS is_surplus BOOLEAN NOT NULL DEFAULT false
    `);

    // Update the source CHECK constraint to include 'surplus_material' if missing.
    // Postgres can't ALTER a CHECK in place; drop & re-add.
    try {
      const conRes = await pool.query(`
        SELECT con.conname, pg_get_constraintdef(con.oid) AS def
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'material_inventory' AND con.contype = 'c'
      `);
      for (const row of conRes.rows) {
        if (row.def && row.def.includes('source') &&
            (!row.def.includes('surplus_material') || !row.def.includes('reservation_reconciliation'))) {
          await pool.query(`ALTER TABLE material_inventory DROP CONSTRAINT ${row.conname}`);
        }
      }
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'material_inventory'::regclass
              AND pg_get_constraintdef(oid) LIKE '%reservation_reconciliation%'
          ) THEN
            ALTER TABLE material_inventory
              ADD CONSTRAINT material_inventory_source_check CHECK (source IN (
                'manual_addition','initial_seed','purchase_delivery','job_surplus',
                'surplus_material','inventory_commitment','commitment_reversal',
                'reservation_reconciliation','adjustment'
              ));
          END IF;
        END $$;
      `);
    } catch (err) {
      console.error('Source check constraint update error:', err.message);
    }

    // Backfill: any existing rows that came in as job surplus should be flagged is_surplus.
    await pool.query(`
      UPDATE material_inventory
      SET is_surplus = true
      WHERE source IN ('job_surplus','surplus_material') AND is_surplus = false
    `);

    // Skeleton tables for Phase B (reservations) and Phase C (signed estimates).
    // Created here so later phases don't need separate migrations.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id TEXT PRIMARY KEY,
        estimate_name TEXT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        signed_at TIMESTAMP,
        signed_snapshot JSONB,
        reconciled_at TIMESTAMP,
        reconciled_snapshot JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_reservations (
        id SERIAL PRIMARY KEY,
        estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
        material_type_id TEXT NOT NULL,
        material_type_name TEXT,
        material_category TEXT,
        gallons_surplus NUMERIC(10,2) NOT NULL DEFAULT 0,
        gallons_non_surplus NUMERIC(10,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'reserved'
          CHECK (status IN ('reserved','committed','released','reconciled')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservations_estimate ON inventory_reservations(estimate_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservations_material ON inventory_reservations(material_type_id, status)`);
    // Phase B: record the actual gallons consumed when a reservation is reconciled.
    await pool.query(`ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS actual_gallons_used NUMERIC(10,2)`);

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

app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM material_inventory ORDER BY created_at DESC');
    res.json({ entries: result.rows });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        material_type_id,
        MAX(material_type_name) AS material_type_name,
        MAX(material_category) AS material_category,
        SUM(gallons) AS total_gallons,
        SUM(CASE WHEN is_surplus THEN gallons ELSE 0 END) AS surplus_gallons,
        SUM(CASE WHEN is_surplus THEN 0 ELSE gallons END) AS non_surplus_gallons,
        SUM(a_side_gallons) AS total_a_side,
        SUM(b_side_gallons) AS total_b_side,
        AVG(CASE WHEN gallons > 0 AND NOT is_surplus THEN cost_per_gallon END) AS avg_cost_per_gallon,
        (SELECT inventory_unit FROM material_inventory mi2
          WHERE mi2.material_type_id = mi.material_type_id
          GROUP BY inventory_unit ORDER BY COUNT(*) DESC LIMIT 1) AS inventory_unit,
        (SELECT container_type FROM material_inventory mi3
          WHERE mi3.material_type_id = mi.material_type_id AND container_type IS NOT NULL
          GROUP BY container_type ORDER BY COUNT(*) DESC LIMIT 1) AS container_type
      FROM material_inventory mi
      GROUP BY material_type_id
      HAVING SUM(gallons) > 0
      ORDER BY MAX(material_type_name)
    `);

    // Pull reserved gallons per material (for Phase B; safe in Phase A — returns 0).
    let reservedMap = {};
    try {
      const resvRes = await pool.query(`
        SELECT material_type_id,
               SUM(gallons_non_surplus) AS reserved_non_surplus,
               SUM(gallons_surplus) AS reserved_surplus
        FROM inventory_reservations
        WHERE status IN ('reserved','committed')
        GROUP BY material_type_id
      `);
      for (const r of resvRes.rows) {
        reservedMap[r.material_type_id] = {
          reserved_non_surplus: parseFloat(r.reserved_non_surplus) || 0,
          reserved_surplus: parseFloat(r.reserved_surplus) || 0,
        };
      }
    } catch (e) {
      // Table may not exist yet on very fresh deploys — treat as no reservations.
    }

    const summary = result.rows.map(r => {
      const total_a_side = r.total_a_side != null ? parseFloat(r.total_a_side) : null;
      const total_b_side = r.total_b_side != null ? parseFloat(r.total_b_side) : null;
      let is_balanced = false;
      if (total_a_side != null && total_b_side != null && total_a_side > 0 && total_b_side > 0) {
        const combined = total_a_side + total_b_side;
        const diff = Math.abs(total_a_side - total_b_side);
        is_balanced = combined > 0 && (diff / combined) <= 0.05;
      }
      const total_gallons = parseFloat(r.total_gallons) || 0;
      const surplus_gallons = parseFloat(r.surplus_gallons) || 0;
      const non_surplus_gallons = parseFloat(r.non_surplus_gallons) || 0;
      const reserved = reservedMap[r.material_type_id] || { reserved_non_surplus: 0, reserved_surplus: 0 };
      return {
        material_type_id: r.material_type_id,
        material_type_name: r.material_type_name,
        material_category: r.material_category,
        // available_gallons kept for backwards compat with existing UI;
        // restricted to surplus only per rule "paid stock is never credited at $0".
        available_gallons: Math.max(0, surplus_gallons - reserved.reserved_surplus),
        total_gallons,
        surplus_gallons,
        non_surplus_gallons,
        reserved_surplus: reserved.reserved_surplus,
        reserved_non_surplus: reserved.reserved_non_surplus,
        available_surplus: Math.max(0, surplus_gallons - reserved.reserved_surplus),
        available_non_surplus: Math.max(0, non_surplus_gallons - reserved.reserved_non_surplus),
        avg_cost_per_gallon: r.avg_cost_per_gallon != null ? parseFloat(r.avg_cost_per_gallon) : 0,
        inventory_unit: r.inventory_unit || 'gallons',
        container_type: r.container_type || null,
        total_a_side,
        total_b_side,
        is_balanced,
      };
    });
    res.json({ summary });
  } catch (err) {
    console.error('Get inventory summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const {
      material_type_id, material_type_name,
      material_category = 'foam',
      gallons,
      inventory_unit = 'gallons',
      container_type = null,
      container_equivalent = null,
      cost_per_gallon = 0,
      source = 'manual_addition',
      committed_at = null,
      committed_to_estimate = null,
      source_estimate_name = null,
      source_job_date = null,
      notes = null,
      a_side_gallons = null,
      b_side_gallons = null,
      ratio_percent = null,
      batch_id = null,
      drum_number = null,
      is_surplus = false,
    } = req.body || {};
    if (!material_type_id || !material_type_name || gallons === undefined || gallons === null || gallons === '') {
      return res.status(400).json({ error: 'material_type_id, material_type_name, and gallons are required' });
    }
    // Surplus sources are always flagged is_surplus and have $0 cost basis
    // (cost was already recovered from the prior job that generated the surplus).
    let finalIsSurplus = !!is_surplus;
    let finalCost = cost_per_gallon;
    if (source === 'surplus_material' || source === 'job_surplus') {
      finalIsSurplus = true;
      finalCost = 0;
    }
    const result = await pool.query(`
      INSERT INTO material_inventory
        (material_type_id, material_type_name, material_category, gallons, inventory_unit,
         container_type, container_equivalent, cost_per_gallon, source,
         committed_at, committed_to_estimate, source_estimate_name, source_job_date, notes,
         a_side_gallons, b_side_gallons, ratio_percent, batch_id, drum_number, is_surplus)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [
      material_type_id, material_type_name, material_category, gallons, inventory_unit,
      container_type, container_equivalent, finalCost, source,
      committed_at, committed_to_estimate, source_estimate_name, source_job_date, notes,
      a_side_gallons, b_side_gallons, ratio_percent, batch_id, drum_number, finalIsSurplus
    ]);
    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Insert inventory error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM material_inventory WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete inventory error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Phase B — Estimates + Reservations
// ============================================================

// Upsert an estimate row (called when the user saves an estimate locally).
app.post('/api/estimates', async (req, res) => {
  try {
    const { id, estimate_name = null, customer_name = null, customer_email = null, customer_phone = null } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    const result = await pool.query(`
      INSERT INTO estimates (id, estimate_name, customer_name, customer_email, customer_phone, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE
        SET estimate_name = EXCLUDED.estimate_name,
            customer_name = EXCLUDED.customer_name,
            customer_email = EXCLUDED.customer_email,
            customer_phone = EXCLUDED.customer_phone,
            updated_at = NOW()
      RETURNING *
    `, [id, estimate_name, customer_name, customer_email, customer_phone]);
    res.json({ estimate: result.rows[0] });
  } catch (err) {
    console.error('Upsert estimate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch a single estimate row (used by the frontend to rehydrate signed status on load).
app.get('/api/estimates/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM estimates WHERE id = $1`, [req.params.id]);
    res.json({ estimate: result.rows[0] || null });
  } catch (err) {
    console.error('Get estimate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark an estimate as signed. Stamps signed_at and atomically flips all
// 'reserved' rows for this estimate to 'committed' (the inventory lock-in).
app.post('/api/estimates/:id/sign', async (req, res) => {
  const client = await pool.connect();
  try {
    const estimateId = req.params.id;
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO estimates (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [estimateId]
    );
    const est = await client.query(
      `UPDATE estimates SET signed_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [estimateId]
    );
    await client.query(
      `UPDATE inventory_reservations
       SET status = 'committed', updated_at = NOW()
       WHERE estimate_id = $1 AND status = 'reserved'`,
      [estimateId]
    );
    await client.query('COMMIT');
    res.json({ estimate: est.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sign estimate error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Reverse "Mark as Signed": clears signed_at and releases reservations so the
// estimate can be edited freely again.
app.post('/api/estimates/:id/unsign', async (req, res) => {
  const client = await pool.connect();
  try {
    const estimateId = req.params.id;
    await client.query('BEGIN');
    const est = await client.query(
      `UPDATE estimates SET signed_at = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [estimateId]
    );
    await client.query(
      `UPDATE inventory_reservations
       SET status = 'released', updated_at = NOW()
       WHERE estimate_id = $1 AND status IN ('reserved','committed')`,
      [estimateId]
    );
    await client.query('COMMIT');
    res.json({ estimate: est.rows[0] || null });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Unsign estimate error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// List current reservations for one estimate.
app.get('/api/estimates/:id/reservations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM inventory_reservations WHERE estimate_id = $1 ORDER BY material_type_name`,
      [req.params.id]
    );
    res.json({ reservations: result.rows });
  } catch (err) {
    console.error('Get reservations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Replace this estimate's `reserved` rows with a fresh set built from the credit map.
// Already-committed/reconciled rows for this estimate are left untouched.
app.post('/api/estimates/:id/reservations', async (req, res) => {
  const client = await pool.connect();
  try {
    const estimateId = req.params.id;
    const { credits = {} } = req.body || {};
    await client.query('BEGIN');
    // Confirm estimate exists; create a stub row if missing so the FK is satisfied.
    await client.query(
      `INSERT INTO estimates (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [estimateId]
    );
    // Clear prior 'reserved' rows; preserve committed/reconciled/released.
    await client.query(
      `DELETE FROM inventory_reservations WHERE estimate_id = $1 AND status = 'reserved'`,
      [estimateId]
    );
    // Materials that already have a committed/reconciled row for this estimate must NOT get
    // a duplicate 'reserved' row — that would double-count the same gallons.
    const lockedRes = await client.query(
      `SELECT material_type_id FROM inventory_reservations
       WHERE estimate_id = $1 AND status IN ('committed','reconciled')`,
      [estimateId]
    );
    const lockedMaterials = new Set(lockedRes.rows.map(r => r.material_type_id));
    const inserted = [];
    for (const [materialTypeId, gallonsRaw] of Object.entries(credits)) {
      const gallons = parseFloat(gallonsRaw) || 0;
      if (gallons <= 0) continue;
      if (lockedMaterials.has(materialTypeId)) continue;
      // Pull name + category from the most recent inventory row for this material.
      const lookup = await client.query(
        `SELECT material_type_name, material_category
         FROM material_inventory
         WHERE material_type_id = $1
         ORDER BY id DESC LIMIT 1`,
        [materialTypeId]
      );
      const name = lookup.rows[0]?.material_type_name || materialTypeId;
      const category = lookup.rows[0]?.material_category || 'foam';
      // Reservations always draw from surplus first (matches credit math).
      const row = await client.query(
        `INSERT INTO inventory_reservations
           (estimate_id, material_type_id, material_type_name, material_category,
            gallons_surplus, gallons_non_surplus, status, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, 'reserved', NOW())
         RETURNING *`,
        [estimateId, materialTypeId, name, category, gallons]
      );
      inserted.push(row.rows[0]);
    }
    await client.query('COMMIT');
    res.json({ reservations: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sync reservations error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// reserved → committed for this estimate's still-reserved rows.
app.post('/api/estimates/:id/reservations/commit', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE inventory_reservations
       SET status = 'committed', updated_at = NOW()
       WHERE estimate_id = $1 AND status = 'reserved'
       RETURNING *`,
      [req.params.id]
    );
    res.json({ reservations: result.rows });
  } catch (err) {
    console.error('Commit reservations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// reserved/committed → released for this estimate. Frees the gallons back to available stock.
app.post('/api/estimates/:id/reservations/release', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE inventory_reservations
       SET status = 'released', updated_at = NOW()
       WHERE estimate_id = $1 AND status IN ('reserved','committed')
       RETURNING *`,
      [req.params.id]
    );
    res.json({ reservations: result.rows });
  } catch (err) {
    console.error('Release reservations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// committed → reconciled. Writes a negative material_inventory row for each material with the
// actual gallons consumed, drawing from the surplus pool ($0 cost basis), then marks the
// reservation reconciled with the actual gallons stored.
app.post('/api/estimates/:id/reservations/reconcile', async (req, res) => {
  const client = await pool.connect();
  try {
    const estimateId = req.params.id;
    const { actuals = {} } = req.body || {};
    await client.query('BEGIN');
    const estLookup = await client.query(`SELECT estimate_name FROM estimates WHERE id = $1`, [estimateId]);
    const estimateName = estLookup.rows[0]?.estimate_name || '';
    // Require the estimate to be signed before any deduction can happen. This is the
    // server-side enforcement of the signed-gate invariant; the UI also gates this but
    // we don't trust the client.
    const signedCheck = await client.query(
      `SELECT signed_at FROM estimates WHERE id = $1`,
      [estimateId]
    );
    if (!signedCheck.rows[0]?.signed_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Estimate must be marked as signed before reconciling inventory.' });
    }
    // Pull committed reservations for this estimate, locking them so a concurrent
    // reconcile call can't double-deduct. We deliberately exclude 'reserved' rows so
    // unsigned inventory can never be deducted.
    const resvRes = await client.query(
      `SELECT * FROM inventory_reservations
       WHERE estimate_id = $1 AND status = 'committed'
       FOR UPDATE`,
      [estimateId]
    );
    const updates = [];
    for (const r of resvRes.rows) {
      const reservedGallons = parseFloat(r.gallons_surplus) || 0;
      const actualUsedRaw = actuals[r.material_type_id];
      const actualUsed = actualUsedRaw != null && !isNaN(parseFloat(actualUsedRaw))
        ? Math.max(0, parseFloat(actualUsedRaw))
        : reservedGallons;
      // Deduct only the actual gallons consumed (cap at what was reserved so we don't over-draw).
      const deductGallons = Math.min(actualUsed, reservedGallons);
      if (deductGallons > 0) {
        await client.query(`
          INSERT INTO material_inventory
            (material_type_id, material_type_name, material_category, gallons, inventory_unit,
             cost_per_gallon, source, source_estimate_name, committed_to_estimate,
             committed_at, is_surplus, notes)
          VALUES ($1, $2, $3, $4, 'gallons', 0, 'reservation_reconciliation', $5, $5, NOW(), true, $6)
        `, [
          r.material_type_id, r.material_type_name, r.material_category,
          -deductGallons, estimateName,
          `Reconciled from reservation #${r.id} (reserved ${reservedGallons.toFixed(1)} gal, used ${actualUsed.toFixed(1)} gal)`
        ]);
      }
      const upd = await client.query(
        `UPDATE inventory_reservations
         SET status = 'reconciled', actual_gallons_used = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [actualUsed, r.id]
      );
      updates.push(upd.rows[0]);
    }
    await client.query('COMMIT');
    res.json({ reservations: updates });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reconcile reservations error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Admin-wide list of reservations joined to their estimate name + customer.
app.get('/api/reservations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, e.estimate_name, e.customer_name
      FROM inventory_reservations r
      LEFT JOIN estimates e ON e.id = r.estimate_id
      WHERE r.status IN ('reserved','committed')
      ORDER BY r.created_at DESC
    `);
    res.json({ reservations: result.rows });
  } catch (err) {
    console.error('List reservations error:', err);
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
