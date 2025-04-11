// Hàm thêm sản phẩm vào giỏ hàng
function addToCart(productId, quantity = 1) {
    if (!productId) return;

    // Nếu đã đăng nhập, gửi request đến server
    if (isLoggedIn()) {
        fetch('/cart', {
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

// Hàm kiểm tra đăng nhập
function isLoggedIn() {
    return document.cookie.includes('jwt');
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
    }, 3000);
}

// Khi trang tải xong, cập nhật số lượng giỏ hàng
document.addEventListener('DOMContentLoaded', function () {
    if (isLoggedIn()) {
        // Nếu đã đăng nhập, lấy số lượng từ server
        fetch('/cart/count')
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

