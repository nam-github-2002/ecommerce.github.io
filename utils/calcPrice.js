// Tính toán giá đơn hàng
exports.calcPrices = (orderItems) => {
    // Tính tổng giá sản phẩm
    const itemsPrice = orderItems.reduce(
        (acc, item) => acc + (item.price * item.quantity),
        0
    );

    // Phí vận chuyển (ví dụ: 10% tổng giá nhưng tối thiểu 20,000đ)
    const shippingPrice = Math.max(itemsPrice * 0.1, 20000);

    // Tổng giá
    const totalPrice = itemsPrice + shippingPrice;

    return {
        subTotal: itemsPrice,
        shippingFee: shippingPrice,
        total: totalPrice
    };
};