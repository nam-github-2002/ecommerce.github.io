/**
 * Khởi tạo và xử lý sự kiện cho form thanh toán
 */
function initCheckoutForm() {
    console.trace('initCheckoutForm được gọi từ đâu');
    console.log(
        'Số lượng form checkout trên trang:',
        document.querySelectorAll('#checkout-form').length
    );
    const checkoutForm = document.getElementById('checkout-form');
    let isSubmitting = false;

    if (!checkoutForm) {
        console.error('Không tìm thấy form với ID checkout-form');
        return;
    }

    checkoutForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (isSubmitting) return; // Nếu đang submit thì bỏ qua
        isSubmitting = true; // Đánh dấu đang submit
        console.log(isSubmitting);
        const submitBtn = document.querySelector(
            'button[type="submit"][form="checkout-form"]'
        );
        const isFormValid = validateCheckoutForm(checkoutForm);

        if (!isFormValid) {
            isSubmitting = false;
            return;
        }

        try {
            showLoading(submitBtn);

            const formData = getFormData(checkoutForm);
            const orderResult = await createOrder(formData);

            handleOrderResult(orderResult, submitBtn);
        } catch (error) {
            handleOrderError(error, submitBtn);
        } finally {
            isSubmitting = false; // Reset trạng thái submit
        }
    });
}
/**
 * Khởi tạo các sự kiện cho phương thức thanh toán
 */
function initPaymentMethodListeners() {
    const momoRadio = document.getElementById('momo');

    if (momoRadio) {
        momoRadio.addEventListener('change', function () {
            if (this.checked) {
                showMomoNotice();
            }
        });
    }
}

/**
 * Validate form thanh toán
 */
function validateCheckoutForm(form) {
    form.classList.add('was-validated');
    return form.checkValidity();
}

/**
 * Lấy dữ liệu từ form
 */
function getFormData(form) {
    return {
        name: form.querySelector('#name').value,
        email: form.querySelector('#email').value,
        address: form.querySelector('#address').value,
        city: form.querySelector('#city').value,
        postalCode: form.querySelector('#postalCode').value,
        country: form.querySelector('#country').value,
        phone: form.querySelector('#phone').value,
        paymentMethod: form.querySelector('input[name="paymentMethod"]:checked')
            .value,
    };
}

/**
 * Hiển thị trạng thái loading
 */
function showLoading(button) {
    const originalText = button.innerHTML;
    button.dataset.originalText = originalText; // Lưu lại text gốc
    button.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
    button.disabled = true;
}

/**
 * Reset trạng thái button
 */
function resetButton(button) {
    const originalText = button.dataset.originalText || 'Đặt hàng';
    button.innerHTML = originalText;
    button.disabled = false;
}

/**
 * Gửi request tạo đơn hàng đến server
 */
async function createOrder(orderData) {
    console.log('create order client-side');
    const response = await fetch('/order/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            credentials: 'include',
        },
        body: JSON.stringify(orderData),
    });
    return await response.json();
}

/**
 * Xử lý kết quả sau khi tạo đơn hàng
 */
function handleOrderResult(result, submitBtn) {
    if (result.success) {
        localStorage.removeItem('cart');
        // window.location.href = '/product'
    } else {
        alert(result.message || 'Đã xảy ra lỗi khi đặt hàng');
        resetButton(submitBtn, 'Đặt hàng');
    }
}

/**
 * Xử lý lỗi khi tạo đơn hàng
 */
function handleOrderError(error, submitBtn) {
    console.error('Order Error:', error);
    alert('Đã xảy ra lỗi khi kết nối đến server');
    resetButton(submitBtn, 'Đặt hàng');
}

/**
 * Hiển thị thông báo cho phương thức MoMo
 */
function showMomoNotice() {
    alert(
        'Bạn sẽ được chuyển hướng đến trang thanh toán MoMo sau khi đặt hàng'
    );
}
