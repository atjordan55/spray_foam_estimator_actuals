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
};
