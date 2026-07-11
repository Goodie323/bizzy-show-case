/**
 * Utility service to send messages back to users via Meta Cloud API.
 * Uses the global Meta credentials defined in .env.
 */

const META_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Sends a text message to a specific WhatsApp number.
 * 
 * @param {string} fromPhoneNumberId - The Phone Number ID (bizzyNumber ID registered with Meta)
 * @param {string} to - The recipient's phone number
 * @param {string} text - The message content
 * @returns {Promise<Object>} The response from Meta
 */
async function sendTextMessage(fromPhoneNumberId, to, text) {
  const url = `${META_API_URL}/${fromPhoneNumberId}/messages`;
  const token = process.env.META_API_KEY;

  if (!token) {
    throw new Error('META_API_KEY is not defined in environment variables.');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      preview_url: true,
      body: text
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta API Error:', data);
      throw new Error(data.error?.message || 'Failed to send WhatsApp message');
    }

    return data;
  } catch (error) {
    console.error(`Failed to send message to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Sends an interactive button message.
 * Useful for AI prompting (e.g., "Do you want to add a price now?" [Yes] [No])
 */
async function sendButtonMessage(fromPhoneNumberId, to, text, buttons) {
  const url = `${META_API_URL}/${fromPhoneNumberId}/messages`;
  const token = process.env.META_API_KEY;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: text
      },
      action: {
        buttons: buttons.map((btn, index) => ({
          type: 'reply',
          reply: {
            id: btn.id || `btn_${index}`,
            title: btn.title
          }
        }))
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

module.exports = {
  sendTextMessage,
  sendButtonMessage
};
