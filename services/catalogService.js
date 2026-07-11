const Product = require('../models/Product');

/**
 * Service to handle product catalog uploads via the AI chatbot layer.
 * 
 * The AI layer extracts structured JSON from natural language descriptions and images
 * sent by the merchant via WhatsApp. This backend service validates the payload.
 * If any required fields are missing (e.g., price), it returns a specific status
 * instructing the AI layer (which holds conversation state in Redis) to prompt the 
 * merchant for the missing information.
 * 
 * @param {Object} data - Structured JSON from the AI layer
 * @param {string} data.merchantId - The merchant's ObjectId
 * @param {string} [data.name] - Extracted product name
 * @param {string} [data.description] - Extracted product description
 * @param {number} [data.price] - Extracted product price
 * @param {string} [data.imageUrl] - S3/Storage URL of the uploaded image
 * @param {string} [data.category] - Extracted category
 * @returns {Promise<Object>} Result payload for the bot webhook
 */
async function processProductUpload(data) {
  const { merchantId, name, description, price, imageUrl, category } = data;

  // 1. Check for missing required fields based on business logic.
  // The bot builds up this payload in Redis across multiple messages.
  const missingFields = [];
  
  if (!name) missingFields.push('name');
  if (!price) missingFields.push('price');
  if (!imageUrl) missingFields.push('imageUrl');
  
  // If fields are missing, return them so the webhook response can tell the AI
  // to ask the user (e.g., "Please reply with the price of this item").
  if (missingFields.length > 0) {
    return {
      success: false,
      status: 'incomplete_data',
      missingFields,
      message: `Missing required product fields: ${missingFields.join(', ')}`
    };
  }

  // 2. All required fields are present, create the product in the catalog.
  const product = new Product({
    merchant: merchantId,
    name,
    description,
    basePrice: price,
    imageUrl,
    category,
    isActive: true,
    baseStockQty: 0 // Default to 0, inventory updates can be handled separately
  });

  await product.save();

  return {
    success: true,
    status: 'created',
    product
  };
}

module.exports = {
  processProductUpload
};
