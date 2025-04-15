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

    // Lấy giỏ hàng với cấu trúc thống nhất { items: [] }
    let cart;
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
        if (!Array.isArray(cart.items)) cart.items = [];
    } catch (error) {
        cart = { items: [] };
    }

    // Tìm và cập nhật sản phẩm
    const existingItem = cart.items.find(
        (item) => item.productId === productId
    );

    if (existingItem) {
        existingItem.quantity += parseInt(quantity);
    } else {
        cart.items.push({
            productId: productId,
            quantity: parseInt(quantity),
            price: price,
        });
    }

    // Lưu lại và cập nhật UI
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    updateOrderSummary();
    showAlert('success', 'Đã thêm sản phẩm vào giỏ hàng');
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
    const localCart = JSON.parse(localStorage.getItem('cart')) || { items: [] };

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

function updateCartItem(productId, quantity, price) {
    // 1. Lấy giỏ hàng từ localStorage với kiểm tra lỗi
    let cart;
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
        // Đảm bảo items luôn là mảng
        if (!Array.isArray(cart.items)) cart.items = [];
    } catch (e) {
        cart = { items: [] };
    }

    // 2. Tìm index sản phẩm trong giỏ hàng
    const itemIndex = cart.items.findIndex(
        (item) => item.productId === productId.trim()
    );

    // 3. Xử lý cập nhật
    if (itemIndex !== -1) {
        // Sản phẩm đã tồn tại
        if (quantity <= 0) {
            // Xóa nếu số lượng ≤ 0
            cart.items.splice(itemIndex, 1);
        } else {
            // Cập nhật số lượng và giá (đảm bảo giá là số)
            cart.items[itemIndex] = {
                ...cart.items[itemIndex],
                quantity: Math.max(1, quantity), // Tối thiểu là 1
                price: String(price), // Giữ định dạng string như dữ liệu mẫu
            };
        }
    } else if (quantity > 0) {
        // Thêm sản phẩm mới (đúng cấu trúc như dữ liệu mẫu)
        cart.items.push({
            productId: String(productId).trim(),
            quantity: Math.max(1, quantity),
            price: String(price), // Giữ nguyên định dạng string
        });
    }

    // 4. Lưu lại vào localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    console.log(JSON.parse(localStorage.getItem('cart')));
    // 5. Cập nhật giao diện
    updateCartUI();
    updateOrderSummary();
}

function getCurrentUserId() {
    return localStorage.getItem('userId');
}

// Hàm xóa sản phẩm khỏi giỏ hàng
function removeFromCart(productId) {
    updateCartItem(productId, 0);
}

function updateOrderSummary() {
    // Lấy giỏ hàng với kiểm tra lỗi
    let cart;
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
    } catch (e) {
        cart = {items: []};
    }

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
    const cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
    const cartCount = document.getElementById('cart-count');

    if (cartCount) {
        cartCount.textContent = cart.items.reduce(
            (total, item) => total + (parseInt(item.quantity) || 0),
            0
        );
    }

    // Render danh sách sản phẩm trong giỏ hàng
    const cartItemsContainer = document.querySelector('.cart-items');
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = cart.items
            .map(
                (item) => `
            <div class="cart-item">
                <p>${item.productId}</p>
                <p>Số lượng: ${item.quantity}</p>
                <p>Giá: ${formatVND(item.price)}</p>
            </div>
        `
            )
            .join('');
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
function clearCart() {
    localStorage.setItem('cart', JSON.stringify({ items: [] }));
    updateCartUI();
    updateOrderSummary();
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
    
    console.log('Client cart before stringify:', cart);
    console.log('Client cart after stringify:', JSON.stringify(cart.items));


    if (checkAuthStatus()) {
        const validItems = cart.items.filter((item) => item.quantity > 0);

        const data = {
            userId: getCurrentUserId(),
            items: validItems.map((item) => ({
                productId: item.productId,
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

// Khởi tạo khi tải trang
document.addEventListener('click', handleCartEvents);
document.addEventListener('change', handleQuantityChange);
