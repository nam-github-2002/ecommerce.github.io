const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Lấy giỏ hàng
exports.getCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate({
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
        const { productId, quantity, price } = req.body;
        console.log(productId, quantity);

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm',
            });
        }

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = await Cart.create({
                user: req.user._id,
                cartItems: [{ product: product, quantity, price }],
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
                    price,
                });
            }

            await cart.save();
        }

        // Lấy lại giỏ hàng với thông tin sản phẩm đầy đủ
        const updatedCart = await Cart.findOne({ user: req.user._id }).populate(
            {
                path: 'cartItems.product',
                select: 'name price images',
            }
        );

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
        const { productId } = req.params;
        console.log('productId: ', productId);
        const cart = await Cart.findOne({ user: req.user._id });
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
            cart: { items: cart.cartItems || [] },
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
        await Cart.findOneAndDelete({ user: req.user._id });

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
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required',
            });
        }

        const { items } = req.body;

        if (!Array.isArray(items)) {
            return res
                .status(400)
                .json({ success: false, message: 'Items should be an array' });
        }
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart || cart.cartItems.length === 0) {
            // Tạo mới giỏ hàng
            const cartItems = items.map((item) => ({
                product: item.product,
                quantity: item.quantity || 1,
                price: item.price,
            }));

            cart = new Cart({
                user: req.user._id,
                cartItems,
            });
        } else {
            // Merge giỏ hàng
            for (const item of items) {
                const existingItem = cart.cartItems.find(
                    (ci) => ci.product.toString() === item.product
                );

                if (existingItem) {
                    existingItem.quantity = item.quantity || 1;
                } else {
                    const product = await Product.findById(item.product);
                    if (product) {
                        cart.cartItems.push({
                            product: item.product,
                            quantity: item.quantity || 1,
                            price: product.price,
                        });
                    }
                }
            }
        }

        await cart.save();
        console.log(cart);

        const cartCount = cart.cartItems.reduce(
            (total, item) => total + item.quantity,
            0
        );
        res.status(200).json({
            success: true,
            count: cartCount,
            cart,
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
        const cart = await Cart.findOne({ user: req.user._id });
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

// Cập nhật hàm xử lý trong cartController.js
exports.updateCart = async (req, res) => {
    try {
        console.log('Received:', req.body);
        const { userId, items } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID required',
            });
        }

        // Validate items
        const validItems = items.filter(
            (item) => item.productId && Number(item.quantity) > 0 && item.price
        );

        if (validItems.length === 0) {
            await Cart.deleteOne({ user: userId });
            return res.json({
                success: true,
                message: 'Cart cleared',
            });
        }

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                cartItems: validItems.map((item) => ({
                    product: item.productId,
                    quantity: Number(item.quantity),
                    price: Number(item.price),
                })),
            });
        } else {
            // Cập nhật từng sản phẩm, không ghi đè toàn bộ
            validItems.forEach((newItem) => {
                const existingItem = cart.cartItems.find(
                    (i) => i.product.toString() === newItem.productId
                );

                if (existingItem) {
                    existingItem.quantity = Number(newItem.quantity);
                    existingItem.price = Number(newItem.price);
                } else {
                    cart.cartItems.push({
                        product: newItem.productId,
                        quantity: Number(newItem.quantity),
                        price: Number(newItem.price),
                    });
                }
            });

            // Xóa các items không còn trong validItems
            cart.cartItems = cart.cartItems.filter((item) =>
                validItems.some(
                    (newItem) => newItem.productId === item.product.toString()
                )
            );
        }

        await cart.save();

        // Debug: Log kết quả
        console.log('Updated cart:', cart);

        res.json({
            success: true,
            data: cart,
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
