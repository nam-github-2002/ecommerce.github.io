const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

const {
    getCart,
    addToCart,
    removeFromCart,
    clearCart,
    mergeCart,
    getCartCount,
    updateCart
} = require('../controllers/cartController');

router
    .route('/checkout')
    .get( protect, getCart)
    .post(protect, addToCart)
    .delete(protect, clearCart);
router.route('/merge').post(protect,mergeCart)
router.route('/deleteItem/:productId').post(protect, removeFromCart);
router.route('/cart-count').get(protect, getCartCount);
router.post('/update', protect, updateCart)
module.exports = router;
