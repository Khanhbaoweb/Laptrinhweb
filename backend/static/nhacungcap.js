// backend/static/nhacungcap.js
function initNhacungcapPage() {
    console.log("Khởi tạo trang Nhà Cung Cấp...");
    const supplierTableBody = document.querySelector('#danh-sach-nhacungcap tbody');
    const addSupplierBtnPage = document.getElementById('add-supplier-btn-page');
    const notificationDivId = 'thong-bao-nhacungcap';
    
    // Các phần tử Modal (sẽ được lấy khi cần để đảm bảo chúng tồn tại sau khi HTML được render)
    let supplierModalEl, supplierForm, supplierIdInput, supplierNameInput, contactPersonInput, phoneInput, emailInput, addressInput, modalLabel, formErrorDiv, modalSaveButton;

    // Hàm này sẽ gán các biến phần tử modal. Gọi nó trước khi sử dụng các biến này.
    function initializeModalElements() {
        supplierModalEl = document.getElementById('supplierModal');
        supplierForm = document.getElementById('supplierForm');
        supplierIdInput = document.getElementById('supplierId'); // Input ẩn
        supplierNameInput = document.getElementById('supplierNameInput'); // ID mới
        contactPersonInput = document.getElementById('supplierContactPersonInput'); // ID mới
        phoneInput = document.getElementById('supplierPhoneInput'); // ID mới
        emailInput = document.getElementById('supplierEmailInput'); // ID mới
        addressInput = document.getElementById('supplierAddressInput'); // ID mới
        modalLabel = document.getElementById('supplierModalLabel');
        formErrorDiv = document.getElementById('supplier-form-error');
        modalSaveButton = supplierModalEl ? supplierModalEl.querySelector('button[type="submit"]') : null; // Nút lưu trong modal
    }

    if (!supplierTableBody || !addSupplierBtnPage) {
        console.error("Lỗi DOM: Thiếu bảng nhà cung cấp hoặc nút 'Thêm'.");
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi tải giao diện: Không tìm thấy các thành phần chính của trang Nhà Cung Cấp.", "danger");
        return;
    }

    // Gọi initializeModalElements sớm để các biến có giá trị
    initializeModalElements();

    if (!supplierModalEl || !supplierForm || !supplierIdInput || !supplierNameInput || !modalLabel || !formErrorDiv || !modalSaveButton) {
        console.error("Lỗi DOM: Thiếu các thành phần của modal nhà cung cấp. Chức năng modal sẽ không hoạt động.");
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi cấu trúc form nhà cung cấp. Không thể sử dụng modal.", "danger");
        return; // Dừng nếu modal không hoạt động
    }
    console.log("Các phần tử chính của trang Nhà Cung Cấp và modal đã được tìm thấy.");

    // Hàm validation phía client cho form nhà cung cấp
    function validateSupplierForm() {
        formErrorDiv.textContent = ''; // Xóa lỗi cũ
        let isValid = true;

        const name = supplierNameInput.value.trim();
        const email = emailInput ? emailInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';

        if (!name) {
            formErrorDiv.textContent = "Tên nhà cung cấp là bắt buộc.";
            supplierNameInput.focus();
            isValid = false;
        } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { // Regex đơn giản cho email
            formErrorDiv.textContent = "Email không hợp lệ.";
            emailInput.focus();
            isValid = false;
        } else if (phone && !/^\d+$/.test(phone)) { // Chỉ chấp nhận số
            formErrorDiv.textContent = "Số điện thoại chỉ được chứa ký tự số.";
            phoneInput.focus();
            isValid = false;
        }
        return isValid;
    }


    function openSupplierModal(supplier = null) {
        // Đảm bảo các biến phần tử modal được gán giá trị
        // initializeModalElements() đã được gọi ở đầu init...Page, đảm bảo chúng có giá trị.
        // Kiểm tra lại sự tồn tại nếu có bất kỳ nghi ngờ nào.

        const modalInstance = window.getModalInstance('supplierModal');
        if (!modalInstance) {
             console.error("Không thể lấy instance của supplierModal.");
             if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi khởi tạo modal.", "danger");
            return;
        }

        supplierForm.reset();
        formErrorDiv.textContent = '';
        if (supplier) {
            modalLabel.textContent = "Sửa Nhà Cung Cấp";
            supplierIdInput.value = supplier.id;
            supplierNameInput.value = supplier.name;
            if(contactPersonInput) contactPersonInput.value = supplier.contact_person || '';
            if(phoneInput) phoneInput.value = supplier.phone || '';
            if(emailInput) emailInput.value = supplier.email || '';
            if(addressInput) addressInput.value = supplier.address || '';
        } else {
            modalLabel.textContent = "Thêm Nhà Cung Cấp Mới";
            supplierIdInput.value = '';
        }
        modalInstance.show();
    }

    addSupplierBtnPage.addEventListener('click', () => openSupplierModal());

    if (supplierForm) {
        supplierForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!validateSupplierForm()) {
                if(window.showPageNotification) window.showPageNotification(notificationDivId, "Vui lòng kiểm tra lại thông tin nhà cung cấp.", "warning");
                return;
            }

            const id = supplierIdInput.value;
            const currentName = supplierNameInput.value.trim();
            const currentContactPerson = contactPersonInput ? contactPersonInput.value.trim() : '';
            const currentPhone = phoneInput ? phoneInput.value.trim() : '';
            const currentEmail = emailInput ? emailInput.value.trim() : '';
            const currentAddress = addressInput ? addressInput.value.trim() : '';

            const supplierData = {
                name: currentName,
                contact_person: currentContactPerson,
                phone: currentPhone,
                email: currentEmail,
                address: currentAddress
            };

            const url = id ? `/api/suppliers/${id}` : '/api/suppliers';
            const method = id ? 'PUT' : 'POST';

            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Đang ${id ? 'cập nhật' : 'thêm'} nhà cung cấp...`, 'info', 10000);
            
            modalSaveButton.disabled = true;
            modalSaveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...';


            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(supplierData)
                });
                const result = await response.json();
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; return; }
                    const errorMessage = result.error || `Lỗi ${response.status} từ server: ${response.statusText}`;
                    if(formErrorDiv) formErrorDiv.textContent = errorMessage;
                    if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi ${id ? 'cập nhật' : 'thêm'} nhà cung cấp: ${errorMessage}`, 'danger');
                    throw new Error(errorMessage);
                }
                if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || (id ? 'Cập nhật' : 'Thêm') + ' nhà cung cấp thành công!', 'success');
                const modalInstance = window.getModalInstance('supplierModal');
                if (modalInstance) modalInstance.hide();
                fetchSuppliers();
            } catch (error) {
                console.error(`Lỗi khi ${id ? 'cập nhật' : 'thêm'} nhà cung cấp:`, error);
            } finally {
                modalSaveButton.disabled = false;
                modalSaveButton.innerHTML = 'Lưu'; // Restore original text
            }
        });
    } else {
        console.error("Không tìm thấy supplierForm để gắn sự kiện submit.");
    }


    async function fetchSuppliers() {
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Đang tải danh sách nhà cung cấp...", "info", 10000);
        supplierTableBody.innerHTML = `<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div></td></tr>`;
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({ error: 'Lỗi không xác định' }));
                throw new Error(errorData.error || `Lỗi ${response.status}`);
            }
            const suppliers = await response.json();
            renderSuppliers(suppliers);
             if(window.showPageNotification && suppliers.length > 0) window.showPageNotification(notificationDivId, `Đã tải ${suppliers.length} nhà cung cấp.`, "success", 2000);
             else if (suppliers.length === 0 && window.showPageNotification) window.showPageNotification(notificationDivId, `Không có nhà cung cấp nào.`, "info", 3000);
        } catch (error) {
            console.error('Lỗi tải nhà cung cấp:', error);
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải nhà cung cấp: ${error.message}`, 'danger');
            if(supplierTableBody) supplierTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>`;
        }
    }

    function renderSuppliers(suppliers) {
        if(!supplierTableBody) return;
        supplierTableBody.innerHTML = '';
        if (!suppliers || suppliers.length === 0) {
            supplierTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Không có nhà cung cấp nào.</td></tr>';
            return;
        }
        suppliers.forEach(supplier => {
            const row = supplierTableBody.insertRow();
            row.insertCell().textContent = supplier.id;
            row.insertCell().textContent = supplier.name;
            row.insertCell().textContent = supplier.contact_person || '';
            row.insertCell().textContent = supplier.phone || '';
            row.insertCell().textContent = supplier.email || '';
            row.insertCell().textContent = supplier.address || '';

            const actionsCell = row.insertCell();
            actionsCell.style.whiteSpace = "nowrap";
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-outline-warning me-2';
            editButton.innerHTML = '<i class="bi bi-pencil-square"></i> Sửa';
            editButton.onclick = () => openSupplierModal(supplier);
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.innerHTML = '<i class="bi bi-trash"></i> Xóa';
            deleteButton.onclick = () => confirmDeleteSupplier(supplier.id, supplier.name);
            actionsCell.appendChild(deleteButton);
        });
    }
    async function confirmDeleteSupplier(id, name) {
        if (confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${name}" (ID: ${id}) không?`)) {
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Đang xóa nhà cung cấp ${name}...`, 'info', 10000);
            try {
                const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; return; }
                    throw new Error(result.error || `Lỗi ${response.status}`);
                }
                if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || `Đã xóa nhà cung cấp ${name}.`, 'success');
                fetchSuppliers();
            } catch (error) {
                console.error(`Lỗi xóa nhà cung cấp ${id}:`, error);
                if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi xóa nhà cung cấp: ${error.message}`, 'danger');
            }
        }
    }

    fetchSuppliers();
}