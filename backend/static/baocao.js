// backend/static/baocao.js
function initBaocaoPage() {
    console.log("Khởi tạo trang Báo Cáo...");
    const notificationDivId = 'thong-bao-baocao'; // Đảm bảo ID này tồn tại trong baocao_content.html
    const totalInventoryValueEl = document.getElementById('total-inventory-value');

    const importExportChartCanvas = document.getElementById('importExportChart');
    const topProductsChartCanvas = document.getElementById('topProductsChart');
    let importExportChartInstance = null;
    let topProductsChartInstance = null;

    if (!totalInventoryValueEl) {
        console.warn("Phần tử #total-inventory-value không tìm thấy trên trang Báo Cáo.");
    }
    if (!importExportChartCanvas) {
        console.warn("Canvas #importExportChart không tìm thấy.");
    }
    if (!topProductsChartCanvas) {
        console.warn("Canvas #topProductsChart không tìm thấy.");
    }

    async function fetchTotalInventoryValue() {
        if (!totalInventoryValueEl) return;
        totalInventoryValueEl.textContent = "Đang tính toán...";
        try {
            // Đã cải tiến: Gọi API thực tế
            const response = await fetch('/api/reports/total_inventory_value');
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({error: 'Lỗi không xác định từ server'}));
                throw new Error(`Lỗi ${response.status}: ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            // Định dạng giá trị tiền tệ
            totalInventoryValueEl.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.total_value || 0);
            if(window.showPageNotification) window.showPageNotification(notificationDivId, "Đã tải tổng giá trị tồn kho.", "success", 2000);

        } catch (error) {
            console.error("Lỗi tải tổng giá trị tồn kho:", error);
            totalInventoryValueEl.textContent = "Lỗi tải dữ liệu";
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải báo cáo: ${error.message}`, "danger");
        }
    }

    async function fetchImportExportSummary() {
        if (!importExportChartCanvas) return;
        try {
            // Đã cải tiến: Gọi API thực tế
            const response = await fetch('/api/reports/import_export_summary');
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({error: 'Lỗi không xác định từ server'}));
                throw new Error(`Lỗi ${response.status}: ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            return data.summary || [];
        } catch (error) {
            console.error("Lỗi tải dữ liệu nhập xuất theo tháng:", error);
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải biểu đồ nhập xuất: ${error.message}`, "danger");
            return [];
        }
    }

    async function fetchTopProducts() {
        if (!topProductsChartCanvas) return;
        try {
            // Đã cải tiến: Gọi API thực tế
            const response = await fetch('/api/reports/top_products_by_quantity');
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({error: 'Lỗi không xác định từ server'}));
                throw new Error(`Lỗi ${response.status}: ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            return data.top_products || [];
        } catch (error) {
            console.error("Lỗi tải dữ liệu top sản phẩm:", error);
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải biểu đồ top sản phẩm: ${error.message}`, "danger");
            return [];
        }
    }

    async function initializeCharts() {
        if (importExportChartInstance) importExportChartInstance.destroy();
        if (topProductsChartInstance) topProductsChartInstance.destroy();

        if (typeof Chart === 'undefined') {
            console.warn("Chart.js chưa được tải. Biểu đồ sẽ không hiển thị.");
            if(window.showPageNotification) window.showPageNotification(notificationDivId, "Thư viện biểu đồ chưa sẵn sàng. Không thể vẽ biểu đồ.", "warning");
            // Ẩn canvas hoặc hiển thị thông báo thay thế
            if(importExportChartCanvas) importExportChartCanvas.style.display = 'none';
            if(topProductsChartCanvas) topProductsChartCanvas.style.display = 'none';

            // Tìm các card body và chèn thông báo
            const ieChartCardBody = importExportChartCanvas ? importExportChartCanvas.closest('.card-body') : null;
            if(ieChartCardBody && !ieChartCardBody.querySelector('.chart-placeholder-msg')) {
                ieChartCardBody.innerHTML = '<p class="text-muted text-center chart-placeholder-msg">Không thể hiển thị biểu đồ (thư viện chưa tải).</p>';
            }
            const tpChartCardBody = topProductsChartCanvas ? topProductsChartCanvas.closest('.card-body') : null;
            if(tpChartCardBody && !tpChartCardBody.querySelector('.chart-placeholder-msg')) {
                tpChartCardBody.innerHTML = '<p class="text-muted text-center chart-placeholder-msg">Không thể hiển thị biểu đồ (thư viện chưa tải).</p>';
            }
            return;
        }

        // Fetch dữ liệu cho biểu đồ Nhập/Xuất
        const importExportRawData = await fetchImportExportSummary();
        const importExportLabels = importExportRawData.map(item => item.month);
        const importData = importExportRawData.map(item => item.imports);
        const exportData = importExportRawData.map(item => item.exports);

        if (importExportChartCanvas) {
            const importExportData = {
                labels: importExportLabels,
                datasets: [
                    { label: 'Nhập', data: importData, borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.5)', fill: true, tension: 0.2 }, // Tension mượt hơn
                    { label: 'Xuất', data: exportData, borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', fill: true, tension: 0.2 }
                ]
            };
            importExportChartInstance = new Chart(importExportChartCanvas, {
                type: 'line', data: importExportData, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }

        // Fetch dữ liệu cho biểu đồ Top Sản phẩm
        const topProductsRawData = await fetchTopProducts();
        const topProductLabels = topProductsRawData.map(item => item.name);
        const topProductQuantities = topProductsRawData.map(item => item.quantity);

        if (topProductsChartCanvas) {
            const topProductsData = {
                labels: topProductLabels,
                datasets: [{
                    label: 'SL Tồn', data: topProductQuantities,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                    borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                    borderWidth: 1
                }]
            };
             topProductsChartInstance = new Chart(topProductsChartCanvas, {
                type: 'bar', data: topProductsData, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } }
            });
        }
    }

    fetchTotalInventoryValue();
    initializeCharts(); // Bây giờ gọi hàm này để fetch dữ liệu thực tế
}