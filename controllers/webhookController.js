const Merchant = require('../models/Merchant');
const { normalizeTwilio, normalizeMetaCloud } = require('../utils/payloadNormalizer');

/**
 * Handles incoming webhooks from all BSPs.
 */
async function handleIncomingMessage(req, res) {
  try {
    let normalizedMessage;

    // Detect provider based on payload structure or headers
    if (req.headers['x-twilio-signature']) {
      normalizedMessage = normalizeTwilio(req);
    } else if (req.body && req.body.object === 'whatsapp_business_account') {
      normalizedMessage = normalizeMetaCloud(req);
    } else {
      // Unknown or unsupported provider format
      return res.status(400).send('Unknown provider payload');
    }

    if (!normalizedMessage) {
      // Possibly a status update (read, delivered) rather than an incoming message
      return res.status(200).send('EVENT_RECEIVED');
    }

    // 1. Merchant Lookup - The core of the centralized architecture.
    // `normalizedMessage.to` is the merchant's dedicated WhatsApp number (bizzyNumber).
    const merchant = await Merchant.findOne({ bizzyNumber: normalizedMessage.to });
    
    if (!merchant) {
      console.error(`Message received for unregistered bizzyNumber: ${normalizedMessage.to}`);
      // Return 200 so the BSP doesn't keep retrying the webhook delivery
      return res.status(200).send('Merchant not found');
    }

    // 2. Hand off to the AI/Intent processing layer
    // The AI layer uses the merchant profile, Redis session state, and the normalized message 
    // to determine what to do (e.g. Catalog upload, FAQ answer, Transaction flow).
    
    /* 
      TODO: Implement AI Orchestrator Handoff
      Example:
      
      const aiResponse = await AILayer.process({
        merchantId: merchant._id,
        merchantContext: { profile: merchant.profile, faqs: merchant.faqs },
        customerNumber: normalizedMessage.from,
        text: normalizedMessage.text,
        mediaUrl: normalizedMessage.mediaUrl, // or mediaId for Meta
        messageId: normalizedMessage.messageId
      });
      
      // Based on aiResponse, the bot orchestrator sends a reply via Twilio/Meta API.
    */

    // 3. Acknowledge Receipt
    // Always return a 200 OK to the webhook as quickly as possible.
    // Heavy AI lifting should ideally be queued (e.g., BullMQ) or processed asynchronously 
    // so we don't block the webhook response and cause the BSP to timeout/retry.
    res.status(200).send('EVENT_RECEIVED');

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Meta Cloud API requires webhook verification (hub.challenge) during setup.
 */
function verifyMetaWebhook(req, res) {
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
}

module.exports = {
  handleIncomingMessage,
  verifyMetaWebhook
};
