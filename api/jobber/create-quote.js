const { jobberGraphQL } = require('../lib/jobber');

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
    const { clientId, propertyId, title, lineItems, notes, discount } = req.body;
    
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
      mutation CreateQuote($clientId: EncodedId!, $propertyId: EncodedId!, $title: String, $lineItems: [QuoteCreateLineItemAttributes!]!, $discount: CostModifierAttributes) {
        quoteCreate(attributes: {
          clientId: $clientId
          propertyId: $propertyId
          title: $title
          lineItems: $lineItems
          discount: $discount
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
    
    const result = await jobberGraphQL(createMutation, variables);
    
    if (result.quoteCreate.userErrors?.length > 0) {
      throw new Error(result.quoteCreate.userErrors[0].message);
    }
    
    res.json({ quote: result.quoteCreate.quote });
  } catch (err) {
    console.error('Create quote error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
