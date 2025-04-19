async function loadContent(url, targetId = 'dynamic-content') {
    try {
        // Show loading state
        document.getElementById(targetId).innerHTML =
            '<div class="loading">Loading...</div>';

        // Request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(url, {
            credentials: 'include',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle HTTP errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `HTTP error! status: ${response.status}` +
                    (errorData.message ? ` - ${errorData.message}` : '')
            );
        }

        // Process response
        const html = await response.text();
        const parser = new DOMParser();
        const responseDoc = parser.parseFromString(html, 'text/html');

        // Check for server-side errors in the response
        const errorElement = responseDoc.querySelector(
            '.error-message, .server-error'
        );
        if (errorElement) {
            throw new Error(`Server error: ${errorElement.textContent.trim()}`);
        }

        // Update content
        const targetElement = document.getElementById(targetId);
        if (responseDoc.getElementsByTagName('header').length > 0) {
            const sourceElement = responseDoc.getElementById(targetId);
            if (sourceElement) {
                targetElement.innerHTML = sourceElement.innerHTML;
            } else {
                throw new Error(
                    `Target element #${targetId} not found in response`
                );
            }
        } else {
            targetElement.innerHTML = html;
        }

        if (checkAuthStatus()) {
            console.log('da dang nhap');
            mergeCartWithServer();
        } else {
            console.log('chua dang nhap');
            setupLoginForm();
        }

        setupGlobalEventListeners();
    } catch (error) {
        console.error('Failed to load content:', error);

        // Show user-friendly error message
        const errorMessage =
            error.name === 'AbortError'
                ? 'Request timed out. Please try again.'
                : `Failed to load content: ${error.message}`;

        document.getElementById(targetId).innerHTML = `
            <div class="error-message">
                ${errorMessage}
                <button onclick="loadContent('${url}', '${targetId}')">Retry</button>
            </div>
        `;
    }
}

// Hàm getCookie giống với localStorage.getItem
function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return null; // Trả về null nếu không tìm thấy, giống localStorage
}

//Hàm kiểm tra trạng thái đăng nhập
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/check', {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.isAuthenticated && data.user) {
            updateHeader(data.user);
            return data.user;
        } else {
            // Xử lý khi không đăng nhập
            updateHeader(null);
            return null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        updateHeader(null);
        return null;
    }
}

// Hàm gắn sự kiện cho form đăng nhập
function setupLoginForm() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async function (e) {
            const redirectUrl =
                window.location.pathname + window.location.search;

            const loginForm = document.getElementById('login-form');
            const email = loginForm.querySelector('#email').value;
            const password = loginForm.querySelector('#password').value;
            const remember = loginForm.querySelector('#remember').checked;

            if (!email || !password) {
                alert('Vui lòng nhập đầy đủ email và mật khẩu');
                return;
            }

            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        password,
                        remember,
                        redirectUrl,
                    }),
                });

                const data = await response.json();

                if (!data.success) {
                    alert(data.message || 'Đăng nhập thất bại');
                    return;
                }

                localStorage.setItem('userId', data.currentUser._id);
                localStorage.setItem('jwt', data.token);

                const localCart = JSON.parse(localStorage.getItem('cart')) || {
                    items: [],
                };

                if (localCart.items.length > 0) mergeCartWithServer();

                updateHeader(data.currentUser);
                loadContent(data.redirectUrl || '/product');
                location.reload();
            } catch (error) {
                console.error('Login error:', error);
                alert('Đã xảy ra lỗi khi đăng nhập');
            }
        });
    }
}

// Hàm cập nhật số lượng trên icon giỏ hàng
function updateCartCount(count) {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
}

