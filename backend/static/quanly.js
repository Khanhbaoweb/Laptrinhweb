// backend/static/quanly.js
function initQuanlyPage() {
    console.log("Khởi tạo trang Quản Lý Hàng Hóa...");

    const searchInput = document.getElementById('tim-kiem-san-pham');
    const searchButton = document.getElementById('btn-tim-kiem-san-pham');
    const productTableBody = document.querySelector('#danh-sach-san-pham tbody');
    const paginationElementId = 'pagination-quanly';
    const notificationDivId = 'thong-bao-quan-ly';

    const editProductModalEl = document.getElementById('editProductModal');
    const editForm = document.getElementById('editProductForm');
    const editModalLabel = document.getElementById('editProductModalLabel'); // Label của modal
    const editFormErrorDiv = document.getElementById('edit-product-form-error'); // Div lỗi cụ thể trong form
    const editSaveButton = editProductModalEl ? editProductModalEl.querySelector('button[type="submit"]') : null;


    // Các input trong form sửa (sẽ lấy sau khi modal được mở để đảm bảo chúng tồn tại)
    let originalCodeInput, codeInput, nameInput, quantityInput, priceInput, imageInput, imagePreview, noImageText;


    if (!productTableBody) {
        console.error("Phần tử #danh-sach-san-pham tbody không tìm thấy!");
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi cấu trúc: Không tìm thấy bảng sản phẩm.", "danger");
        return;
    }
    if (!editProductModalEl || !editForm || !editModalLabel || !editFormErrorDiv || !editSaveButton) {
        console.warn("Một hoặc nhiều phần tử của modal chỉnh sửa sản phẩm hoặc form không tìm thấy. Chức năng sửa có thể bị ảnh hưởng.");
        // Không return ở đây để các chức năng khác (tìm kiếm, tải SP) vẫn hoạt động
    } else {
        // Gán các input modal một lần nếu chúng chắc chắn tồn tại sau khi HTML được tải
        originalCodeInput = document.getElementById('editProductOriginalCode'); // Đây là input hidden
        codeInput = document.getElementById('editProductCode');
        nameInput = document.getElementById('editProductName');
        quantityInput = document.getElementById('editProductQuantity');
        priceInput = document.getElementById('editProductPrice');
        imageInput = document.getElementById('editProductImage');
        imagePreview = document.getElementById('currentProductImagePreview');
        noImageText = document.getElementById('noCurrentImageText');

        if (!originalCodeInput || !codeInput || !nameInput || !quantityInput || !priceInput || !imageInput || !imagePreview || !noImageText) {
            console.error("Lỗi: Một hoặc nhiều trường input con trong modal sửa sản phẩm không tìm thấy!");
            if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi cấu trúc form chỉnh sửa. Vui lòng kiểm tra lại.", "danger");
            // Có thể vô hiệu hóa chức năng chỉnh sửa nếu các phần tử này thiếu
            return; // Dừng nếu form sửa không hoạt động
        }
    }


    async function fetchProducts(page = 1, searchTerm = '') {
        const currentSearchTerm = searchInput ? searchInput.value.trim() : searchTerm;
        if(window.showPageNotification) window.showPageNotification(notificationDivId, 'Đang tải danh sách sản phẩm...', 'info', 10000);
        
        // Thêm trạng thái loading cho bảng
        productTableBody.innerHTML = `<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div></td></tr>`;


        let url = `/api/products?page=${page}&per_page=10`;
        if (currentSearchTerm) {
            url += `&search=${encodeURIComponent(currentSearchTerm)}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({ error: 'Lỗi không xác định từ server' }));
                throw new Error(errorData.error || `Lỗi ${response.status}`);
            }
            const data = await response.json();
            renderProducts(data.products, currentSearchTerm);
            if (window.renderPagination) {
                window.renderPagination(data.current_page, data.total_pages, paginationElementId, fetchProducts, currentSearchTerm);
            }
            if(window.showPageNotification && data.products.length > 0) window.showPageNotification(notificationDivId, `Đã tải ${data.products.length} sản phẩm.`, 'success', 2000);
            else if (data.products.length === 0) window.showPageNotification(notificationDivId, 'Không có sản phẩm nào để hiển thị.', 'info', 3000);

        } catch (error) {
            console.error('Lỗi tải sản phẩm:', error);
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải sản phẩm: ${error.message}`, 'danger');
            productTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>`;
        }
    }

    function renderProducts(products, currentSearchTermForMessage = '') {
        productTableBody.innerHTML = '';
        if (!products || products.length === 0) {
            let message = "Không có sản phẩm nào";
            if (currentSearchTermForMessage) {
                message += ` khớp với tìm kiếm "${currentSearchTermForMessage}"`;
            }
            message += ".";
            productTableBody.innerHTML = `<tr><td colspan="7" class="text-center">${message}</td></tr>`;
            return;
        }
        products.forEach(product => {
            const row = productTableBody.insertRow();
            row.insertCell().innerHTML = product.image_url ? `<img src="${product.image_url}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">` : 'N/A';
            row.insertCell().textContent = product.name;
            row.insertCell().textContent = product.code;
            row.insertCell().textContent = product.quantity;
            row.insertCell().textContent = new Intl.NumberFormat('vi-VN').format(product.price);
            row.insertCell().textContent = product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : 'N/A';

            const actionsCell = row.insertCell();
            actionsCell.style.whiteSpace = "nowrap";
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-outline-warning me-2';
            editButton.innerHTML = '<i class="bi bi-pencil-square"></i> Sửa';
            editButton.onclick = () => openEditModal(product);
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.innerHTML = '<i class="bi bi-trash"></i> Xóa';
            deleteButton.onclick = () => confirmDeleteProduct(product.code, product.name);
            actionsCell.appendChild(deleteButton);
        });
    }

    // Hàm validation phía client cho form chỉnh sửa
    function validateEditForm() {
        if (!editFormErrorDiv || !nameInput || !quantityInput || !priceInput || !imageInput) {
            console.error("Lỗi: Một hoặc nhiều phần tử validation form chỉnh sửa không được khởi tạo.");
            return false;
        }
        editFormErrorDiv.textContent = ''; // Xóa lỗi cũ
        let isValid = true;

        const name = nameInput.value.trim();
        const quantity = parseInt(quantityInput.value, 10);
        const price = parseFloat(priceInput.value);
        const imageFile = imageInput.files[0];

        if (!name) {
            editFormErrorDiv.textContent = "Tên Sản Phẩm là bắt buộc.";
            nameInput.focus();
            isValid = false;
        } else if (isNaN(quantity) || quantity < 0) {
            editFormErrorDiv.textContent = "Số Lượng Tồn phải là số không âm.";
            quantityInput.focus();
            isValid = false;
        } else if (isNaN(price) || price < 0) {
            editFormErrorDiv.textContent = "Giá Sản Phẩm phải là số không âm.";
            priceInput.focus();
            isValid = false;
        } else if (imageFile) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            const maxSize = 16 * 1024 * 1024; // 16MB (phải khớp với backend)
            if (!allowedTypes.includes(imageFile.type)) {
                editFormErrorDiv.textContent = "Chỉ chấp nhận ảnh JPEG, PNG, GIF.";
                imageInput.focus();
                isValid = false;
            } else if (imageFile.size > maxSize) {
                editFormErrorDiv.textContent = `Kích thước ảnh quá lớn (tối đa ${maxSize / (1024 * 1024)}MB).`;
                imageInput.focus();
                isValid = false;
            }
        }
        return isValid;
    }


    function openEditModal(product) {
        const modalInstance = window.getModalInstance('editProductModal');
        if (!modalInstance || !editForm) {
            if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi: Không thể mở form chỉnh sửa. Kiểm tra ID modal và form.", "danger");
            return;
        }
        
        // Đảm bảo các input đã được gán (kiểm tra ở đầu initQuanlyPage)
        if (!originalCodeInput || !codeInput || !nameInput || !quantityInput || !priceInput || !imageInput || !imagePreview || !noImageText || !editFormErrorDiv) {
            console.error("Lỗi: Một hoặc nhiều trường input trong modal sửa sản phẩm không tìm thấy!");
            if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi cấu trúc form chỉnh sửa.", "danger");
            return;
        }

        editForm.reset(); // Đặt lại form để xóa trạng thái cũ
        editFormErrorDiv.textContent = ''; // Xóa lỗi validation cũ

        originalCodeInput.value = product.code; // Lưu mã gốc để backend biết sản phẩm nào cần cập nhật
        codeInput.value = product.code; // Mã sản phẩm hiển thị, không thể sửa
        nameInput.value = product.name;
        quantityInput.value = product.quantity;
        priceInput.value = product.price;
        imageInput.value = ''; // Xóa file input cũ, người dùng phải chọn lại nếu muốn đổi ảnh

        if (product.image_url) {
            imagePreview.src = product.image_url;
            imagePreview.style.display = 'inline-block';
            noImageText.style.display = 'none';
        } else {
            imagePreview.src = ''; // Đặt lại src về rỗng
            imagePreview.style.display = 'none';
            noImageText.style.display = 'inline-block';
        }
        modalInstance.show();
    }

    if (editForm) {
        editForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!validateEditForm()) {
                if(window.showPageNotification) window.showPageNotification(notificationDivId, "Vui lòng kiểm tra lại thông tin chỉnh sửa sản phẩm.", "warning");
                return;
            }

            const productOriginalCode = originalCodeInput.value;
            if (!productOriginalCode) {
                console.error("Không có mã sản phẩm gốc để cập nhật.");
                if(editFormErrorDiv) editFormErrorDiv.textContent = "Lỗi: Thiếu mã sản phẩm gốc.";
                if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi nghiêm trọng khi chỉnh sửa sản phẩm.", "danger");
                return;
            }
            
            if(window.showPageNotification) window.showPageNotification(notificationDivId, 'Đang cập nhật sản phẩm...', 'info', 10000);
            
            editSaveButton.disabled = true;
            editSaveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...';


            const formData = new FormData();
            // Lấy giá trị từ các input đã có: name, quantity, price, image
            formData.append('name', nameInput.value.trim());
            formData.append('quantity', quantityInput.value);
            formData.append('price', priceInput.value);
            if (imageInput.files.length > 0) {
                formData.append('image', imageInput.files[0]);
            }
            // Không gửi code hoặc id từ đây, mã sản phẩm được lấy từ URL path

            try {
                const response = await fetch(`/api/products/${productOriginalCode}`, {
                    method: 'PUT',
                    body: formData
                });
                const result = await response.json();
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; return; }
                    const errorMessage = result.error || `Lỗi ${response.status} từ server: ${response.statusText}`;
                    if(editFormErrorDiv) editFormErrorDiv.textContent = errorMessage;
                    if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi cập nhật sản phẩm: ${errorMessage}`, 'danger');
                    throw new Error(errorMessage);
                }
                if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || 'Cập nhật sản phẩm thành công!', 'success');
                const modalInstance = window.getModalInstance('editProductModal');
                if (modalInstance) modalInstance.hide();
                
                // Tải lại trang hiện tại sau khi cập nhật thành công
                const activePageLink = document.querySelector(`#${paginationElementId} .page-item.active .page-link`);
                const currentPageToReload = activePageLink ? parseInt(activePageLink.textContent) : 1;
                const currentSearchTermToReload = searchInput ? searchInput.value.trim() : '';
                fetchProducts(currentPageToReload, currentSearchTermToReload);

            } catch (error) {
                console.error("Lỗi cập nhật sản phẩm:", error);
                // Lỗi đã được hiển thị trong formErrorDiv hoặc showPageNotification
            } finally {
                editSaveButton.disabled = false;
                editSaveButton.innerHTML = 'Lưu Thay Đổi'; // Đảm bảo biểu tượng không còn nữa
            }
        });
    }

    async function confirmDeleteProduct(code, name) {
        if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" (Mã: ${code}) không? Hành động này không thể hoàn tác và sẽ xóa cả các giao dịch liên quan.`)) {
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Đang xóa sản phẩm ${name}...`, 'info', 10000);
            try {
                const response = await fetch(`/api/products/${code}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; return; }
                    throw new Error(result.error || `Lỗi ${response.status}`);
                }
                if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || `Đã xóa sản phẩm ${name}.`, 'success');
                const activePageLink = document.querySelector(`#${paginationElementId} .page-item.active .page-link`);
                const currentPageToReload = activePageLink ? parseInt(activePageLink.textContent) : 1;
                const currentSearchTermToReload = searchInput ? searchInput.value.trim() : '';
                fetchProducts(currentPageToReload, currentSearchTermToReload);
            } catch (error) {
                console.error(`Lỗi xóa sản phẩm ${code}:`, error);
                if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi xóa sản phẩm: ${error.message}`, 'danger');
            }
        }
    }

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            fetchProducts(1, searchInput.value.trim());
        });
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                fetchProducts(1, searchInput.value.trim());
            }
        });
    } else {
        console.warn("Không tìm thấy phần tử tìm kiếm trên trang Quản lý. Chức năng tìm kiếm có thể không hoạt động.");
    }

    fetchProducts();
}