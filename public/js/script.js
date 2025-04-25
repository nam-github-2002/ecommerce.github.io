setupGlobalEventListeners(); // Sự kiện delegation
checkAuthStatus(); // Kiểm tra đăng nhập
setupLoginForm(); // Form đăng nhập
updateCartUI();
updateOrderSummary();
mergeCartWithServer();

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

        setupGlobalEventListeners();
        mergeCartWithServer();
        setupLoginForm();
    } catch (error) {
        console.error('Failed to load content:', error);
    }
}

function showError(error) {
    const targetElement = document.getElementById(targetId);
    targetElement.innerHTML = `
        <div class="alert alert-danger">
            <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <div>
                    <h5 class="alert-heading mb-1">Đã xảy ra lỗi!</h5>
                    <p class="mb-0">${error.message}</p>
                </div>
            </div>
            <hr>
            <div class="d-flex justify-content-end">
                <button class="btn btn-sm btn-outline-primary" onclick="loadContent('${url}', '${targetId}')">
                    <i class="bi bi-arrow-clockwise me-1"></i> Thử lại
                </button>
            </div>
        </div>
    `;
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
        const response = await fetch('/auth/check-status', {
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
                    credentials: 'include',
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

                localStorage.setItem('userId', data.user._id);

                const localCart = JSON.parse(localStorage.getItem('cart')) || {
                    items: [],
                };

                if (localCart.items.length > 0) {
                    mergeCartWithServer();
                    showAlert('success', 'Đã đồng bộ giỏ hàng với tài khoản');
                }

                updateHeader(data.user);
                loadContent(data.redirectUrl || '/product');
                location.reload();
            } catch (error) {
                console.error('Login error:', error);
                alert('Đã xảy ra lỗi khi đăng nhập');
            }
        });
    }
}

