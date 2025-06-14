// backend/static/app_loader.js
document.addEventListener('DOMContentLoaded', async function () {
    const mainContentArea = document.getElementById('main-content-area');
    const sidebarLinks = document.querySelectorAll('.sidebar .list-group-item[data-page]');
    const logoutButton = document.getElementById('logoutButton');
    const loggedInUserSpan = document.getElementById('loggedInUser');
    let currentPageScript = null;
    let bootstrapModalInstances = {};

    // Hàm hiển thị thông báo chung (Đã cải tiến)
    window.showGlobalNotification = function(message, type = 'info', duration = 3000) {
        // Ưu tiên hiển thị trên #thong-bao-main nếu có, nếu không thì dùng mainContentArea
        const notificationArea = document.getElementById('thong-bao-main') || mainContentArea;
        if (!notificationArea) {
            console.warn("Không tìm thấy vùng thông báo toàn cục hoặc vùng nội dung chính để hiển thị thông báo.");
            return;
        }

        const alertDiv = document.createElement('div');
        // Sử dụng lớp cảnh báo của Bootstrap
        alertDiv.className = `alert alert-${type} alert-dismissible fade show fixed-top m-3`;
        alertDiv.style.zIndex = "1055"; // Đảm bảo hiển thị trên cùng
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Chèn vào đầu vùng thông báo hoặc vùng nội dung chính
        if (notificationArea === mainContentArea && mainContentArea.firstChild) {
            mainContentArea.insertBefore(alertDiv, mainContentArea.firstChild);
        } else {
             notificationArea.appendChild(alertDiv);
        }

        // Tự động đóng sau một khoảng thời gian
        if (duration) {
            setTimeout(() => {
                const bootstrapAlert = bootstrap.Alert.getOrCreateInstance(alertDiv);
                if (bootstrapAlert) {
                    bootstrapAlert.close(); // Đóng thông báo Bootstrap một cách mượt mà
                } else if (alertDiv.parentNode) {
                    alertDiv.remove(); // Fallback nếu không phải là instance Bootstrap
                }
            }, duration);
        }
    }

    // Hàm hiển thị thông báo cụ thể cho một phần tử (Đã cải tiến)
    window.showPageNotification = function(elementId, message, type = 'info', duration = 3000) {
        const notificationDiv = document.getElementById(elementId);
        if (!notificationDiv) {
            console.warn(`Notification element #${elementId} not found. Using global notification.`);
            window.showGlobalNotification(message, type, duration); // Fallback về thông báo toàn cục
            return;
        }
        
        // Xóa tất cả các thông báo cũ trong vùng này trước khi thêm mới
        // Điều này đảm bảo chỉ có 1 thông báo hiển thị tại 1 thời điểm trong 1 vùng cụ thể
        notificationDiv.innerHTML = ''; 

        const alertWrapper = document.createElement('div'); // Tạo wrapper để dễ quản lý
        alertWrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
        const alertElement = alertWrapper.firstChild;
        notificationDiv.appendChild(alertElement);

        if (duration) {
            setTimeout(() => {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement);
                if(bsAlert) {
                    bsAlert.close();
                } else if (alertElement && alertElement.parentNode) { // Fallback
                     alertElement.remove();
                }
            }, duration);
        }
    };


    async function checkAuthentication() {
        try {
            const response = await fetch('/api/check_auth', { cache: 'no-store' });
            if (!response.ok) {
                // Nếu backend trả về lỗi HTTP khác 2xx, coi là không xác thực
                console.warn("Auth check HTTP error:", response.status);
                if (!window.location.pathname.endsWith('/login.html')) {
                    window.location.href = '/login';
                }
                return false;
            }
            const data = await response.json();
            if (data.isLoggedIn && data.user) {
                if (loggedInUserSpan) loggedInUserSpan.textContent = `Xin chào, ${data.user.username}!`;
                return true;
            } else {
                if (!window.location.pathname.endsWith('/login.html')) {
                    window.location.href = '/login';
                }
                return false;
            }
        } catch (error) {
            console.error('Lỗi kiểm tra xác thực (mạng/server):', error);
            if (!window.location.pathname.endsWith('/login.html')) {
                window.location.href = '/login';
            }
            return false;
        }
    }

    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        if (!window.location.pathname.endsWith('/login.html')) {
            console.log("Không xác thực và không ở trang login, dừng app_loader.");
            if (mainContentArea) mainContentArea.innerHTML = '<p class="text-center p-4">Đang chuyển hướng đến trang đăng nhập...</p>';
        }
        return;
    }

    function loadPageScript(pageName, callback) {
        if (currentPageScript && currentPageScript.parentNode) {
            currentPageScript.parentNode.removeChild(currentPageScript);
        }
        currentPageScript = null;

        const scriptFileName = (pageName === 'tongquan') ? 'main.js' : `${pageName}.js`;
        const script = document.createElement('script');
        script.src = `/${scriptFileName}`; // Phục vụ từ thư mục static
        script.type = 'text/javascript';
        script.onload = () => {
            console.log(`${scriptFileName} loaded.`);
            if (callback && typeof callback === 'function') {
                callback(); // Gọi callback sau khi script đã tải
            }
        };
        script.onerror = (e) => { // Bắt sự kiện lỗi tải script
            console.warn(`Could not load script: /${scriptFileName}`, e);
            window.showGlobalNotification(`Không thể tải chức năng cho trang ${pageName}. Vui lòng thử lại.`, 'danger', 5000);
            // Có thể hiển thị một thông báo lỗi trên mainContentArea
            mainContentArea.innerHTML = `<div class="p-4"><p class="text-danger">Lỗi: Không thể tải chức năng trang ${pageName}.</p></div>`;
        };
        document.body.appendChild(script);
        currentPageScript = script;
    }

    function disposeExistingModals() {
        for (const modalId in bootstrapModalInstances) {
            if (bootstrapModalInstances[modalId]) {
                try {
                    bootstrapModalInstances[modalId].dispose();
                } catch (e) {
                    console.warn(`Lỗi khi dispose modal ${modalId}:`, e);
                }
            }
        }
        bootstrapModalInstances = {};
        // Đảm bảo loại bỏ tất cả các backdrop còn sót lại
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        // Cũng xóa class 'modal-open' khỏi body nếu nó còn sót lại
        document.body.classList.remove('modal-open');
        document.body.style.overflow = ''; // Đảm bảo scrollbar trở lại
    }

    async function loadContent(pageName) {
        if (!pageName) return;
        disposeExistingModals(); // Đóng và hủy tất cả modal trước khi tải trang mới

        mainContentArea.innerHTML = `<div class="d-flex justify-content-center align-items-center" style="height: 80vh;"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div></div>`;
        try {
            const contentFile = `/${pageName}_content.html`;
            const response = await fetch(contentFile);
            if (!response.ok) {
                if (response.status === 401) { window.location.href = '/login'; return; }
                throw new Error(`HTTP error ${response.status} for ${contentFile}`);
            }
            const html = await response.text();
            mainContentArea.innerHTML = html; // HTML được chèn

            sidebarLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('data-page') === pageName);
            });

            // Tải script VÀ SAU ĐÓ gọi hàm init
            loadPageScript(pageName, () => {
                let pageNameForInit = pageName;
                if (pageName === 'tongquan') pageNameForInit = 'Main';

                const initFunctionName = `init${pageNameForInit.charAt(0).toUpperCase() + pageNameForInit.slice(1)}Page`;
                if (typeof window[initFunctionName] === 'function') {
                    try {
                        console.log(`Calling ${initFunctionName}...`);
                        window[initFunctionName](); // Gọi hàm init
                    } catch (e) {
                        console.error(`Lỗi khi chạy hàm khởi tạo ${initFunctionName}:`, e);
                        window.showGlobalNotification(`Lỗi khởi tạo chức năng trang ${pageName}: ${e.message}. Xem console.`, 'danger', 10000);
                    }
                } else {
                    console.warn(`Không tìm thấy hàm ${initFunctionName} cho trang ${pageName}.`);
                    window.showGlobalNotification(`Thiếu hàm khởi tạo cho trang ${pageName}. Chức năng có thể không hoạt động.`, 'warning', 5000);
                }
            });

        } catch (error) {
            mainContentArea.innerHTML = `<div class="p-4"><p class="text-danger">Lỗi khi tải trang: ${error.message}</p></div>`;
            console.error("Error loading content:", error);
            window.showGlobalNotification(`Lỗi không thể tải nội dung trang: ${error.message}`, 'danger', 10000);
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async function (event) {
            event.preventDefault();
            window.showGlobalNotification('Đang đăng xuất...', 'info', 5000); // Thông báo đang đăng xuất
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                const data = await response.json();
                if (response.ok) {
                    if(loggedInUserSpan) loggedInUserSpan.textContent = '';
                    window.location.href = '/login';
                } else {
                    window.showGlobalNotification(data.error || 'Lỗi đăng xuất không xác định.', 'danger');
                }
            } catch (error) {
                console.error('Lỗi khi đăng xuất:', error);
                window.showGlobalNotification('Không thể kết nối đến máy chủ để đăng xuất.', 'danger');
            }
        });
    }

    sidebarLinks.forEach(link => {
        if (link.id === 'logoutButton') return;
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const pageName = this.getAttribute('data-page');
            if (window.location.hash !== `#${pageName}`) {
                window.location.hash = pageName;
            } else {
                // Nếu hash không đổi (người dùng click lại link trang hiện tại),
                // chúng ta vẫn muốn tải lại nội dung và script để refresh trạng thái.
                loadContent(pageName);
            }
        });
    });

    window.addEventListener('hashchange', function () {
        const pageName = window.location.hash.substring(1) || 'tongquan';
        loadContent(pageName);
    });


    // Tải nội dung ban đầu
    const initialPageName = window.location.hash.substring(1) || 'tongquan';
    if (!window.location.hash) {
        window.location.hash = initialPageName; // Sẽ trigger hashchange, và loadContent sẽ được gọi
    } else {
        loadContent(initialPageName); // Tải trực tiếp nếu hash đã có
    }

    // Các hàm tiện ích (giữ nguyên như cũ, đã được cải thiện)
    window.getModalInstance = function(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            console.error(`Modal element #${modalId} not found.`);
            return null;
        }
        let instance = bootstrap.Modal.getInstance(modalElement);
        if (!instance) {
            instance = new bootstrap.Modal(modalElement);
        }
        bootstrapModalInstances[modalId] = instance; // Lưu lại để dispose sau
        return instance;
    };

    window.renderPagination = function(currentPage, totalPages, paginationElementId, fetchFunction, searchTerm = null) {
        const paginationUl = document.getElementById(paginationElementId);
        if (!paginationUl) return;
        paginationUl.innerHTML = '';

        if (totalPages <= 1) return;

        // Nút Previous
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Trước';
        prevLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) fetchFunction(currentPage - 1, searchTerm);
        });
        prevLi.appendChild(prevLink);
        paginationUl.appendChild(prevLi);

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (currentPage <= 3) {
            endPage = Math.min(totalPages, 5);
        }
        if (currentPage > totalPages - 3) {
            startPage = Math.max(1, totalPages - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const pageLink = document.createElement('a');
            pageLink.className = 'page-link';
            pageLink.href = '#';
            pageLink.textContent = i;
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                fetchFunction(i, searchTerm);
            });
            pageLi.appendChild(pageLink);
            paginationUl.appendChild(pageLi);
        }

        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Sau';
        nextLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) fetchFunction(currentPage + 1, searchTerm);
        });
        nextLi.appendChild(nextLink);
        paginationUl.appendChild(nextLi);
    };
});