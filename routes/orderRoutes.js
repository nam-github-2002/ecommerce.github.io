const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

const {
    getCheckout,
    createOrder,
    getUserOrders,
    getOrderDetails,
    cancelOrder
} = require('../controllers/orderController')
// Xem trang thanh toán
router.get('/checkout', protect, getCheckout);

// Tạo đơn hàng mới
router.post('/create', protect, createOrder);

// Xem lịch sử đơn hàng
router.get('/getOrder', protect, getUserOrders);

// Xem chi tiết đơn hàng
router.get('/getOrder/:id', protect, getOrderDetails);

// Hủy đơn hàng
router.post('/:id/cancel', protect, cancelOrder);

module.exports = router;