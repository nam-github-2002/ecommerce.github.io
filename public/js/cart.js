/**
 * Kiểm tra trạng thái đăng nhập của người dùng
 * @returns {Promise<boolean>} Trả về true nếu đã đăng nhập, false nếu chưa
 */
async function isLoggedIn() {
    try {
        const response = await fetch('/auth/check', {
            method: 'GET',
            credentials: 'include', // Để gửi cookie/session
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });

        // Kiểm tra HTTP status code
        if (!response.ok) {
            console.error('Lỗi từ server:', response.status);
            return false;
        }

        const data = await response.json();

        // Giả sử server trả về { isAuthenticated: boolean }
        return data.isAuthenticated === true;
    } catch (error) {
        console.error('Lỗi khi kiểm tra đăng nhập:', error);
        return false;
    }
}
// Hàm thêm sản phẩm vào giỏ hàng
function addToCart(productId, quantity = 1, price) {
    if (!productId) return;

    // Lấy giỏ hàng từ localStorage và đảm bảo nó luôn là mảng
    let cart;
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || [];
        // Đảm bảo cart là mảng
        if (!Array.isArray(cart)) {
            cart = [];
        }
    } catch (error) {
        console.error('Lỗi khi parse giỏ hàng:', error);
        cart = [];
    }

    // Tìm sản phẩm trong giỏ hàng
    const existingItem = cart.find((item) => item.productId === productId);

    if (existingItem) {
        existingItem.quantity += parseInt(quantity);
    } else {
        cart.push({
            productId: productId,
            quantity: parseInt(quantity),
            price: price,
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    showAlert('success', 'Đã thêm sản phẩm vào giỏ hàng');
    updateCartCount(cart.reduce((total, item) => total + item.quantity, 0));
}

// Hàm hiển thị thông báo
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 1000);
}

// Merge giỏ hàng local với server khi đăng nhập
function mergeCartWithServer() {
    const localCart = JSON.parse(localStorage.getItem('cart')) || [];

    if (localCart.length > 0) {
        fetch('/cart/merge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: localCart }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    localStorage.removeItem('cart');
                    updateCartCount(data.count);
                }
            });
    }
}

// Hàm cập nhật giỏ hàng
function updateCartItem(productId, quantity, price) {
    const cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
    const itemIndex = cart.items.findIndex(
        (item) => item.product === productId
    );

    if (itemIndex !== -1) {
        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1); // Xóa nếu số lượng ≤ 0
        } else {
            cart.items[itemIndex].quantity = quantity; // Cập nhật số lượng
        }
    } else if (quantity > 0) {
        cart.items.push({ product: productId, quantity, price }); // Thêm mới
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    updateOrderSummary(); // Thêm dòng này để cập nhật tổng tiền
}

function getCurrentUserId() {
    return localStorage.getItem('userId');
}

// Hàm xóa sản phẩm khỏi giỏ hàng
function removeFromCart(productId) {
    updateCartItem(productId, 0);
}

// Hàm cập nhật tổng tiền
function updateOrderSummary() {
    const cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
    const subtotal = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
    const shippingFee = subtotal > 500000 ? 0 : 30000;
    const total = subtotal + shippingFee;

    // Cập nhật DOM - phiên bản tương thích
    const subtotalEl = document.querySelector('.subtotal');
    const shippingFeeEl = document.querySelector('.shipping-fee');
    const grandTotalEl = document.querySelector('.grand-total');

    if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString() + '₫';
    if (shippingFeeEl)
        shippingFeeEl.textContent = shippingFee.toLocaleString() + '₫';
    if (grandTotalEl) grandTotalEl.textContent = total.toLocaleString() + '₫';
}

// Hàm cập nhật giao diện
function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
        cartCount.textContent = cart.items.reduce(
            (sum, item) => sum + item.quantity,
            0
        );
    }
}

// Lấy data attribute từ phần tử gần nhất
const getClosestData = (el, attr) =>
    el.closest(`[${attr}]`)?.getAttribute(attr);

// Lấy thông tin sản phẩm từ phần tử (ID + giá)
const getProductData = (element) => ({
    id: getClosestData(element, 'data-product-id'),
    price: parseFloat(getClosestData(element, 'data-price')),
});

// Cập nhật số lượng sản phẩm và đồng bộ UI
const updateCartQuantity = (element, newQuantity) => {
    const { id, price } = getProductData(element);
    const row = element.closest('tr');

    updateCartItem(id, newQuantity, price); // Hàm có sẵn của bạn
    updateProductTotalUI(row, price, newQuantity);
    updateOrderSummary(); // Hàm có sẵn của bạn
};

const updateProductTotalUI = (row, price, quantity) => {
    console.log('Updating UI:', { row, price, quantity }); // Debug
    const totalEl = row?.querySelector('.total-price');
    if (totalEl) {
        totalEl.textContent = (price * quantity).toLocaleString() + '₫';
    } else {
        console.error('Không tìm thấy .total-price trong row:', row); // Debug lỗi
    }
};

// Xóa sản phẩm khỏi giỏ hàng
const removeCartItem = (element) => {
    const productId = getClosestData(element, 'data-product-id');
    removeFromCart(productId); // Hàm có sẵn của bạn
    element.closest('tr').remove();
    updateOrderSummary();
};

// Xóa toàn bộ giỏ hàng
const clearCart = () => {
    localStorage.setItem('cart', JSON.stringify({ items: [] }));
    updateCartUI();
    updateOrderSummary();
};

function handleCartEvents(e) {
    const input = e.target.closest('.quantity')?.querySelector('input');

    if (e.target.closest('.minus')) {
        if (parseInt(input.value) > 1) {
            input.value = parseInt(input.value) - 1;
            updateCartQuantity(e.target, parseInt(input.value));
        }
    } else if (e.target.closest('.plus')) {
        input.value = parseInt(input.value) + 1;
        updateCartQuantity(e.target, parseInt(input.value));
    } else if (e.target.closest('.remove-item')) {
        removeCartItem(e.target);
    } else if (e.target.id === 'clear-cart') {
        clearCart();
    }
}

function handleQuantityChange(e) {
    if (e.target.matches('.quantity input')) {
        const quantity = parseInt(e.target.value);
        quantity > 0
            ? updateCartQuantity(e.target, quantity)
            : (e.target.value = 1) && updateCartQuantity(e.target, 1);
    }
}

async function syncCartToServer() {
    const cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };

    if (checkAuthStatus()) {
        // Lọc bỏ sản phẩm có quantity <= 0 trước khi gửi lên server
        const validItems = cart.items.filter((item) => item.quantity > 0);

        const data = {
            userId: getCurrentUserId(),
            items: validItems.map((item) => ({
                productId: item.product,
                quantity: item.quantity,
                price: item.price,
            })),
        };

        try {
            const response = await fetch('/cart/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`);

            console.log('Cart synced successfully!');
            return true;
        } catch (error) {
            console.error('Failed to sync cart:', error);
            return false;
        }
    }
    return false;
}

// Khởi tạo khi tải trang
document.addEventListener('click', handleCartEvents);
document.addEventListener('change', handleQuantityChange);
