const mongoose = require('mongoose');

/**
 * Customer Model
 * 
 * Design Call: Customer is SCOPED PER MERCHANT, not global.
 * The same physical person (same phone number) buying from two different merchants 
 * on the Bizzy platform will have two separate Customer documents.
 * This is a deliberate privacy boundary, not an oversight. Merchants "own" their customer list. 
 * We do not share purchase history or PII across different merchants, nor do we 
 * create a global profile that might accidentally leak cross-merchant behavior.
 */
const customerSchema = new mongoose.Schema({
  merchant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Merchant', 
    required: true 
  },
  phoneNumber: { type: String, required: true },
  name: { 
    type: String 
    // Optional, often unknown until captured mid-flow (e.g., checkout/shipping steps)
  },
  totalSpent: { 
    type: Number, 
    default: 0 
    // Denormalized rollup, updated via transaction writes for fast analytics
  },
  orderCount: { 
    type: Number, 
    default: 0 
    // Denormalized rollup, updated via transaction writes
  },
  lastContactAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Unique compound index on {merchant, phoneNumber} to ensure we only have one
// customer profile per phone number per merchant.
customerSchema.index({ merchant: 1, phoneNumber: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
