/**
 * Normalizes incoming webhook payloads from different Business Solution Providers (BSPs)
 * into a standard internal format.
 */

function normalizeTwilio(req) {
  // Twilio sends form-urlencoded data, usually parsed by express.urlencoded()
  const body = req.body;
  return {
    provider: 'twilio',
    messageId: body.MessageSid,
    // Twilio formats numbers like 'whatsapp:+1234567890'
    from: body.From ? body.From.replace('whatsapp:', '') : '',
    to: body.To ? body.To.replace('whatsapp:', '') : '',
    text: body.Body || '',
    mediaUrl: body.MediaUrl0 || null,
    mediaContentType: body.MediaContentType0 || null
  };
}

function normalizeMetaCloud(req) {
  // Meta Cloud API sends JSON payloads
  const body = req.body;
  
  // Basic validation for Meta webhook structure
  if (body.object === 'whatsapp_business_account' && body.entry && body.entry[0]) {
    const entry = body.entry[0];
    if (entry.changes && entry.changes[0] && entry.changes[0].value) {
      const value = entry.changes[0].value;
      const metadata = value.metadata;
      
      if (value.messages && value.messages[0]) {
        const msg = value.messages[0];
        
        // Extract media if present
        let mediaUrl = null;
        let mediaContentType = null;
        let mediaId = null;
        
        if (msg.type === 'image') {
          mediaId = msg.image.id;
          mediaContentType = msg.image.mime_type;
          // In Meta Cloud, you get a media ID from the webhook. 
          // You have to make a separate authenticated GET request to Meta to resolve this ID to a URL.
        }
        
        return {
          provider: 'meta_cloud',
          messageId: msg.id,
          from: msg.from,
          to: metadata.display_phone_number, // This is the Bizzy Number (merchant's dedicated number)
          text: msg.text ? msg.text.body : '',
          mediaId: mediaId,
          mediaContentType: mediaContentType
        };
      }
    }
  }
  
  return null; // Could be a status update (read/delivered receipt) rather than a message
}

module.exports = {
  normalizeTwilio,
  normalizeMetaCloud
};
