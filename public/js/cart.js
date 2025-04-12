// Hàm kiểm tra đăng nhập
async function isLoggedIn() {
    try {
        const response = await fetch('/auth/check', {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) return false;

        const data = await response.json();
        return data.isAuthenticated;
    } catch (error) {
        console.error('Lỗi kiểm tra đăng nhập:', error);
        return false;
    }
}

// Hàm thêm sản phẩm vào giỏ hàng
function addToCart(productId, quantity = 1) {
    if (!productId) return;

    // Nếu đã đăng nhập, gửi request đến server
    if (isLoggedIn()) {
        console.log('user add product to cart');

        fetch('/cart/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productId,
                quantity: quantity,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    showAlert('success', 'Đã thêm sản phẩm vào giỏ hàng');
                    updateCartCount(data.cartCount);
                }
            })
            .catch((error) => console.error('Error:', error));
    } else {
        console.log('not user add product to cart');

        // Nếu chưa đăng nhập, lưu vào localStorage
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find((item) => item.productId === productId);

        if (existingItem) {
            existingItem.quantity += parseInt(quantity);
        } else {
            cart.push({ productId: productId, quantity: parseInt(quantity) });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        showAlert('success', 'Đã thêm sản phẩm vào giỏ hàng');
        updateCartCount(cart.reduce((total, item) => total + item.quantity, 0));
    }
}

// Hàm cập nhật số lượng trên icon giỏ hàng
function updateCartCount(count) {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
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
function updateCartItem(productId, quantity) {
    if (isLoggedIn()) {
        // Lưu thay đổi vào hàng đợi, chưa gửi lên server ngay
        pendingCartUpdates.push({ productId, quantity });

        // Cập nhật giao diện ngay lập tức
        updateCartUI();
    } else {
        // Xử lý cho khách (giữ nguyên)
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const itemIndex = cart.findIndex(
            (item) => item.productId === productId
        );

        if (itemIndex !== -1) {
            cart[itemIndex].quantity = parseInt(quantity);
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
        }
    }
}

// Hàm xóa sản phẩm khỏi giỏ hàng
async function removeFromCart(productId) {
    if (isLoggedIn()) {
        // Đánh dấu sản phẩm cần xóa
        pendingCartUpdates.push({ productId, action: 'remove' });

        // Cập nhật giao diện ngay
        updateCartUI();
    } else {
        // Xử lý cho khách (giữ nguyên)
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart = cart.filter((item) => item.product.id !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
    }
}

// Hàm xóa toàn bộ giỏ hàng
function clearCart() {

    if (isLoggedIn()) {
        fetch('/cart/checkout', {
            method: 'DELETE',
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    location.reload();
                }
            });
    } else {
        localStorage.removeItem('cart');
        updateCartUI();
        location.reload();
    }
}

// Hàm cập nhật giao diện giỏ hàng
function updateCartUI() {
    // Có thể thêm logic cập nhật UI mà không cần reload nếu cần
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const cart = getCurrentCartState();
        cartCount.textContent = cart.reduce(
            (total, item) => total + item.quantity,
            0
        );
    }
}


// Khi trang tải xong, cập nhật số lượng giỏ hàng
document.addEventListener('DOMContentLoaded', function () {
    if (isLoggedIn()) {
        // Nếu đã đăng nhập, lấy số lượng từ server
        fetch('/cart/cart-count')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    updateCartCount(data.count);
                }
            });
    } else {
        // Nếu chưa đăng nhập, lấy từ localStorage
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        updateCartCount(cart.reduce((total, item) => total + item.quantity, 0));
    }
});

// Xử lý tất cả sự kiện bằng Event Delegation
document.addEventListener('click', function (event) {
    const target = event.target;

    // Xử lý giảm số lượng
    if (target.classList.contains('minus')) {
        const productId = target.getAttribute('data-product-id');
        const input = target.nextElementSibling;
        if (parseInt(input.value) > 1) {
            input.value = parseInt(input.value) - 1;
            updateCartItem(productId, input.value);
        }
    }

    // Xử lý tăng số lượng
    else if (target.classList.contains('plus')) {
        const productId = target.getAttribute('data-product-id');
        const input = target.previousElementSibling;
        input.value = parseInt(input.value) + 1;
        updateCartItem(productId, input.value);
    }

    // Xử lý xóa sản phẩm
    else if (target.classList.contains('remove-item')) {
        const productId = target.getAttribute('data-product-id');
        removeFromCart(productId);
    }

    // Xử lý xóa giỏ hàng
    else if (target.id === 'clear-cart') {
        clearCart();
    }
});

// Xử lý thay đổi số lượng từ input
document.addEventListener('change', function (event) {
    if (event.target.matches('.quantity input')) {
        const productId = event.target.getAttribute('data-product-id');
        updateCartItem(productId, event.target.value);
    }
});
