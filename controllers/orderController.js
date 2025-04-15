const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { calcPrices } = require('../utils/calcPrice');

// @desc    Get checkout page
// @route   GET /checkout
// @access  Private
exports.getCheckout = async (req, res, next) => {
    try {
        const { userId } = req.body;
        let cart = await Cart.findOne({ user: userId });

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
            user: req.user,
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
            paymentMethod,
            name,
            address,
            city,
            postalCode,
            country,
            phone,
        } = req.body;
        const cartItems = req.session.cart || [];

        if (cartItems.length === 0) {
            res.status(400);
            throw new Error('Giỏ hàng trống');
        }

        // Lấy thông tin sản phẩm từ database để đảm bảo giá chính xác
        const itemsFromDB = await Promise.all(
            cartItems.map(async (item) => {
                const product = await Product.findById(item.product.id);
                return {
                    name: product.name,
                    quantity: item.quantity,
                    image: product.images[0].url,
                    price: product.price,
                    product: product._id,
                    color: item.color,
                    size: item.size,
                };
            })
        );

        // Tính toán giá
        const { subTotal, shippingFee, total } = calcPrices(itemsFromDB);

        // Tạo đơn hàng
        const order = new Order({
            user: req.user._id,
            orderItems: itemsFromDB,
            shippingAddress: {
                name,
                address,
                city,
                postalCode,
                country,
                phone,
            },
            paymentMethod,
            itemsPrice: subTotal,
            shippingPrice: shippingFee,
            totalPrice: total,
        });

        const createdOrder = await order.save();

        // Xóa giỏ hàng sau khi đặt hàng thành công
        req.session.cart = [];

        res.status(201).json({
            success: true,
            order: createdOrder,
            redirectUrl: `/orders/${createdOrder._id}`,
        });
    } catch (error) {
        next(error);
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
