// backend/static/khachhang.js
function initKhachhangPage() {
    console.log("Attempting to initialize Khach Hang page...");

    const customerTableBody = document.querySelector('#danh-sach-khachhang tbody');
    const addCustomerBtnPage = document.getElementById('add-customer-btn-page');
    const notificationDivId = 'thong-bao-khachhang'; // ID cho div thông báo của trang

    // Biến cho các phần tử modal, sẽ được gán trong initializeModalElements
    let customerModalEl, customerForm, customerIdInputHidden, customerNameInput,
        contactPersonInput, phoneInput, emailInput, addressInput, modalLabel, formErrorDiv, modalSaveButton;

    // Gán các biến phần tử DOM chính và kiểm tra
    if (!customerTableBody) {
        console.error("Lỗi DOM KHCRITICAL: Không tìm thấy '#danh-sach-khachhang tbody'. Chức năng bảng sẽ không hoạt động.");
    }
    if (!addCustomerBtnPage) {
        console.error("Lỗi DOM KHCRITICAL: Không tìm thấy nút '#add-customer-btn-page'. Chức năng thêm mới sẽ không hoạt động.");
    }
    // Thông báo nếu thiếu div thông báo, nhưng không dừng hàm
    if (!document.getElementById(notificationDivId)) {
        console.warn(`LƯU Ý: Div thông báo với ID '${notificationDivId}' không tìm thấy. Thông báo trang có thể không hiển thị.`);
    }

    // Dừng hàm nếu các phần tử cốt lõi bị thiếu
    if (!customerTableBody || !addCustomerBtnPage) {
        if(window.showGlobalNotification) window.showGlobalNotification("Lỗi nghiêm trọng khi tải giao diện trang Khách Hàng. Một số thành phần không tìm thấy.", "danger");
        return; // Dừng thực thi nếu các thành phần chính của trang không có
    }
    console.log("Các phần tử chính của trang Khách Hàng (bảng, nút thêm) đã được tìm thấy.");


    function initializeModalElements() {
        customerModalEl = document.getElementById('customerModal');
        customerForm = document.getElementById('customerForm');
        customerIdInputHidden = document.getElementById('customerIdInputHidden');
        customerNameInput = document.getElementById('customerNameInput');
        contactPersonInput = document.getElementById('customerContactPersonInput');
        phoneInput = document.getElementById('customerPhoneInput');
        emailInput = document.getElementById('customerEmailInput');
        addressInput = document.getElementById('customerAddressInput');
        modalLabel = document.getElementById('customerModalLabel');
        formErrorDiv = document.getElementById('customer-form-error');
        modalSaveButton = customerModalEl ? customerModalEl.querySelector('button[type="submit"]') : null; // Nút lưu trong modal
    }

    // Gọi initializeModalElements sớm để các biến có giá trị
    initializeModalElements();

    if (!customerModalEl || !customerForm || !customerIdInputHidden || !customerNameInput || !modalLabel || !formErrorDiv || !modalSaveButton) {
        console.error("Lỗi DOM KHCRITICAL: Một hoặc nhiều phần tử của modal khách hàng không tìm thấy. Chức năng modal sẽ không hoạt động.");
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi cấu trúc form khách hàng. Không thể sử dụng modal.", "danger");
        return; // Dừng nếu modal không hoạt động
    }
    console.log("Các phần tử của modal khách hàng đã được tìm thấy.");

    // Hàm validation phía client cho form khách hàng
    function validateCustomerForm() {
        formErrorDiv.textContent = ''; // Xóa lỗi cũ
        let isValid = true;

        const name = customerNameInput.value.trim();
        const email = emailInput ? emailInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';

        if (!name) {
            formErrorDiv.textContent = "Tên khách hàng là bắt buộc.";
            customerNameInput.focus();
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

    function openCustomerModal(customer = null) {
        // Đảm bảo các biến phần tử modal được gán giá trị
        // initializeModalElements() đã được gọi ở đầu init...Page, đảm bảo chúng có giá trị.

        const modalInstance = window.getModalInstance('customerModal');
        if (!modalInstance) {
             console.error("Không thể lấy instance của customerModal.");
             if(window.showPageNotification) window.showPageNotification(notificationDivId, "Lỗi khởi tạo modal.", "danger");
            return;
        }

        customerForm.reset();
        formErrorDiv.textContent = '';
        if (customer) {
            modalLabel.textContent = "Sửa Khách Hàng";
            customerIdInputHidden.value = customer.id;
            customerNameInput.value = customer.name;
            if(contactPersonInput) contactPersonInput.value = customer.contact_person || '';
            if(phoneInput) phoneInput.value = customer.phone || '';
            if(emailInput) emailInput.value = customer.email || '';
            if(addressInput) addressInput.value = customer.address || '';
        } else {
            modalLabel.textContent = "Thêm Khách Hàng Mới";
            customerIdInputHidden.value = '';
        }
        modalInstance.show();
    }

    addCustomerBtnPage.addEventListener('click', () => openCustomerModal());

    if (customerForm) { // Gọi lại để đảm bảo customerForm có giá trị
        customerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!validateCustomerForm()) {
                if(window.showPageNotification) window.showPageNotification(notificationDivId, "Vui lòng kiểm tra lại thông tin khách hàng.", "warning");
                return;
            }

            const id = customerIdInputHidden.value; // Sử dụng ID đã cập nhật
            const currentName = customerNameInput.value.trim();
            const currentContactPerson = contactPersonInput ? contactPersonInput.value.trim() : '';
            const currentPhone = phoneInput ? phoneInput.value.trim() : '';
            const currentEmail = emailInput ? emailInput.value.trim() : '';
            const currentAddress = addressInput ? addressInput.value.trim() : '';
            
            const customerData = {
                name: currentName,
                contact_person: currentContactPerson,
                phone: currentPhone,
                email: currentEmail,
                address: currentAddress
            };

            const url = id ? `/api/customers/${id}` : '/api/customers';
            const method = id ? 'PUT' : 'POST';

            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Đang ${id ? 'cập nhật' : 'thêm'} khách hàng...`, 'info', 10000);

            modalSaveButton.disabled = true;
            modalSaveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData)
                });
                const result = await response.json();
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; return; }
                    const errorMessage = result.error || `Lỗi ${response.status} từ server: ${response.statusText}`;
                    if(formErrorDiv) formErrorDiv.textContent = errorMessage;
                    if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi ${id ? 'cập nhật' : 'thêm'} khách hàng: ${errorMessage}`, 'danger');
                    throw new Error(errorMessage);
                }
                if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || (id ? 'Cập nhật' : 'Thêm') + ' khách hàng thành công!', 'success');
                const modalInstance = window.getModalInstance('customerModal');
                if (modalInstance) modalInstance.hide();
                fetchCustomers();
            } catch (error) {
                console.error(`Lỗi khi ${id ? 'cập nhật' : 'thêm'} khách hàng:`, error);
            } finally {
                modalSaveButton.disabled = false;
                modalSaveButton.innerHTML = 'Lưu'; // Restore original text
            }
        });
    } else {
        console.error("Lỗi DOM KHCRITICAL: Không thể gắn sự kiện cho customerForm vì nó hoặc các phần tử con không tìm thấy.");
    }


    async function fetchCustomers() {
        if(window.showPageNotification) window.showPageNotification(notificationDivId, "Đang tải danh sách khách hàng...", "info", 10000);
        customerTableBody.innerHTML = `<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div></td></tr>`;

        try {
            const response = await fetch('/api/customers');
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                const errorData = await response.json().catch(() => ({error: 'Lỗi không xác định từ server'}));
                throw new Error(errorData.error || `Lỗi ${response.status}`);
            }
            const customers = await response.json();
            renderCustomers(customers);
            if(window.showPageNotification && customers.length > 0) window.showPageNotification(notificationDivId, `Đã tải ${customers.length} khách hàng.`, "success", 2000);
            else if (customers.length === 0 && window.showPageNotification) window.showPageNotification(notificationDivId, `Không có khách hàng nào.`, "info", 3000);
        } catch (error) {
            console.error('Lỗi tải khách hàng:', error);
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi tải khách hàng: ${error.message}`, 'danger');
            if(customerTableBody) customerTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>`;
        }
    }

    function renderCustomers(customers) {
        if(!customerTableBody) {
            console.error("Không thể render khách hàng vì customerTableBody là null.");
            return;
        }
        customerTableBody.innerHTML = '';
        if (!customers || customers.length === 0) {
            customerTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Không có khách hàng nào.</td></tr>';
            return;
        }
        customers.forEach(customer => {
            const row = customerTableBody.insertRow();
            row.insertCell().textContent = customer.id;
            row.insertCell().textContent = customer.name;
            row.insertCell().textContent = customer.contact_person || '';
            row.insertCell().textContent = customer.phone || '';
            row.insertCell().textContent = customer.email || '';
            row.insertCell().textContent = customer.address || '';

            const actionsCell = row.insertCell();
            actionsCell.style.whiteSpace = "nowrap";
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-outline-warning me-2';
            editButton.innerHTML = '<i class="bi bi-pencil-square"></i> Sửa';
            editButton.onclick = () => openCustomerModal(customer);
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.innerHTML = '<i class="bi bi-trash"></i> Xóa';
            deleteButton.onclick = () => confirmDeleteCustomer(customer.id, customer.name);
            actionsCell.appendChild(deleteButton);
        });
    }
    async function confirmDeleteCustomer(id, name) {
        if (confirm(`Bạn có chắc chắn muốn xóa khách hàng "${name}" (ID: ${id}) không?`)) {
            if(window.showPageNotification) window.showPageNotification(notificationDivId, `Đang xóa khách hàng ${name}...`, 'info', 10000);
            try {
                const response = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; return; }
                    throw new Error(result.error || `Lỗi ${response.status}`);
                }
                if(window.showPageNotification) window.showPageNotification(notificationDivId, result.message || `Đã xóa khách hàng ${name}.`, 'success');
                fetchCustomers();
            } catch (error) {
                console.error(`Lỗi xóa khách hàng ${id}:`, error);
                if(window.showPageNotification) window.showPageNotification(notificationDivId, `Lỗi xóa khách hàng: ${error.message}`, 'danger');
            }
        }
    }

    fetchCustomers(); // Tải danh sách khách hàng khi trang được khởi tạo
    console.log("Khởi tạo trang Khách Hàng hoàn tất.");
}