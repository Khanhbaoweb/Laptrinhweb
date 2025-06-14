function initMainPage() {
    console.log("Khởi tạo trang Tổng Quan (Main)...");
    const notificationDivId = 'thong-bao-main'; // Đảm bảo ID này tồn tại trong tongquan_content.html

    const elements = {
        totalProducts: document.getElementById('tong-san-pham'),
        lowStockProducts: document.getElementById('sap-het-hang'),
        importsToday: document.getElementById('tong-nhap-hom-nay'),
        exportsToday: document.getElementById('tong-xuat-hom-nay'),
        lowStockTableBody: document.querySelector('#danh-sach-sap-het tbody')
    };

    // Kiem tra
    for (const key in elements) {
        if (!elements[key]) {
            console.error(`Phần tử DOM '${key}' trên trang Tổng Quan không tìm thấy!`);
            if (window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải giao diện trang Tổng Quan (thiếu phần tử ${key}).`, "danger");
            return; 
        } // bao loi
    }
    console.log("Các phần tử chính của trang Tổng Quan đã được tìm thấy.");


    async function fetchDashboardStats() {
        // Đặt trạng thái loading cho các thẻ thống kê
        elements.totalProducts.textContent = '...';
        elements.lowStockProducts.textContent = '...';
        elements.importsToday.textContent = '...';
        elements.exportsToday.textContent = '...';

        try {
            const response = await fetch('/api/dashboard_stats');
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({ error: 'Lỗi không xác định từ server' }));
                throw new Error(`Lỗi ${response.status}: ${errorData.error || response.statusText}`);
            }
            const stats = await response.json();

            elements.totalProducts.textContent = stats.total_products || 0;
            elements.lowStockProducts.textContent = stats.low_stock_products || 0;
            elements.importsToday.textContent = stats.imports_today || 0;
            elements.exportsToday.textContent = stats.exports_today || 0;
            
            if (window.showPageNotification) window.showPageNotification(notificationDivId, "Đã tải thông số tổng quan.", "success", 2000);

        } catch (error) {
            console.error('Lỗi tải thông số dashboard:', error);
            if (window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải thông số tổng quan: ${error.message}`, "danger");
            // Đặt lại các giá trị về lỗi nếu không tải được
            elements.totalProducts.textContent = 'Lỗi';
            elements.lowStockProducts.textContent = 'Lỗi';
            elements.importsToday.textContent = 'Lỗi';
            elements.exportsToday.textContent = 'Lỗi';
        }
    }

    async function fetchLowStockProducts() {
        // Đặt trạng thái loading cho bảng sản phẩm sắp hết hàng
        elements.lowStockTableBody.innerHTML = `<tr><td colspan="3" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div></td></tr>`;
        
        try {
            const response = await fetch('/api/low_stock_products_list?page=1&per_page=5');
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({ error: 'Lỗi không xác định từ server' }));
                throw new Error(`Lỗi ${response.status}: ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            
            elements.lowStockTableBody.innerHTML = ''; // Xóa các hàng cũ
            if (data.products && data.products.length > 0) {
                data.products.forEach(product => {
                    const row = elements.lowStockTableBody.insertRow();
                    row.insertCell().textContent = product.name;
                    row.insertCell().textContent = product.code;
                    row.insertCell().textContent = product.quantity;
                });
            } else {
                const row = elements.lowStockTableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 3;
                cell.textContent = 'Không có sản phẩm nào sắp hết hàng.';
                cell.classList.add('text-center', 'text-muted');
            }
        } catch (error) {
            console.error('Lỗi tải danh sách sản phẩm sắp hết hàng:', error);
            if (window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải SP sắp hết hàng: ${error.message}`, "warning");
            elements.lowStockTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>`;
        }
    }

    fetchDashboardStats();
    fetchLowStockProducts();
    console.log("Khởi tạo trang Tổng Quan hoàn tất.");
}