// Hàm cập nhật header
async function updateHeader(user) {
    const authSection = document.querySelector('.col-md-6.text-end');

    if (user) {
        authSection.innerHTML = `
            <div class="dropdown d-inline-block">
                <a href="#" class="text-white dropdown-toggle" id="userDropdown" data-bs-toggle="dropdown">
                    <img src="${user.avatar.url}" alt="Avatar" class="rounded-circle" width="30" height="30">
                    <span class="ms-2">${user.name}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/user/me"><i class="fas fa-user me-2"></i>Hồ sơ</a></li>
                    <li><a class="dropdown-item" href="/order/getOrder"><i class="fas fa-shopping-bag me-2"></i>Đơn hàng</a></li>
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
        console.log('khong co user');
        authSection.innerHTML = `
            <a href="/auth/login" class="text-white me-3"><i class="fas fa-sign-in-alt"></i> Đăng nhập</a>
            <a href="/auth/register" class="text-white"><i class="fas fa-user-plus"></i> Đăng ký</a>
        `;

        // Hiển thị số lượng giỏ hàng từ localStorage nếu chưa đăng nhập
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const count = cart.items.reduce(
            (total, item) => total + (item.quantity || 1),
            0
        );
        updateCartCount(count);
    }
}

//Hàm xử lý sự kiện submit form
function handleFormSubmit(e) {
    const form = e.target;

    // Xử lý form bộ lọc
    if (form.matches('#filter-form')) {
        handleFilterForm(form);
        return;
    }

    // Xử lý form đăng ký
    if (form.matches('#register-form')) {
        handleRegisterForm();
        return;
    }
}

// Xử lý form bộ lọc
function handleFilterForm(form) {
    console.log('filter form clicked');
    const formData = new FormData(form);
    const params = new URLSearchParams(formData).toString();
    window.location.href = `?${params}`;
}

//Xử lý form đăng ký
async function handleRegisterForm() {
    const formData = document.getElementById('register-form');

    const name = formData.querySelector('#name').value;
    const email = formData.querySelector('#email').value;
    const password = formData.querySelector('#password').value;
    const confirmPassword = formData.querySelector('#confirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
    }

    if (password !== confirmPassword) {
        alert('Mật khẩu không khớp');
        return;
    }

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                password,
                confirmPassword,
            }),
        });

        const data = await response.json();
        console.log('Server response:', data);

        if (!response.ok) throw new Error(data.message || 'Đăng ký thất bại');

        loadContent(data.redirectUrl || '/product');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

function setupSearchForm() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    if (searchBtn && searchInput) {
        // Xử lý click nút tìm kiếm
        searchBtn.addEventListener('click', handleSearch);

        // Xử lý khi nhấn Enter trong ô input
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
}

function handleSearch() {
    const keyword = document.getElementById('search-input').value.trim();

    if (!keyword) {
        alert('Vui lòng nhập từ khóa tìm kiếm');
        return;
    }

    // Chuyển hướng với query parameter
    window.location.href = `/product?keyword=${encodeURIComponent(keyword)}`;

    // Hoặc dùng fetch nếu muốn tải kết quả không reload trang:
    /*
    fetch(`/api/products/search?keyword=${encodeURIComponent(keyword)}`)
        .then(response => response.json())
        .then(data => {
            // Hiển thị kết quả tìm kiếm
            displaySearchResults(data);
        });
    */
}

function initAddToCartBtn(e) {
    const addToCartBtn = e.target.closest('.add-to-cart');
    if (!addToCartBtn) return;

    e.preventDefault();

    const productId = addToCartBtn.dataset.productId;
    const price = addToCartBtn.dataset.price;

    // Kiểm tra xem có phần tử quantity cùng cấp không
    const quantityContainer = addToCartBtn.previousElementSibling;

    let quantity = 1; // Mặc định là 1

    if (quantityContainer && quantityContainer.classList.contains('quantity')) {
        // Nếu có quantity container
        const quantityInput = quantityContainer.querySelector('input');
        quantity = parseInt(quantityInput.value) || 1;

        // Validate số lượng
        const maxStock = parseInt(quantityInput.max) || Infinity;
        quantity = Math.min(Math.max(quantity, 1), maxStock);
    }

    addToCart(productId, quantity, price);
}

function setupGlobalEventListeners() {
    document.addEventListener('click', function (e) {
        let isCheckoutInitializing = false;
        const target = e.target.closest('a');

        if (!target) return;
        const href = target.getAttribute('href');

        // 1. Đăng nhập
        if (href === '/auth/login') {
            e.preventDefault();
            const currentUrl =
                window.location.pathname + window.location.search;
            loadContent(
                `/auth/login?redirect=${encodeURIComponent(currentUrl)}`
            );
            return;
        }

        // 2. Đăng ký
        else if (href === '/auth/register') {
            e.preventDefault();
            loadContent('/auth/register');
            return;
        }

        // 3. Sản phẩm
        else if (href === '/product') {
            loadContent('/product');
            return;
        }

        // 4. Giỏ hàng
        else if (href === '/cart/checkout') {
            e.preventDefault();
            updateCartUI();
            updateOrderSummary();
            checkAuthStatus()
                ? loadContent('/cart/checkout')
                : loadContent('/auth/login');
            return;
        }

        // 5. Đăng xuất
        else if (href === '/auth/logout') {
            e.preventDefault();
            localStorage.removeItem('userId');
            localStorage.removeItem('token');
            localStorage.removeItem('cart');
            loadContent('/auth/logout');
            window.location.reload(); // Sửa từ this.location.reload()
            return;
        }

        // 6. Thông tin khách hàng
        else if (href === '/user/me') {
            e.preventDefault();
            loadContent('/user/me');
            return;
        }

        // 7. Thanh toán
        else if (href === '/order/checkout') {
            e.preventDefault();
            initializeCheckout();
            return;
        }

        // 8. Hoá đơn
        else if (href === '/order/getOrder') {
            e.preventDefault();
            loadContent('/order/getOrder');
            return;
        }
    });

    document.addEventListener('click', function (e) {
        initAddToCartBtn(e);
    });

    document.addEventListener('click', handleCartEvents);
    document.addEventListener('change', handleQuantityChange);
}

// Gọi hàm setup khi trang tải xong
document.addEventListener('DOMContentLoaded', setupSearchForm);

document.addEventListener('DOMContentLoaded', mergeCartWithServer);

// Gắn sự kiện submit cho toàn bộ forms
document.addEventListener('submit', handleFormSubmit);

document.addEventListener('change', function (e) {
    // Xử lý sắp xếp
    if (e.target.matches('#sort-by')) {
        const url = new URL(window.location.href);
        url.searchParams.set('sort', e.target.value);
        window.location.href = url.toString();
    }
});
