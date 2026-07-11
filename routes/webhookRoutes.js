const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Twilio usually sends POST requests to the webhook URL.
// Meta Cloud API sends POST requests for incoming messages and status events.
// Both are handled by a unified endpoint that detects the provider.
router.post('/incoming', webhookController.handleIncomingMessage);

// Meta Cloud API specifically requires a GET endpoint for initial webhook verification.
router.get('/incoming', webhookController.verifyMetaWebhook);

module.exports = router;
