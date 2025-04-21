const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { calcPrices } = require('../utils/calcPrice');

// @desc    Get checkout page
// @route   GET /checkout
// @access  Private
exports.getCheckout = async (req, res, next) => {
    try {
        const user = req.user;
        const cart = await Cart.findOne({ user: req.user._id }).populate({
            path: 'cartItems.product',
            select: 'name price images sizes colors', // Chọn các trường cần lấy
        });

        if (!cart || cart.cartItems.length === 0) {
            req.flash('error', 'Giỏ hàng của bạn đang trống');
            return res.redirect('/cart/checkout');
        }

        // Tính toán tổng giá
        const { subTotal, shippingFee, total } = calcPrices(cart.cartItems);

        res.render('cart/payment', {
            title: 'Thanh toán',
            cartItems: cart.cartItems,
            subTotal,
            shippingFee,
            total,
            user,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new order
// @route   POST /orders
// @access  Private
exports.createOrder = async (req, res, next) => {
    try {
        const {
            name,
            email,
            address,
            city,
            postalCode,
            country,
            phone,
            paymentMethod,
        } = req.body;

        // 1. Kiểm tra giỏ hàng
        const cart = await Cart.findOne({ user: req.user._id })
            .populate('cartItems.product', 'name price images')

        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng của bạn đang trống',
            });
        }

        // 2. Kiểm tra order cuối cùng của user
        const lastOrder = await Order.findOne({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(1)

        // Nếu có order trong vòng 30 giây trở lại đây
        if (lastOrder && (new Date() - lastOrder.createdAt < 70000)) {
            console.log( (new Date() - lastOrder.createdAt))
            return res.status(400).json({
                success: false,
                message: 'Bạn vừa tạo đơn hàng gần đây. Vui lòng đợi một chút.',
            });
        }

        // 3. Chuẩn bị order items
        const orderItems = cart.cartItems.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
            image: item.product.images[0]?.url || '/images/default-product.jpg',
            price: item.product.price,
            product: item.product._id,
        }));

        // 4. Tính toán giá
        const { subTotal, shippingFee, total } = calcPrices(orderItems);

        // 5. Tạo đơn hàng mới
        const order = new Order({
            user: req.user._id,
            orderItems,
            shippingAddress: {
                name,
                email,
                phone,
                address,
                city,
                postalCode,
                country,
            },
            paymentMethod,
            itemsPrice: subTotal,
            shippingPrice: shippingFee,
            totalPrice: total,
        });

        // 6. Lưu order và xóa cart trong cùng transaction
        const createdOrder = await order.save();
        await Cart.findOneAndDelete({ user: req.user._id });

        res.status(201).json({
            success: true,
            order: createdOrder,
            redirectUrl: `/orders/${createdOrder._id}`, // Nên chuyển đến trang chi tiết đơn hàng
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi tạo đơn hàng',
            error: error.message,
        });
    }
};

// @desc    Get user orders
// @route   GET /orders
// @access  Private
exports.getUserOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort(
            '-createdAt'
        );

        res.render('orders/list', {
            title: 'Lịch sử đơn hàng',
            orders,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get order details
// @route   GET /orders/:id
// @access  Private
exports.getOrderDetails = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate(
            'user',
            'name email'
        );

        if (!order) {
            res.status(404);
            throw new Error('Đơn hàng không tồn tại');
        }

        // Kiểm tra xem user có quyền xem đơn hàng này không
        if (
            order.user._id.toString() !== req.user._id.toString() &&
            !req.user.isAdmin
        ) {
            res.status(401);
            throw new Error('Không có quyền truy cập');
        }

        res.render('orders/details', {
            title: 'Chi tiết đơn hàng',
            order,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel order
// @route   PUT /orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            res.status(404);
            throw new Error('Đơn hàng không tồn tại');
        }

        // Kiểm tra quyền
        if (order.user.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error('Không có quyền hủy đơn hàng này');
        }

        // Chỉ có thể hủy đơn hàng chưa thanh toán hoặc chưa vận chuyển
        if (order.isPaid || order.isDelivered) {
            res.status(400);
            throw new Error(
                'Không thể hủy đơn hàng đã thanh toán hoặc đã vận chuyển'
            );
        }

        order.isCancelled = true;
        order.cancelledAt = Date.now();

        await order.save();

        res.json({
            success: true,
            message: 'Đơn hàng đã được hủy thành công',
        });
    } catch (error) {
        next(error);
    }
};
