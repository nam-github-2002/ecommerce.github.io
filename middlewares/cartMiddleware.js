const Cart = require('../models/Cart');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('express-async-handler');

// Middleware to check if cart exists
exports.checkCartExists = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
        return next(new ErrorResponse('Không tìm thấy giỏ hàng', 404));
    }

    req.cart = cart;
    next();
});

// Middleware to check if product exists in cart
exports.checkProductInCart = asyncHandler(async (req, res, next) => {
    const cart = req.cart;
    const productIndex = cart.items.findIndex(
        (item) => item.product.toString() === req.params.productId
    );

    if (productIndex === -1) {
        return next(new ErrorResponse('Sản phẩm không có trong giỏ hàng', 404));
    }

    req.productIndex = productIndex;
    next();
});

// Middleware to merge guest cart with user cart after login
exports.mergeGuestCart = asyncHandler(async (req, res, next) => {
    if (req.session.guestCart && req.session.guestCart.length > 0) {
        const userCart = await Cart.findOne({ user: req.user.id });

        if (!userCart) {
            // Create new cart with guest items
            await Cart.create({
                user: req.user.id,
                items: req.session.guestCart,
            });
        } else {
            // Merge guest items with existing cart
            for (const guestItem of req.session.guestCart) {
                const existingItem = userCart.items.find(
                    (item) =>
                        item.product.toString() === guestItem.product.toString()
                );

                if (existingItem) {
                    existingItem.quantity += guestItem.quantity;
                } else {
                    userCart.items.push(guestItem);
                }
            }

            await userCart.save();
        }

        // Clear guest cart
        delete req.session.guestCart;
    }

    next();
});
