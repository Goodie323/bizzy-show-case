const mongoose = require('mongoose');

/**
 * Variant sub-schema.
 * 
 * Design Call:
 * Variants are embedded, not referenced. A product and its variants represent a single 
 * conceptual entity and are almost always read and written as a unit (e.g. displaying a 
 * product card with all its options). Referencing variants would require unnecessary joins 
 * (populate), leading to worse read performance. We intentionally keep the _id on variants 
 * because Transaction line items reference them directly to identify exactly what was purchased.
 */
const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stockQty: { type: Number, required: true },
  sku: { type: String }
});

/**
 * Product Model
 * Represents the merchant-scoped catalog.
 */
const productSchema = new mongoose.Schema({
  merchant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Merchant', 
    required: true, 
    index: true 
  },
  name: { type: String, required: true },
  category: String,
  description: String,
  imageUrl: String, // Media URL from WhatsApp upload
  basePrice: Number, // For no-variant products
  baseStockQty: Number, // For no-variant products
  variants: [variantSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index on {merchant, isActive} for quickly fetching active catalog per merchant.
productSchema.index({ merchant: 1, isActive: 1 });

// Text index on {merchant, name} for fuzzy product matching during conversational intent parsing.
productSchema.index({ merchant: 1, name: 'text' });

module.exports = mongoose.model('Product', productSchema);
