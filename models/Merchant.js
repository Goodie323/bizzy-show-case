const mongoose = require('mongoose');

/**
 * Merchant Model
 * Represents the tenant root in the Bizzy platform.
 * All incoming webhooks use `bizzyNumber` as the lookup key to find the corresponding merchant.
 */
const merchantSchema = new mongoose.Schema({
  bizzyNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
    // This is the webhook lookup key - identifying which merchant an incoming message is for.
    // There are no per-merchant bot instances; this centralized engine serves everyone.
  },
  personalNumber: { 
    type: String, 
    required: true 
    // Used strictly for order alerts. We never contact this number on behalf of customers.
  },
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['fashion', 'perfume', 'spare_parts', 'food', 'general'],
    required: true
  },
  language: { 
    type: String, 
    enum: ['en', 'pidgin', 'yoruba', 'igbo', 'hausa'], 
    default: 'en' 
  },
  paymentDetails: {
    method: String,
    accountName: String,
    accountNumber: String,
    bankName: String
  },
  subscription: {
    tier: { type: String, enum: ['free', 'paid'], default: 'free' },
    status: { type: String, enum: ['active', 'inactive', 'trialing'], default: 'trialing' },
    trialEndsAt: Date,
    monthlyTransactionCount: { type: Number, default: 0 }
  },

  profile: {
    description: String,
    address: String,
    operatingHours: String
    // Information provided during onboarding, used as context for the AI chatbot
  },
  faqs: [{
    question: String,
    answer: String
    // Handled by the same profile tag, provides answers for the chatbot
  }],
  onboardingStatus: { type: String, default: 'pending' },
  statusCaptionTemplate: String
}, { timestamps: true });

module.exports = mongoose.model('Merchant', merchantSchema);
