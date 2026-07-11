const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

/**
 * Creates a transaction while atomically decrementing product/variant stock.
 * 
 * Design Call:
 * 1. Uses `findOneAndUpdate` with a stock-floor condition (`$gte: qty`) to prevent overselling. 
 *    A naive read-then-write approach would allow race conditions under concurrent orders.
 * 2. Wraps the whole multi-document write (stock decrement, transaction insert, customer rollup) 
 *    in a real Mongoose session transaction since this touches money/inventory and must not half-commit.
 * 
 * @param {Object} params - The transaction creation parameters
 * @param {mongoose.Types.ObjectId} params.merchantId
 * @param {mongoose.Types.ObjectId} params.customerId
 * @param {Array<{productId: string, variantId?: string, quantity: number, snapshotName: string, snapshotPrice: number}>} params.items
 * @param {number} params.totalAmount
 * @param {string} params.paymentMethod
 * @param {string} params.sessionId
 * @param {Object} params.intentSnapshot
 * @param {string} [params.deliveryAddress]
 * @returns {Promise<Object>} The created transaction
 */
async function createTransaction(params) {
  const {
    merchantId,
    customerId,
    items,
    totalAmount,
    paymentMethod,
    sessionId,
    intentSnapshot,
    deliveryAddress
  } = params;

  const session = await mongoose.startSession();
  
  try {
    let createdTransaction;
    
    // session.withTransaction automatically starts a transaction, executes the callback, 
    // and commits (or aborts on error).
    await session.withTransaction(async () => {
      
      // 1. Atomically decrement stock for each item
      for (const item of items) {
        if (item.variantId) {
          // Variant stock decrement
          // $elemMatch ensures the specific variant we want to buy has enough stock (stock-floor condition)
          const updatedProduct = await Product.findOneAndUpdate(
            { 
              _id: item.productId, 
              merchant: merchantId,
              variants: { $elemMatch: { _id: item.variantId, stockQty: { $gte: item.quantity } } }
            },
            { 
              $inc: { 'variants.$.stockQty': -item.quantity } 
            },
            { session, new: true }
          );
          
          if (!updatedProduct) {
            // Throwing an error aborts the transaction
            throw new Error(`Insufficient stock for product ${item.productId} variant ${item.variantId}`);
          }
        } else {
          // Base product stock decrement (for products without variants)
          const updatedProduct = await Product.findOneAndUpdate(
            { 
              _id: item.productId, 
              merchant: merchantId,
              baseStockQty: { $gte: item.quantity } 
            },
            { 
              $inc: { baseStockQty: -item.quantity } 
            },
            { session, new: true }
          );

          if (!updatedProduct) {
            throw new Error(`Insufficient stock for product ${item.productId}`);
          }
        }
      }

      // 2. Insert the transaction
      const transactionData = [{
        merchant: merchantId,
        customer: customerId,
        items: items.map(item => ({
          product: item.productId,
          variant: item.variantId,
          snapshotName: item.snapshotName,
          snapshotPrice: item.snapshotPrice,
          quantity: item.quantity
        })),
        totalAmount,
        paymentMethod,
        intentSnapshot,
        sessionId,
        deliveryAddress
      }];

      const txDocs = await Transaction.create(transactionData, { session });
      createdTransaction = txDocs[0];

      // 3. Roll up customer metrics (totalSpent and orderCount) via $inc
      await Customer.findOneAndUpdate(
        { _id: customerId, merchant: merchantId },
        { 
          $inc: { 
            totalSpent: totalAmount, 
            orderCount: 1 
          },
          $set: {
            lastContactAt: new Date()
          }
        },
        { session }
      );
    });
    
    return createdTransaction;
  } finally {
    // End the session whether the transaction succeeded or failed
    await session.endSession();
  }
}

module.exports = {
  createTransaction
};
