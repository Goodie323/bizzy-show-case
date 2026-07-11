/**
 * Middleware to authenticate requests to the Web Dashboard APIs.
 * 
 * For now, this uses a mock header `x-merchant-id` to identify the logged-in merchant.
 * In a production scenario with WhatsApp OTP login, this would verify a JWT token
 * and extract the merchant ID from the token payload.
 */
function authMiddleware(req, res, next) {
  const merchantId = req.headers['x-merchant-id'];

  if (!merchantId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Missing x-merchant-id header.'
    });
  }

  // Inject the authenticated merchant's ID into the request object
  req.merchantId = merchantId;
  next();
}

module.exports = {
  authMiddleware
};
