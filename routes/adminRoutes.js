const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

// Apply the authentication middleware to all routes in this router
router.use(authMiddleware);

// Overview / Analytics
router.get('/stats', adminController.getDashboardStats);

// Profile Management
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);

// Catalog Management
router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:productId', adminController.updateProduct);
router.delete('/products/:productId', adminController.deleteProduct);

module.exports = router;
