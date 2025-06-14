// backend/static/nhapkho.js
function initNhapkhoPage() {
    console.log("Khởi tạo trang Nhập Kho...");
    const formNhapKho = document.getElementById('form-nhap-kho');
    const notificationDivId = 'thong-bao-nhap-kho'; // ID cho div thông báo của trang
    const formErrorDiv = document.getElementById('nhap-kho-form-error'); // Thêm div hiển thị lỗi form cụ thể
    const submitButton = formNhapKho ? formNhapKho.querySelector('button[type="submit"]') : null;

    // Các trường input
    const maSpInput = document.getElementById('nhap-ma-san-pham');
    const tenSpInput = document.getElementById('nhap-ten-san-pham');
    const soLuongInput = document.getElementById('nhap-so-luong');
    const giaSpInput = document.getElementById('nhap-gia-san-pham');
    const hinhAnhInput = document.getElementById('nhap-hinh-anh-san-pham');

    if (!formNhapKho || !maSpInput || !tenSpInput || !soLuongInput || !giaSpInput || !formErrorDiv || !submitButton) {
        console.error("Lỗi cấu trúc trang Nhập Kho: một hoặc nhiều phần tử DOM cốt lõi không tìm thấy!");
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi cấu trúc trang: không tìm thấy form hoặc các trường nhập kho cần thiết.", "danger");
        else if(window.showGlobalNotification) window.showGlobalNotification("Lỗi cấu trúc trang Nhập Kho.", "danger");
        return;
    }
    console.log("Các phần tử chính của trang Nhập Kho đã được tìm thấy.");

    // Hàm validation phía client
    function validateForm() {
        formErrorDiv.textContent = ''; // Xóa lỗi cũ
        let isValid = true;

        const maSp = maSpInput.value.trim();
        const tenSp = tenSpInput.value.trim();
        const soLuong = parseInt(soLuongInput.value, 10);
        const giaSp = parseFloat(giaSpInput.value);
        const hinhAnh = hinhAnhInput.files[0];

        if (!maSp) {
            formErrorDiv.textContent = "Mã Sản Phẩm là bắt buộc.";
            maSpInput.focus();
            isValid = false;
        } else if (!tenSp) {
            formErrorDiv.textContent = "Tên Sản Phẩm là bắt buộc.";
            tenSpInput.focus();
            isValid = false;
        } else if (isNaN(soLuong) || soLuong <= 0) {
            formErrorDiv.textContent = "Số Lượng Nhập phải là số nguyên dương.";
            soLuongInput.focus();
            isValid = false;
        } else if (isNaN(giaSp) || giaSp < 0) {
            formErrorDiv.textContent = "Giá Nhập phải là số không âm.";
            giaSpInput.focus();
            isValid = false;
        } else if (hinhAnh) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            const maxSize = 16 * 1024 * 1024; // 16MB (phải khớp với backend)
            if (!allowedTypes.includes(hinhAnh.type)) {
                formErrorDiv.textContent = "Chỉ chấp nhận ảnh JPEG, PNG, GIF.";
                hinhAnhInput.focus();
                isValid = false;
            } else if (hinhAnh.size > maxSize) {
                formErrorDiv.textContent = `Kích thước ảnh quá lớn (tối đa ${maxSize / (1024 * 1024)}MB).`;
                hinhAnhInput.focus();
                isValid = false;
            }
        }

        return isValid;
    }


    formNhapKho.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        if (!validateForm()) {
            // Nếu form không hợp lệ, validateForm đã hiển thị lỗi
            if(window.showPageNotification) window.showPageNotification(notificationDivId, "Vui lòng kiểm tra lại thông tin nhập kho.", "warning");
            return;
        }

        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Đang xử lý nhập kho...", "info", 10000);
        
        submitButton.disabled = true; // Vô hiệu hóa nút submit
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';


        const formData = new FormData(this);

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorMessage = result.error || `Lỗi ${response.status} từ server: ${response.statusText}`;
                formErrorDiv.textContent = errorMessage; // Hiển thị lỗi từ server trên form
                if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi nhập kho: ${errorMessage}`, "danger");
                throw new Error(errorMessage); // Ném lỗi để bắt ở catch
            }

            if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || "Nhập kho thành công!", "success");
            this.reset();
            if (maSpInput) maSpInput.focus();

        } catch (error) {
            console.error('Lỗi khi nhập kho:', error);
            // Lỗi đã được hiển thị qua formErrorDiv hoặc showPageNotification ở trên
        } finally {
            submitButton.disabled = false; // Bật lại nút submit
            submitButton.innerHTML = '<i class="bi bi-box-arrow-in-down me-2"></i>Nhập Kho';
        }
    });
}