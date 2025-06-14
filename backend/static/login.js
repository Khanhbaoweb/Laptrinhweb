document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // Không cần kiểm tra sessionStorage nữa, backend sẽ xử lý session
    // Nếu người dùng truy cập login.html mà đã có session hợp lệ,
    // backend có thể chuyển hướng họ nếu muốn, hoặc frontend check sau khi login thành công.

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        loginError.textContent = ''; // Xóa lỗi cũ
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', { // Gọi API backend
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Đăng nhập thành công, backend đã thiết lập session cookie
                // Chuyển hướng đến trang chính (SPA shell)
                window.location.href = '/'; // Dấu '/' sẽ được backend phục vụ index.html
            } else {
                loginError.textContent = data.error || 'Lỗi đăng nhập không xác định.';
            }
        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            loginError.textContent = 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
        }
    });
});