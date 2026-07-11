const mongoose = require('mongoose');

/**
 * Line item sub-schema.
 * 
 * Design Call:
 * Line items SNAPSHOT product name and price at the time of sale.
 * Referencing the Product/Variant alone isn't enough because prices and names change over time. 
 * If a merchant changes a product's price next week, we do not want past receipts and sales reports 
 * to retroactively change. The Transaction must act as an immutable historical record.
 */
const lineItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: mongoose.Schema.Types.ObjectId, ref: 'Product.variants' }, // Optional, if they bought a specific variant
  snapshotName: { type: String, required: true },
  snapshotPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

/**
 * Transaction Model
 * Represents the sales ledger.
 */
const transactionSchema = new mongoose.Schema({
  merchant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Merchant', 
    required: true, 
    index: true 
  },
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true, 
    index: true 
  },
  items: [lineItemSchema],
  totalAmount: { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ['bank_transfer', 'opay'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending_proof', 'confirmed', 'rejected'], 
    default: 'pending_proof',
    index: true
  },
  receiptUrl: String,
  deliveryAddress: String,
  intentSnapshot: {
    // Design Call: NEVER raw message text, only the parsed intent. This is a hard privacy requirement.
    action: { type: String, required: true },
    raw: { type: mongoose.Schema.Types.Mixed } // The structured parsed intent (e.g. entities)
  },
  sessionId: { 
    type: String, 
    required: true 
    // Correlates to a Redis session, not a Mongo join. 
    // Live conversation state is Redis-only by design; don't create a second source of truth for it.
  }
}, { timestamps: true });

// Compound indexes for fast retrieval of merchant's or customer's recent transactions.
transactionSchema.index({ merchant: 1, createdAt: -1 });
transactionSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
