const { jobberGraphQL, getClientProperty, createPropertyForClient } = require('../lib/jobber');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { name, email, phone, address } = req.body;
    
    // Search query that returns email and phone details for better matching
    const searchQuery = `
      query SearchClients($searchTerm: String!) {
        clients(searchTerm: $searchTerm, first: 10) {
          nodes {
            id
            firstName
            lastName
            companyName
            emails {
              address
            }
            phones {
              number
            }
          }
        }
      }
    `;
    
    // Helper to normalize phone numbers for comparison (remove non-digits)
    const normalizePhone = (p) => p ? p.replace(/\D/g, '') : '';
    
    // Helper to normalize email for comparison (lowercase, trim)
    const normalizeEmail = (e) => e ? e.toLowerCase().trim() : '';
    
    // 1. Search by EMAIL first (most unique identifier)
    if (email) {
      try {
        const searchResult = await jobberGraphQL(searchQuery, { searchTerm: email });
        
        // Find exact email match
        const exactMatch = searchResult.clients.nodes.find(client => 
          client.emails?.some(e => normalizeEmail(e.address) === normalizeEmail(email))
        );
        
        if (exactMatch) {
          let propertyId = await getClientProperty(exactMatch.id);
          if (!propertyId && address) {
            propertyId = await createPropertyForClient(exactMatch.id, address);
          }
          return res.json({ 
            client: exactMatch, 
            propertyId,
            created: false,
            matchedBy: 'email'
          });
        }
      } catch (searchErr) {
        console.log(`Email search failed:`, searchErr.message);
      }
    }
    
    // 2. Search by PHONE number (second most unique)
    if (phone) {
      try {
        const searchResult = await jobberGraphQL(searchQuery, { searchTerm: phone });
        const normalizedInputPhone = normalizePhone(phone);
        
        // Find exact phone match (comparing normalized numbers)
        const exactMatch = searchResult.clients.nodes.find(client => 
          client.phones?.some(p => normalizePhone(p.number) === normalizedInputPhone)
        );
        
        if (exactMatch) {
          let propertyId = await getClientProperty(exactMatch.id);
          if (!propertyId && address) {
            propertyId = await createPropertyForClient(exactMatch.id, address);
          }
          return res.json({ 
            client: exactMatch, 
            propertyId,
            created: false,
            matchedBy: 'phone'
          });
        }
      } catch (searchErr) {
        console.log(`Phone search failed:`, searchErr.message);
      }
    }
    
    // 3. No exact match found - create new client
    
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
      sourceAttribution: null,
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
};
