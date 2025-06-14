// backend/static/xuatkho.js
function initXuatkhoPage() {
    console.log("Khởi tạo trang Xuất Kho...");
    const formXuatKho = document.getElementById('form-xuat-kho');
    const productSelect = document.getElementById('xuat-san-pham');
    const quantityInput = document.getElementById('xuat-so-luong');
    const stockQuantitySpan = document.getElementById('xuat-so-luong-ton');
    const priceSpan = document.getElementById('xuat-gia-ban');
    const notificationDivId = 'thong-bao-xuat-kho'; // Đảm bảo ID này tồn tại trong xuatkho_content.html
    const xuatKhoButton = formXuatKho ? formXuatKho.querySelector('button[type="submit"]') : null;
    const formErrorDiv = document.getElementById('xuat-kho-form-error'); // Div lỗi cụ thể trong form

    if (!formXuatKho || !productSelect || !quantityInput || !stockQuantitySpan || !priceSpan || !xuatKhoButton || !formErrorDiv) {
        console.error("Một hoặc nhiều phần tử DOM trên trang Xuất Kho không tìm thấy!");
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi tải giao diện trang Xuất Kho.", "danger");
        return;
    }
    console.log("Các phần tử chính của trang Xuất Kho đã được tìm thấy.");

    let availableProducts = []; // Lưu trữ danh sách sản phẩm có thể xuất

    async function loadProductsForExport() {
        productSelect.innerHTML = '<option value="">-- Đang tải danh sách sản phẩm... --</option>';
        productSelect.disabled = true;
        xuatKhoButton.disabled = true;
        stockQuantitySpan.textContent = "Đang tải...";
        priceSpan.textContent = "Đang tải...";
        quantityInput.value = '1';
        quantityInput.disabled = true;

        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Đang tải danh sách sản phẩm...", "info", 10000);

        try {
            const response = await fetch('/api/products/all_for_export');
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({ error: 'Lỗi không xác định từ server' }));
                throw new Error(`Lỗi ${response.status} từ server: ${errorData.error || response.statusText}`);
            }
            availableProducts = await response.json();
            productSelect.innerHTML = '<option value="">-- Chọn sản phẩm --</option>';
            
            if (availableProducts.length === 0) {
                productSelect.innerHTML = '<option value="">-- Không có sản phẩm để xuất --</option>';
                if(window.showPageNotification) window.showPageNotification(notificationDivId, "Không có sản phẩm nào có sẵn để xuất kho.", "info", 5000);
            } else {
                productSelect.disabled = false;
                xuatKhoButton.disabled = false;
                availableProducts.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.code;
                    option.textContent = `${product.name} (Mã: ${product.code}, Tồn: ${product.quantity})`;
                    productSelect.appendChild(option);
                });
                if(window.showPageNotification) window.showPageNotification(notificationDivId, `Đã tải ${availableProducts.length} sản phẩm có thể xuất.`, "success", 2000);
            }
            updateProductInfoDisplay(); // Cập nhật hiển thị sau khi tải xong
        } catch (error) {
            console.error("Lỗi tải sản phẩm để xuất:", error);
            productSelect.innerHTML = '<option value="">-- Lỗi tải danh sách --</option>';
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải danh sách sản phẩm: ${error.message}`, "danger");
        } finally {
            stockQuantitySpan.textContent = "N/A"; // Đặt lại trạng thái ban đầu
            priceSpan.textContent = "N/A";
        }
    }

    function updateProductInfoDisplay() {
        const selectedCode = productSelect.value;
        formErrorDiv.textContent = ''; // Xóa lỗi form cũ

        if (selectedCode && availableProducts.length > 0) {
            const selectedProduct = availableProducts.find(p => p.code === selectedCode);
            if (selectedProduct) {
                stockQuantitySpan.textContent = selectedProduct.quantity;
                priceSpan.textContent = new Intl.NumberFormat('vi-VN').format(selectedProduct.price);
                quantityInput.max = selectedProduct.quantity;
                quantityInput.disabled = false;
                quantityInput.value = '1'; // Đặt lại số lượng về 1 khi chọn sản phẩm mới
                xuatKhoButton.disabled = false; // Bật nút nếu có sản phẩm được chọn
            } else {
                stockQuantitySpan.textContent = "N/A";
                priceSpan.textContent = "N/A";
                quantityInput.max = null;
                quantityInput.value = '1';
                quantityInput.disabled = true;
                xuatKhoButton.disabled = true; // Vô hiệu hóa nếu không tìm thấy sản phẩm
            }
        } else {
            stockQuantitySpan.textContent = "N/A";
            priceSpan.textContent = "N/A";
            quantityInput.value = '1';
            quantityInput.max = null;
            quantityInput.disabled = true;
            xuatKhoButton.disabled = true; // Vô hiệu hóa nếu không có sản phẩm được chọn
        }
    }

    // Hàm validation phía client cho form xuất kho
    function validateExportForm() {
        formErrorDiv.textContent = ''; // Xóa lỗi cũ
        let isValid = true;

        const productCode = productSelect.value;
        const quantity = parseInt(quantityInput.value, 10);
        const currentStock = parseInt(stockQuantitySpan.textContent, 10); // Lấy số lượng tồn hiện tại

        if (!productCode) {
            formErrorDiv.textContent = "Vui lòng chọn sản phẩm để xuất.";
            productSelect.focus();
            isValid = false;
        } else if (isNaN(quantity) || quantity <= 0) {
            formErrorDiv.textContent = "Số lượng xuất phải là số nguyên dương.";
            quantityInput.focus();
            isValid = false;
        } else if (isNaN(currentStock) || quantity > currentStock) {
            formErrorDiv.textContent = `Số lượng xuất (${quantity}) vượt quá số lượng tồn kho (${currentStock}).`;
            quantityInput.focus();
            isValid = false;
        }
        return isValid;
    }

    productSelect.addEventListener('change', updateProductInfoDisplay);

    formXuatKho.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        if (!validateExportForm()) {
            if(window.showPageNotification) window.showPageNotification(notificationDivId, "Vui lòng kiểm tra lại thông tin xuất kho.", "warning");
            return;
        }

        const productCode = productSelect.value;
        const quantity = parseInt(quantityInput.value, 10);

        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Đang xử lý xuất kho...", "info", 10000);

        xuatKhoButton.disabled = true;
        xuatKhoButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xuất...';

        try {
            const response = await fetch('/api/products/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: productCode, quantity: quantity })
            });
            const result = await response.json();
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorMessage = result.error || `Lỗi ${response.status} từ server: ${response.statusText}`;
                formErrorDiv.textContent = errorMessage; // Hiển thị lỗi từ server trên form
                if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi xuất kho: ${errorMessage}`, "danger");
                throw new Error(errorMessage);
            }
            if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || "Xuất kho thành công!", "success");
            
            // Cập nhật lại số lượng tồn trong availableProducts và hiển thị
            const selectedProduct = availableProducts.find(p => p.code === productCode);
            if(selectedProduct){
                selectedProduct.quantity -= quantity; // Giảm số lượng trong mảng tạm
            }
            formXuatKho.reset(); // Reset form
            loadProductsForExport(); // Tải lại danh sách sản phẩm để cập nhật số lượng tồn

        } catch (error) {
            console.error("Lỗi khi xuất kho:", error);
            // Lỗi đã được hiển thị qua formErrorDiv hoặc showPageNotification
        } finally {
            xuatKhoButton.disabled = false;
            xuatKhoButton.innerHTML = '<i class="bi bi-box-arrow-up me-2"></i>Xuất Kho';
        }
    });

    loadProductsForExport();
    updateProductInfoDisplay(); // Gọi lần đầu để thiết lập trạng thái ban đầu
    console.log("Khởi tạo trang Xuất Kho hoàn tất.");
}