const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

const {
    getCart,
    addToCart,
    removeFromCart,
    clearCart,
} = require('../controllers/cartController');

router
    .route('/checkout')
    .get( getCart)
    .post(protect, addToCart)
    .delete(protect, clearCart);

router.route('/:productId').delete(protect, removeFromCart);

module.exports = router;
