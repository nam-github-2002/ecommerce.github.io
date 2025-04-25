const Order = require('../models/Order');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { calcPrices } = require('../utils/calcPrice');

// @desc    Get checkout page
// @route   GET /order/checkout
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
// @route   POST /order/create
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

        if (req.user) {
            const user = await User.findById(req.user._id);

            user.address = {
                phone: phone || user.address.phone,
                postalCode: postalCode || user.address.postalCode,
                addr: address || user.address.addr,
                city: city || user.address.city,
                country: country || user.address.country,
            };
            await user.save();
        }

        // 1. Kiểm tra giỏ hàng
        const cart = await Cart.findOne({ user: req.user._id }).populate(
            'cartItems.product',
            'name price images'
        );

        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng của bạn đang trống',
            });
        }

        // 2. Kiểm tra order cuối cùng của user
        const lastOrder = await Order.findOne({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(1);

        // Nếu có order trong vòng 30 giây trở lại đây
        if (lastOrder && new Date() - lastOrder.createdAt < 70000) {
            console.log(new Date() - lastOrder.createdAt);
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

        if (req.user)
            res.status(201).json({
                success: true,
                order: createdOrder,
                redirectUrl: `/order/getOrder/${createdOrder._id}`,
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
// @route   GET /order/getOrder
exports.getUserOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort(
            '-createdAt'
        );

        res.render('users/order', {
            title: 'Lịch sử đặt hàng',
            orders,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get order details
// @route   GET /order/getOrder/:id
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

        res.render('users/orderdetail', {
            title: 'Chi tiết đơn hàng',
            order,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel order
// @route   POST /order/:id/cancel
exports.cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findOne({ _id: req.params.id });

        if (!order) {
            res.status(404);
            throw new Error('Đơn hàng không tồn tại');
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

        res.redirect('/order/getOrder');
    } catch (error) {
        next(error);
    }
};
