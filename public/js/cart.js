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

function getCartFromStorage() {
    try {
        return JSON.parse(localStorage.getItem('cart')) || { items: [] };
    } catch (e) {
        console.error('Error parsing cart data:', e);
        return { items: [] };
    }
}

function saveCartToStorage(cart) {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (e) {
        console.error('Error saving cart data:', e);
    }
}

// Hàm thêm sản phẩm vào giỏ hàng
async function addToCart(productId, quantity = 1, price) {
    if (!productId) return;

    let cart = getCartFromStorage();

    // Kiểm tra và chuyển đổi kiểu dữ liệu
    quantity = parseInt(quantity) || 1;
    price = parseFloat(price) || 0;

    const existingItem = cart.items.find((item) => item.product === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.items.push({
            product: productId,
            quantity: quantity,
            price: price,
            addedAt: new Date().toISOString(),
        });
    }

    saveCartToStorage(cart);
    updateCartUI();
    showAlert('success', 'Đã thêm sản phẩm vào giỏ hàng');

    // Đồng bộ ngay lên server nếu đã đăng nhập
    if (await checkAuthStatus()) {
        mergeCartWithServer();
    }
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
async function mergeCartWithServer() {
    const localCart = getCartFromStorage();
    if (localCart.items.length === 0) return;
    console.log(localCart.items);
    try {
        const response = await fetch('/cart/merge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                credentials: 'include',
            },
            credentials: 'include',
            body: JSON.stringify({ items: localCart.items }),
        });

        const data = await response.json();
        console.log('Response after merge:', data);

        if (!response.ok) {
            throw new Error(
                data.message || `HTTP error! status: ${response.status}`
            );
        }

        if (data.success) {
            updateCartUI(data.count);
            showAlert('success', 'Đã đồng bộ giỏ hàng với tài khoản');
        }
    } catch (error) {
        console.error('Merge cart failed:', error);
        showAlert('danger', error.message || 'Đồng bộ giỏ hàng thất bại');
    }
}

function updateCartItem(productId, quantity, price) {
    let cart = getCartFromStorage();

    const itemIndex = cart.items.findIndex(
        (item) => item.product === productId.trim()
    );

    if (itemIndex !== -1) {
        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex] = {
                ...cart.items[itemIndex],
                quantity: Math.max(1, quantity),
                price: String(price),
            };
        }
    } else if (quantity > 0) {
        cart.items.push({
            product: String(productId).trim(),
            quantity: Math.max(1, quantity),
            price: String(price),
        });
    }

    saveCartToStorage(cart);
    updateCartUI();
    updateOrderSummary();
}

function getCurrentUserId() {
    return localStorage.getItem('userId');
}

// Hàm xóa sản phẩm khỏi giỏ hàng
async function removeFromCart(productId) {
    try {
        await fetch(`/cart/deleteItem/${productId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        })
            .then(async (response) => {
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.message ||
                            `HTTP error! status: ${response.status}`
                    );
                }
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    console.log('cart sau khi xoá: ', data.cart);
                    saveCartToStorage(data.cart);
                    updateCartUI(data.count);
                    updateOrderSummary();
                    showAlert('success', 'Đã đồng bộ giỏ hàng với tài khoản');
                }
            })
            .catch((error) => {
                console.error('Delete item failed:', error);
                showAlert('danger', error.message || 'Xoá sản phẩm thất bại');
            });
    } catch (err) {
        console.log(err);
    }
    updateCartItem(productId, 0);
}

function updateOrderSummary() {
    // Lấy giỏ hàng với kiểm tra lỗi
    let cart = getCartFromStorage();

    // Tính toán tổng tiền
    const subtotal = cart.items.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQty = parseInt(item.quantity) || 0;
        return sum + itemPrice * itemQty;
    }, 0);

    // Tính phí vận chuyển
    const shippingFee = subtotal > 500000 ? 0 : 30000;
    const total = subtotal + shippingFee;

    // Cập nhật UI
    const formatVND = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
    };

    updateElement('.subtotal', subtotal);
    updateElement('.shipping-fee', shippingFee);
    updateElement('.grand-total', total);
}

// 4. Format currency (VND)
function formatCurrency(amount) {
    return (
        new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        })
            .format(amount)
            .replace('₫', '') + '₫'
    );
}

// 5. Update DOM elements safely
function updateElement(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = formatCurrency(value);
}

// Hàm cập nhật giao diện
function updateCartUI() {
    const cart = getCartFromStorage();
    const cartCount = document.getElementById('cart-count');

    if (cartCount) {
        cartCount.textContent = cart.items.reduce(
            (total, item) => total + (parseInt(item.quantity) || 0),
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
function updateCartQuantity(element, newQuantity) {
    const { id, price } = getProductData(element);
    const row = element.closest('tr');

    updateCartItem(id, newQuantity, price);
    updateProductTotalUI(row, price, newQuantity);
}

function updateProductTotalUI(row, price, quantity) {
    const totalEl = row?.querySelector('.total-price');
    if (totalEl) {
        totalEl.textContent = (price * quantity).toLocaleString() + '₫';
    } else {
        console.error('Không tìm thấy .total-price trong row:', row); // Debug lỗi
    }
}

// Xóa sản phẩm khỏi giỏ hàng
function removeCartItem(element) {
    const productId = getClosestData(element, 'data-product-id');
    removeFromCart(productId); // Hàm có sẵn của bạn
    element.closest('tr').remove();
    updateOrderSummary();
}

// Xóa toàn bộ giỏ hàng
async function clearCart() {
    try {
        const response = await fetch('/cart/checkout', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                credentials: 'include',
            },
            credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || `HTTP error! status: ${response.status}`
            );
        }

        if (data.success) {
            localStorage.removeItem('cart');
            updateCartUI(data.count);
            updateOrderSummary();
            location.reload();
            showAlert('success', 'Đã xoá giỏ hàng');
        }
    } catch (error) {
        console.error('Delete cart failed:', error);
        showAlert('danger', error.message || 'Xoá giỏ hàng thất bại');
    }
}

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
    let cart;
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
    } catch (e) {
        console.error('Error parsing cart data:', e);
        cart = { items: [] };
    }

    if (checkAuthStatus()) {
        const validItems = cart.items.filter((item) => item.quantity > 0);

        const data = {
            userId: getCurrentUserId(),
            items: validItems.map((item) => ({
                product: item.product,
                quantity: Number(item.quantity), // Đảm bảo là number
                price: item.price,
            })),
        };

        console.log('Sending to server:', {
            items: cart.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
            })),
        });

        try {
            const response = await fetch('/cart/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            console.log('Server response:', result);
            return true;
        } catch (error) {
            console.error('Sync failed:', error);
            return false;
        }
    }
    return false;
}

// Hàm cập nhật số lượng trên icon giỏ hàng
function updateCartCount(count) {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
}