// Hàm cập nhật header
async function updateHeader(user) {
    const authSection = document.querySelector('.col-md-6.text-end');

    if (user) {
        authSection.innerHTML = `
            <div class="dropdown d-inline-block">
                <a href="#" class="text-white dropdown-toggle" id="userDropdown" data-bs-toggle="dropdown">
                    <img src="${user.avatar.url}" alt="Avatar" class="rounded-circle" width="30">
                    <span class="ms-2">${user.name}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/user/me"><i class="fas fa-user me-2"></i>Hồ sơ</a></li>
                    <li><a class="dropdown-item" href="/orders"><i class="fas fa-shopping-bag me-2"></i>Đơn hàng</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="/auth/logout"><i class="fas fa-sign-out-alt me-2"></i>Đăng xuất</a></li>
                </ul>
            </div>
        `;

        // Khởi tạo lại dropdown của Bootstrap
        new bootstrap.Dropdown(document.getElementById('userDropdown'));

        // Gọi API lấy số lượng giỏ hàng nếu user đã đăng nhập
        try {
            const response = await fetch('/cart/cart-count');
            if (response.ok) {
                const data = await response.json();
                updateCartCount(data.count);
            }
        } catch (error) {
            console.error('Lỗi khi lấy số lượng giỏ hàng:', error);
        }
    } else {
        authSection.innerHTML = `
            <a href="/auth/login" class="text-white me-3"><i class="fas fa-sign-in-alt"></i> Đăng nhập</a>
            <a href="/auth/register" class="text-white"><i class="fas fa-user-plus"></i> Đăng ký</a>
        `;

        // Hiển thị số lượng giỏ hàng từ localStorage nếu chưa đăng nhập
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const count = cart.reduce(
            (total, item) => total + (item.quantity || 1),
            0
        );
        updateCartCount(count);
    }
}

document.addEventListener('change', function (e) {
    // Xử lý sắp xếp
    if (e.target.matches('#sort-by')) {
        const url = new URL(window.location.href);
        url.searchParams.set('sort', e.target.value);
        window.location.href = url.toString();
    }
});

document.addEventListener('submit', function (e) {
    // Xử lý bộ lọc
    if (e.target.matches('#filter-form')) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const params = new URLSearchParams(formData).toString();
        window.location.href = `?${params}`;
    }
});

document.addEventListener('DOMContentLoaded', function () {
    setupGlobalEventListeners(); // Sự kiện delegation
    checkAuthStatus(); // Kiểm tra đăng nhập
    setupLoginForm(); // Form đăng nhập
    updateCartUI();
    updateOrderSummary();
    mergeCartWithServer();
});

function setupGlobalEventListeners() {
    // 1. Xử lý tất cả click events bằng delegation
    document.addEventListener('click', function (e) {
        const target = e.target.closest('a'); // Kiểm tra thẻ <a> được click

        if (!target) return; // Nếu không phải thẻ <a> thì bỏ qua

        // 2. Xử lý nút Đăng nhập
        if (target.matches('a[href="/auth/login"]')) {
            e.preventDefault();
            const currentUrl =
                window.location.pathname + window.location.search;
            loadContent(
                `/auth/login?redirect=${encodeURIComponent(currentUrl)}`
            );
        }

        // 3. Xử lý nút Đăng ký
        else if (target.matches('a[href="/auth/register"]')) {
            e.preventDefault();
            loadContent('/auth/register');
        }

        // 4. Xử lý nút Sản phẩm
        else if (target.matches('a[href="/products"]')) {
            e.preventDefault();
            loadContent('/products/list');
        }

        // 5. Xử lý nút Giỏ hàng
        else if (target.matches('a[href="/cart/checkout"]')) {
            e.preventDefault();
            loadContent('/cart/checkout');
        }

        //6. Đăng xuất
        else if (target.matches('a[href="/auth/logout"]')) {
            e.preventDefault();
            localStorage.removeItem('userId');
            localStorage.removeItem('jwt');
            let currentUrl = window.location.href;
            loadContent('/auth/logout');
            location.href = currentUrl;
        }

        //7. Thông tin khách hàng
        else if (target.matches('a[href="/user/me"]')) {
            e.preventDefault();
            loadContent('/user/me');
        }

        //8. Thanh toans
        else if (target.matches('a[href="/order/checkout"]')) {
            e.preventDefault();
            mergeCartWithServer();
            loadContent('/order/checkout');
            location.href = '/order/checkout';
        }

        //add to cart
        else if (e.target.closest('.add-to-cart')) {
            e.preventDefault();
            console.log('add to cart');
            const productId =
                e.target.closest('.add-to-cart').dataset.productId;
            const price = e.target.closest('.add-to-cart').dataset.price;
            addToCart(productId, 1, price);
        }

        document.addEventListener('click', handleCartEvents);
        document.addEventListener('change', handleQuantityChange);
    });
}
