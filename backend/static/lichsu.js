// backend/static/lichsu.js
function initLichsuPage() {
    console.log("Khởi tạo trang Lịch Sử Giao Dịch...");
    const transactionTableBody = document.querySelector('#danh-sach-giao-dich tbody');
    const paginationElementId = 'pagination-lichsu';
    const notificationDivId = 'thong-bao-lich-su'; // Đảm bảo ID này tồn tại trong lichsu_content.html
    const itemsPerPage = 15;

    if (!transactionTableBody) {
        console.error("Phần tử #danh-sach-giao-dich tbody không tìm thấy!");
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi tải giao diện trang Lịch Sử.", "danger");
        return;
    }

    async function fetchTransactions(page = 1) {
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Đang tải lịch sử giao dịch...", "info", 10000);
        // Thêm trạng thái loading cho bảng
        transactionTableBody.innerHTML = `<tr><td colspan="10" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div></td></tr>`;

        const url = `/api/transactions?page=${page}&per_page=${itemsPerPage}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({ error: 'Lỗi không xác định từ server' }));
                throw new Error(errorData.error || `Lỗi ${response.status}`);
            }
            const data = await response.json();
            renderTransactions(data.transactions);
            if (window.renderPagination) {
                window.renderPagination(data.current_page, data.total_pages, paginationElementId, fetchTransactions);
            }
            if(window.showPageNotification && data.transactions.length > 0) window.showPageNotification(notificationDivId, `Đã tải ${data.transactions.length} giao dịch.`, "success", 2000);
            else if (data.transactions.length === 0) window.showPageNotification(notificationDivId, 'Không có giao dịch nào để hiển thị.', 'info', 3000);
        } catch (error) {
            console.error('Lỗi tải lịch sử giao dịch:', error);
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải lịch sử: ${error.message}`, 'danger');
            transactionTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>`;
        }
    }

    function renderTransactions(transactions) {
        transactionTableBody.innerHTML = '';
        if (!transactions || transactions.length === 0) {
            transactionTableBody.innerHTML = '<tr><td colspan="10" class="text-center">Không có giao dịch nào.</td></tr>';
            return;
        }
        transactions.forEach(tx => {
            const row = transactionTableBody.insertRow();
            row.insertCell().textContent = tx.id;
            row.insertCell().innerHTML = tx.product_image_url ? `<img src="${tx.product_image_url}" alt="${tx.product_name || 'Sản phẩm'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : 'N/A';
            row.insertCell().textContent = tx.product_name || 'N/A';
            row.insertCell().textContent = tx.product_code || 'N/A';
            const typeCell = row.insertCell();
            if (tx.type === 'import') {
                typeCell.innerHTML = '<span class="badge bg-success">Nhập</span>';
            } else if (tx.type === 'export') {
                typeCell.innerHTML = '<span class="badge bg-danger">Xuất</span>';
            } else {
                typeCell.textContent = tx.type;
            }
            row.insertCell().textContent = tx.quantity;
            row.insertCell().textContent = tx.price_per_unit ? new Intl.NumberFormat('vi-VN').format(tx.price_per_unit) : 'N/A';
            row.insertCell().textContent = tx.transaction_date ? new Date(tx.transaction_date).toLocaleString('vi-VN') : 'N/A';
            row.insertCell().textContent = tx.description || '';

            const actionsCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
            deleteButton.title = "Xóa Giao Dịch";
            deleteButton.onclick = () => confirmDeleteTransaction(tx.id, tx.product_name, tx.quantity, tx.type); // Truyền thêm thông tin để xác nhận
            actionsCell.appendChild(deleteButton);
        });
    }

    async function confirmDeleteTransaction(transactionId, productName, quantity, type) {
        const actionText = type === 'import' ? `giảm ${quantity} của sản phẩm "${productName}"` : `tăng ${quantity} của sản phẩm "${productName}"`;
        if (confirm(`Bạn có chắc chắn muốn xóa giao dịch ID: ${transactionId} không? \nHành động này sẽ ${actionText} để hoàn tác số lượng tồn kho.`)) {
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Đang xóa giao dịch ID ${transactionId}...`, 'info', 10000);
            try {
                const response = await fetch(`/api/transactions/${transactionId}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; return; }
                    throw new Error(result.error || `Lỗi ${response.status}`);
                }
                // Thông báo cụ thể hơn sau khi xóa và hoàn tác
                if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || `Đã xóa giao dịch ID ${transactionId} và cập nhật tồn kho.`, 'success');
                
                const currentPageLink = document.querySelector(`#${paginationElementId} .page-item.active .page-link`);
                const currentPage = currentPageLink ? parseInt(currentPageLink.textContent) : 1;
                fetchTransactions(currentPage); // Tải lại danh sách sau khi xóa
            } catch (error) {
                console.error(`Lỗi xóa giao dịch ${transactionId}:`, error);
                if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi xóa giao dịch: ${error.message}`, 'danger');
            }
        }
    }

    fetchTransactions();
    console.log("Khởi tạo trang Lịch Sử Giao Dịch hoàn tất.");
}