const Merchant = require('../models/Merchant');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');

/**
 * Get high-level analytics for the dashboard overview.
 */
async function getDashboardStats(req, res) {
  try {
    const merchantId = req.merchantId;

    const [transactions, customersCount, productsCount] = await Promise.all([
      Transaction.find({ merchant: merchantId }),
      Customer.countDocuments({ merchant: merchantId }),
      Product.countDocuments({ merchant: merchantId, isActive: true })
    ]);

    // Calculate total revenue from successful transactions
    const totalRevenue = transactions
      .filter(tx => tx.paymentStatus === 'confirmed')
      .reduce((sum, tx) => sum + tx.totalAmount, 0);

    const orderCount = transactions.length;

    res.json({
      success: true,
      data: {
        totalRevenue,
        orderCount,
        customersCount,
        productsCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get merchant profile.
 */
async function getProfile(req, res) {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });
    
    res.json({ success: true, data: merchant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update merchant profile (Business info, AI Context, FAQs).
 */
async function updateProfile(req, res) {
  try {
    const updates = req.body;
    // Disallow updating critical system fields via this endpoint
    delete updates.bizzyNumber;
    
    const merchant = await Merchant.findByIdAndUpdate(
      req.merchantId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, data: merchant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get all active products for this merchant.
 */
async function getProducts(req, res) {
  try {
    const products = await Product.find({ merchant: req.merchantId, isActive: true })
                                  .sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Create a new product (Bulk upload or Web Interface).
 */
async function createProduct(req, res) {
  try {
    const productData = { ...req.body, merchant: req.merchantId };
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update a product (Prices, Variants, etc.).
 */
async function updateProduct(req, res) {
  try {
    const { productId } = req.params;
    
    const product = await Product.findOneAndUpdate(
      { _id: productId, merchant: req.merchantId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Soft delete a product.
 */
async function deleteProduct(req, res) {
  try {
    const { productId } = req.params;
    
    const product = await Product.findOneAndUpdate(
      { _id: productId, merchant: req.merchantId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getDashboardStats,
  getProfile,
  updateProfile,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
};
