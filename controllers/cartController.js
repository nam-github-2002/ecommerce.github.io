const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Lấy giỏ hàng
exports.getCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id }).populate({
            path: 'cartItems.product',
            select: 'name price images category',
        });

        if (!cart) {
            return res.status(200).render('cart/checkout', {
                success: true,
                title: 'Giỏ hàng',
                cartItems: [],
                subTotal: 0,
                shippingFee: 0,
            });
        }

        const subTotal = cart.cartItems.reduce((total, item) => {
            return total + item.product.price * item.quantity;
        }, 0);

        res.status(200).render('cart/checkout', {
            success: true,
            title: 'Giỏ hàng',
            cartItems: cart.cartItems,
            subTotal,
            shippingFee: 0,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Thêm sản phẩm vào giỏ hàng
exports.addToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        console.log(productId, quantity);

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm',
            });
        }

        let cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            cart = await Cart.create({
                user: req.user.id,
                cartItems: [
                    { product: product, quantity, price: product.price },
                ],
            });
        } else {
            // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
            const itemIndex = cart.cartItems.findIndex(
                (item) => item.product.toString() === productId
            );

            if (itemIndex >= 0) {
                // Sản phẩm đã có, tăng số lượng
                cart.cartItems[itemIndex].quantity += parseInt(quantity);
            } else {
                // Thêm sản phẩm mới
                cart.cartItems.push({
                    product: productId,
                    quantity,
                    price: product.price,
                });
            }

            await cart.save();
        }

        // Lấy lại giỏ hàng với thông tin sản phẩm đầy đủ
        const updatedCart = await Cart.findOne({ user: req.user.id }).populate({
            path: 'cartItems.product',
            select: 'name price images',
        });

        const cartCount = updatedCart.cartItems.reduce(
            (total, item) => total + item.quantity,
            0
        );

        res.status(200).json({
            success: true,
            cartCount,
            cart: updatedCart,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Xóa sản phẩm khỏi giỏ hàng
exports.removeFromCart = async (req, res, next) => {
    try {
        const productId = req.params;
        console.log('productId: ',productId)
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giỏ hàng',
            });
        }

        // Lọc ra sản phẩm cần xóa
        cart.cartItems = cart.cartItems.filter(
            (item) => item.product.toString() !== productId
        );

        await cart.save();

        res.status(200).json({
            success: true,
            cart,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Xóa toàn bộ giỏ hàng
exports.clearCart = async (req, res, next) => {
    try {
        await Cart.findOneAndDelete({ user: req.user.id });

        res.status(200).json({
            success: true,
            message: 'Đã xóa giỏ hàng',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Merge giỏ hàng local với server
exports.mergeCart = async (req, res, next) => {
    try {
        const { items } = req.body;
        let cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            // Nếu chưa có giỏ hàng, tạo mới
            const cartItems = items.map((item) => ({
                product: item.productId,
                quantity: item.quantity || 1,
                price: item.price,
            }));

            cart = new Cart({
                user: req.user.id,
                cartItems,
            });
            await cart.save();
        } else {
            // Nếu đã có giỏ hàng, merge với local
            for (const item of items) {
                const existingItem = cart.cartItems.find(
                    (ci) => ci.product.toString() === item.productId
                );

                if (existingItem) {
                    existingItem.quantity += item.quantity;
                } else {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        cart.cartItems.push({
                            product: item.productId,
                            quantity: item.quantity,
                            price: product.price,
                        });
                    }
                }
            }

            await cart.save();
        }

        // Lấy số lượng sản phẩm trong giỏ hàng
        const cartCount = cart.cartItems.reduce(
            (total, item) => total + item.quantity,
            0
        );

        res.status(200).json({
            success: true,
            cart,
            count: cartCount,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Lấy số lượng sản phẩm trong giỏ hàng
exports.getCartCount = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        const count = cart
            ? cart.cartItems.reduce((total, item) => total + item.quantity, 0)
            : 0;

        res.status(200).json({
            success: true,
            count,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.updateCart = async (req, res, next) => {
    try {
        const { updates } = req.body;
        const cart = await Cart.findOne({ user: req.user.id });
        
        for (const update of updates) {
            if (update.action === 'remove') {
                cart.cartItems = cart.cartItems.filter(
                    item => item.product.toString() !== update.productId
                );
            } else {
                const itemIndex = cart.cartItems.findIndex(
                    item => item.product.toString() === update.productId
                );
                
                if (itemIndex >= 0) {
                    cart.cartItems[itemIndex].quantity = update.quantity;
                }
            }
        }
        
        await cart.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}