# backend/app.py
from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import os
import uuid
import logging
from sqlalchemy import func, cast, Numeric

# BẮT ĐẦU PHẦN CODE MỚI CẦN DÁN VÀO ĐÂY SAU CÁC DÒNG IMPORT KHÁC
import sys
# Đảm bảo thư mục cha của 'backend' được thêm vào PYTHONPATH
# Điều này giúp Python tìm thấy 'backend' như một top-level package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# KẾT THÚC PHẦN CODE MỚI CẦN DÁN VÀO ĐÂY

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__, static_folder='static', static_url_path='')
# DÒNG SAU ĐÂY CŨNG CẦN ĐƯỢC THAY ĐỔI
# Thay thế dòng này: app.config.from_object('config.Config')
# BẰNG DÒNG NÀY:
app.config.from_object('backend.config.Config')

# ... (phần còn lại của app.py giữ nguyên) ...
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'SUPER_SECRET_DEV_KEY_DO_NOT_USE_IN_PROD_12345')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

db = SQLAlchemy(app)
# Đã cải thiện: CORS chỉ cho phép từ origin của ứng dụng frontend trong môi trường dev/prod
# Đối với local, giữ nguyên '*' hoặc chỉ định 'http://localhost:5000' nếu frontend chạy cổng khác
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": [
    "http://dhttmt01g7.click",
    "https://dhttmt01g7.click" # Thêm phiên bản HTTPS nếu bạn sẽ dùng HTTPS
]}})
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'serve_login_page_template'
login_manager.session_protection = "strong"

# --- Models (User, Product, Transaction, Supplier, Customer) ---
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id': self.id, 'username': self.username}

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(100), unique=True, nullable=False)
    quantity = db.Column(db.Integer, default=0)
    price = db.Column(db.Numeric(10, 2), default=0.00)
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    transactions = db.relationship('Transaction', backref='product', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        image_full_url = None
        if self.image_url:
            base_url = request.host_url.rstrip('/')
            # Đảm bảo URL hình ảnh đúng
            image_full_url = f"{base_url}{self.image_url}"
        return {
            'id': self.id, 'name': self.name, 'code': self.code,
            'quantity': self.quantity, 'price': float(self.price),
            'image_url': image_full_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    type = db.Column(db.Enum('import', 'export', name='transaction_types_enum'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_per_unit = db.Column(db.Numeric(10, 2))
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.String(255))

    def to_dict(self):
        product_image_full_url = None
        if self.product and self.product.image_url:
            base_url = request.host_url.rstrip('/')
            product_image_full_url = f"{base_url}{self.product.image_url}"
        return {
            'id': self.id, 'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_code': self.product.code if self.product else None,
            'product_image_url': product_image_full_url,
            'type': self.type, 'quantity': self.quantity,
            'price_per_unit': float(self.price_per_unit) if self.price_per_unit else None,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'description': self.description
        }

class Supplier(db.Model):
    __tablename__ = 'suppliers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    contact_person = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(255))
    address = db.Column(db.Text)
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'contact_person': self.contact_person,
                'phone': self.phone, 'email': self.email, 'address': self.address}

class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    contact_person = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(255))
    address = db.Column(db.Text)
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'contact_person': self.contact_person,
                'phone': self.phone, 'email': self.email, 'address': self.address}

# --- Phục vụ tệp tĩnh và SPA ---
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/login', methods=['GET'])
def serve_login_page_template():
    return send_from_directory(app.static_folder, 'login.html')

@login_manager.unauthorized_handler
def unauthorized_callback():
    if request.accept_mimetypes.accept_json and \
            not request.accept_mimetypes.accept_html:
        return jsonify(error="Yêu cầu xác thực.", message="Vui lòng đăng nhập lại."), 401
    return redirect(url_for('serve_login_page_template'))

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')


# --- API Endpoints (có tiền tố /api) ---
API_PREFIX = '/api'

@app.route(f'{API_PREFIX}/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Tên đăng nhập và mật khẩu là bắt buộc'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Tên đăng nhập đã tồn tại'}), 400
    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'Đăng ký thành công', 'user': new_user.to_dict()}), 201

@app.route(f'{API_PREFIX}/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Tên đăng nhập và mật khẩu là bắt buộc'}), 400
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        login_user(user, remember=True, duration=app.config['PERMANENT_SESSION_LIFETIME'])
        session.permanent = True
        logging.info(f"User {username} logged in successfully.")
        return jsonify({'message': 'Đăng nhập thành công', 'user': user.to_dict()}), 200
    logging.warning(f"Failed login attempt for username: {username}")
    return jsonify({'error': 'Tên đăng nhập hoặc mật khẩu không đúng'}), 401

@app.route(f'{API_PREFIX}/logout', methods=['POST'])
@login_required
def api_logout():
    user_display = current_user.username if current_user.is_authenticated else "Unknown user"
    logout_user()
    session.clear()
    logging.info(f"User {user_display} logged out.")
    return jsonify({'message': 'Đăng xuất thành công'}), 200

@app.route(f'{API_PREFIX}/check_auth', methods=['GET'])
def check_auth_status():
    if current_user.is_authenticated:
        return jsonify({'isLoggedIn': True, 'user': current_user.to_dict()}), 200
    return jsonify({'isLoggedIn': False}), 200

# --- API cho Products ---
@app.route(f'{API_PREFIX}/products', methods=['GET'])
@login_required
def get_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search_term = request.args.get('search', '')
    query = Product.query.order_by(Product.updated_at.desc())
    if search_term:
        query = query.filter(
            (Product.name.ilike(f'%{search_term}%')) |
            (Product.code.ilike(f'%{search_term}%'))
        )
    total_products = query.count()
    products_paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'products': [p.to_dict() for p in products_paginated.items],
        'total_products': total_products,
        'total_pages': products_paginated.pages,
        'current_page': products_paginated.page,
        'per_page': per_page
    })

@app.route(f'{API_PREFIX}/products/all_for_export', methods=['GET'])
@login_required
def get_all_products_for_export():
    products = Product.query.filter(Product.quantity > 0).order_by(Product.name).all()
    return jsonify([{'code': p.code, 'name': p.name, 'quantity': p.quantity, 'price': float(p.price)} for p in products])

@app.route(f'{API_PREFIX}/products', methods=['POST']) # Nhập kho / Thêm mới
@login_required
def add_or_update_product():
    name = request.form.get('name')
    code = request.form.get('code')
    quantity_str = request.form.get('quantity')
    price_str = request.form.get('price')
    image_file = request.files.get('image')

    if not name or not code or quantity_str is None or price_str is None:
        return jsonify({'error': 'Tên, Mã SP, Số lượng, Giá là bắt buộc.'}), 400
    try:
        quantity = int(quantity_str)
        price = float(price_str)
        if quantity <= 0 or price < 0:
            return jsonify({'error': 'Số lượng phải lớn hơn 0 và Giá không thể âm.'}), 400
    except ValueError:
        return jsonify({'error': 'Số lượng hoặc Giá phải là số hợp lệ.'}), 400

    image_url_path = None
    if image_file and image_file.filename != '':
        # Thêm kiểm tra loại file và giới hạn kích thước
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if '.' not in image_file.filename or image_file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'error': 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận png, jpg, jpeg, gif.'}), 400
        
        # Lưu ảnh mới
        _, extension = os.path.splitext(image_file.filename)
        filename = str(uuid.uuid4()) + extension
        filepath_on_disk = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            image_file.save(filepath_on_disk)
            image_url_path = f"/uploads/{filename}"
        except Exception as e:
            logging.error(f"Lỗi lưu file hình ảnh: {e}")
            return jsonify({'error': f'Lỗi lưu file hình ảnh: {str(e)}'}), 500
    
    try:
        existing_product = Product.query.filter_by(code=code).first()
        action_message = ""
        target_product = None

        if existing_product:
            existing_product.name = name
            existing_product.quantity += quantity
            existing_product.price = price
            if image_url_path:
                if existing_product.image_url:
                    old_image_path_on_disk = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(existing_product.image_url))
                    if os.path.exists(old_image_path_on_disk):
                        try: os.remove(old_image_path_on_disk)
                        except Exception as e_rem: logging.warning(f"Không xóa được ảnh cũ: {e_rem}")
                existing_product.image_url = image_url_path
            target_product = existing_product
            action_message = f"Đã cập nhật '{name}' (Mã: {code}). SL mới: {existing_product.quantity}"
        else:
            new_product = Product(name=name, code=code, quantity=quantity, price=price, image_url=image_url_path)
            db.session.add(new_product)
            target_product = new_product
            action_message = f"Đã thêm mới '{name}' (Mã: {code}), SL: {quantity}"
        
        db.session.commit()

        new_transaction = Transaction(
            product_id=target_product.id, type='import', quantity=quantity,
            price_per_unit=price, description=f"Nhập kho {quantity} '{target_product.name}'"
        )
        db.session.add(new_transaction)
        db.session.commit()
        
        return jsonify({'message': action_message, 'product': target_product.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi khi nhập kho: {e}", exc_info=True)
        # Bắt lỗi UNIQUE constraint cụ thể hơn
        if "UNIQUE constraint failed: products.code" in str(e):
             return jsonify({'error': 'Mã sản phẩm đã tồn tại, vui lòng dùng mã khác hoặc cập nhật sản phẩm hiện có.'}), 400
        return jsonify({'error': f'Lỗi server khi xử lý nhập kho: {str(e)}'}), 500

@app.route(f'{API_PREFIX}/products/export', methods=['POST'])
@login_required
def export_product():
    data = request.get_json()
    product_code = data.get('code')
    quantity_to_export_str = data.get('quantity')

    if not product_code or quantity_to_export_str is None:
        return jsonify({'error': 'Mã SP và Số lượng là bắt buộc.'}), 400
    try:
        quantity_to_export = int(quantity_to_export_str)
        if quantity_to_export <= 0: return jsonify({'error': 'Số lượng xuất > 0.'}), 400
    except ValueError: return jsonify({'error': 'Số lượng phải là số hợp lệ.'}), 400

    try:
        product = Product.query.filter_by(code=product_code).first()
        if not product: return jsonify({'error': f'Không tìm thấy SP với mã: {product_code}'}), 404
        if product.quantity < quantity_to_export:
            return jsonify({'error': f'Không đủ SL "{product.name}". Hiện có: {product.quantity}'}), 400

        product.quantity -= quantity_to_export
        new_transaction = Transaction(
            product_id=product.id, type='export', quantity=quantity_to_export,
            price_per_unit=product.price, description=f"Xuất kho {quantity_to_export} '{product.name}'"
        )
        db.session.add(new_transaction)
        db.session.commit()
        return jsonify({
            'message': f'Đã xuất {quantity_to_export} "{product.name}". SL còn lại: {product.quantity}',
            'product': product.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi khi xuất kho: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi server khi xử lý xuất kho: {str(e)}'}), 500

@app.route(f'{API_PREFIX}/products/<string:product_code>', methods=['PUT']) # Sửa thông tin sản phẩm
@login_required
def update_product_info(product_code):
    product = Product.query.filter_by(code=product_code).first()
    if not product: return jsonify({'error': 'Không tìm thấy sản phẩm'}), 404

    # Dữ liệu được gửi dưới dạng FormData vì có thể có file ảnh
    # Frontend sẽ gửi các trường name, quantity, price. Code là từ URL.
    new_name = request.form.get('name')
    new_quantity_str = request.form.get('quantity')
    new_price_str = request.form.get('price')
    image_file = request.files.get('image')
    
    updated_fields = []

    # Mã sản phẩm (code) KHÔNG ĐƯỢC THAY ĐỔI qua API PUT này
    # Nếu frontend muốn thay đổi code, cần một API khác hoặc quy trình khác.
    # Logic hiện tại đảm bảo code là readonly trên form.

    if new_name is not None: # Có thể là chuỗi rỗng
        new_name_stripped = new_name.strip()
        if not new_name_stripped:
            return jsonify({'error': 'Tên sản phẩm không được để trống.'}), 400
        if new_name_stripped != product.name:
            product.name = new_name_stripped
            updated_fields.append('tên')

    if new_quantity_str is not None:
        try:
            new_quantity = int(new_quantity_str)
            if new_quantity < 0: return jsonify({'error': 'Số lượng không thể âm.'}), 400
            if new_quantity != product.quantity:
                product.quantity = new_quantity
                updated_fields.append('số lượng')
        except ValueError: return jsonify({'error': 'Số lượng không hợp lệ.'}), 400

    if new_price_str is not None:
        try:
            new_price = float(new_price_str)
            if new_price < 0: return jsonify({'error': 'Giá không thể âm.'}), 400
            # So sánh float cẩn thận, hoặc chấp nhận cập nhật nếu có giá trị mới
            if new_price != float(product.price): # So sánh giá trị float
                product.price = new_price
                updated_fields.append('giá')
        except ValueError: return jsonify({'error': 'Giá không hợp lệ.'}), 400

    if image_file and image_file.filename != '':
        # Kiểm tra loại file và giới hạn kích thước
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if '.' not in image_file.filename or image_file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'error': 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận png, jpg, jpeg, gif.'}), 400

        # Xóa ảnh cũ nếu có
        if product.image_url:
            old_image_path_on_disk = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(product.image_url))
            if os.path.exists(old_image_path_on_disk):
                try: os.remove(old_image_path_on_disk)
                except Exception as e_rem: logging.warning(f"Không xóa được ảnh cũ: {e_rem}")
        
        # Lưu ảnh mới
        _, extension = os.path.splitext(image_file.filename)
        new_filename = str(uuid.uuid4()) + extension
        filepath_on_disk = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
        try:
            image_file.save(filepath_on_disk)
            product.image_url = f"/uploads/{new_filename}"
            updated_fields.append('hình ảnh')
        except Exception as e:
            logging.error(f"Lỗi lưu file ảnh khi cập nhật: {e}")
            return jsonify({'error': f'Lỗi lưu file ảnh: {str(e)}'}), 500
            
    if not updated_fields:
        return jsonify({'message': 'Không có thông tin nào được thay đổi.'}), 200

    try:
        db.session.commit()
        logging.info(f"Đã cập nhật sản phẩm mã: {product_code}. Các trường: {', '.join(updated_fields)}")
        return jsonify({'message': f'Đã cập nhật sản phẩm "{product.name}"', 'product': product.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi khi cập nhật SP: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

@app.route(f'{API_PREFIX}/products/<string:product_code>', methods=['DELETE'])
@login_required
def delete_product(product_code):
    product = Product.query.filter_by(code=product_code).first()
    if not product: return jsonify({'error': 'Không tìm thấy sản phẩm'}), 404
    try:
        if product.image_url:
            image_path_on_disk = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(product.image_url))
            if os.path.exists(image_path_on_disk):
                try: os.remove(image_path_on_disk)
                except Exception as e_rem: logging.warning(f"Không xóa được ảnh: {e_rem}")
        
        product_name_deleted = product.name
        db.session.delete(product)
        db.session.commit()
        logging.info(f"Đã xóa sản phẩm: {product_code}")
        return jsonify({'message': f'Đã xóa sản phẩm "{product_name_deleted}" (Mã: {product_code})'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi khi xóa SP: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

# --- API cho Transactions, Suppliers, Customers, Dashboard ---
@app.route(f'{API_PREFIX}/transactions', methods=['GET'])
@login_required
def get_transactions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    transactions_query = Transaction.query.order_by(Transaction.transaction_date.desc())
    total_transactions = transactions_query.count()
    transactions_paginated = transactions_query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'transactions': [t.to_dict() for t in transactions_paginated.items],
        'total_transactions': total_transactions,
        'total_pages': transactions_paginated.pages,
        'current_page': transactions_paginated.page,
        'per_page': per_page
    })

@app.route(f'{API_PREFIX}/transactions/<int:transaction_id>', methods=['DELETE'])
@login_required
def delete_transaction(transaction_id):
    transaction = Transaction.query.get(transaction_id)
    if not transaction: return jsonify({'error': 'Không tìm thấy giao dịch.'}), 404
    
    product = transaction.product
    if not product:
        # Nếu sản phẩm không còn, vẫn xóa giao dịch nhưng ghi log lỗi
        logging.error(f"Sản phẩm liên quan đến giao dịch {transaction_id} không còn tồn tại.")
        try:
            db.session.delete(transaction)
            db.session.commit()
            return jsonify({'message': 'Đã xóa giao dịch thành công (sản phẩm gốc không tồn tại).'}), 200
        except Exception as e:
            db.session.rollback()
            logging.error(f"Lỗi xóa giao dịch (khi sản phẩm không tồn tại): {e}", exc_info=True)
            return jsonify({'error': f'Lỗi server khi xóa giao dịch: {str(e)}'}), 500

    try:
        # Đã cải thiện: Logic hoàn tác số lượng sản phẩm khi xóa giao dịch
        if transaction.type == 'import':
            # Nếu là giao dịch nhập, khi xóa thì giảm số lượng tồn kho
            if product.quantity >= transaction.quantity:
                product.quantity -= transaction.quantity
                logging.info(f"Hoàn tác nhập kho: giảm {transaction.quantity} cho SP {product.code}. SL mới: {product.quantity}")
            else:
                # Trường hợp không đủ số lượng để hoàn tác (dữ liệu đã bị sửa thủ công hoặc lỗi khác)
                # Đặt về 0 hoặc cảnh báo nghiêm trọng
                logging.warning(f"CẢNH BÁO: Không đủ số lượng để hoàn tác nhập kho {transaction.quantity} cho SP {product.code}. SL hiện tại: {product.quantity}. Đặt về 0.")
                product.quantity = 0 # Hoặc bạn có thể raise lỗi và không cho phép xóa
        elif transaction.type == 'export':
            # Nếu là giao dịch xuất, khi xóa thì tăng số lượng tồn kho
            product.quantity += transaction.quantity
            logging.info(f"Hoàn tác xuất kho: tăng {transaction.quantity} cho SP {product.code}. SL mới: {product.quantity}")
        
        db.session.delete(transaction)
        db.session.commit()
        logging.info(f"Đã xóa giao dịch ID: {transaction_id} và hoàn tác số lượng sản phẩm.")
        return jsonify({'message': 'Đã xóa giao dịch thành công và hoàn tác số lượng sản phẩm.'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi xóa giao dịch: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

# --- API cho Suppliers ---
@app.route(f'{API_PREFIX}/suppliers', methods=['GET'])
@login_required
def get_suppliers():
    suppliers = Supplier.query.order_by(Supplier.name).all()
    return jsonify([s.to_dict() for s in suppliers])

@app.route(f'{API_PREFIX}/suppliers', methods=['POST'])
@login_required
def add_supplier():
    data = request.get_json()
    name = data.get('name', '').strip()
    contact_person = data.get('contact_person', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    address = data.get('address', '').strip()

    if not name: return jsonify({'error': 'Tên nhà cung cấp là bắt buộc.'}), 400
    # Thêm kiểm tra định dạng email/phone nếu cần
    if email and '@' not in email: return jsonify({'error': 'Email không hợp lệ.'}), 400
    if phone and not phone.isdigit(): return jsonify({'error': 'Số điện thoại không hợp lệ.'}), 400

    try:
        new_supplier = Supplier(
            name=name,
            contact_person=contact_person,
            phone=phone,
            email=email,
            address=address
        )
        db.session.add(new_supplier)
        db.session.commit()
        return jsonify({'message': 'Thêm nhà cung cấp thành công', 'supplier': new_supplier.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi thêm nhà cung cấp: {e}", exc_info=True)
        if "UNIQUE constraint failed: suppliers.name" in str(e):
            return jsonify({'error': 'Tên nhà cung cấp đã tồn tại.'}), 400
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

@app.route(f'{API_PREFIX}/suppliers/<int:supplier_id>', methods=['PUT'])
@login_required
def update_supplier(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier: return jsonify({'error': 'Không tìm thấy nhà cung cấp'}), 404
    data = request.get_json()
    
    name = data.get('name', '').strip()
    contact_person = data.get('contact_person', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    address = data.get('address', '').strip()

    if not name: return jsonify({'error': 'Tên nhà cung cấp là bắt buộc.'}), 400
    # Thêm kiểm tra định dạng email/phone nếu cần
    if email and '@' not in email: return jsonify({'error': 'Email không hợp lệ.'}), 400
    if phone and not phone.isdigit(): return jsonify({'error': 'Số điện thoại không hợp lệ.'}), 400

    try:
        supplier.name = name
        supplier.contact_person = contact_person
        supplier.phone = phone
        supplier.email = email
        supplier.address = address
        db.session.commit()
        return jsonify({'message': 'Cập nhật nhà cung cấp thành công', 'supplier': supplier.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi cập nhật nhà cung cấp: {e}", exc_info=True)
        if "UNIQUE constraint failed: suppliers.name" in str(e):
            return jsonify({'error': 'Tên nhà cung cấp đã tồn tại.'}), 400
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

@app.route(f'{API_PREFIX}/suppliers/<int:supplier_id>', methods=['DELETE'])
@login_required
def delete_supplier(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier: return jsonify({'error': 'Không tìm thấy nhà cung cấp'}), 404
    try:
        db.session.delete(supplier)
        db.session.commit()
        return jsonify({'message': 'Xóa nhà cung cấp thành công'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi xóa nhà cung cấp: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

# --- API cho Customers ---
@app.route(f'{API_PREFIX}/customers', methods=['GET'])
@login_required
def get_customers():
    customers = Customer.query.order_by(Customer.name).all()
    return jsonify([c.to_dict() for c in customers])

@app.route(f'{API_PREFIX}/customers', methods=['POST'])
@login_required
def add_customer():
    data = request.get_json()
    name = data.get('name', '').strip()
    contact_person = data.get('contact_person', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    address = data.get('address', '').strip()

    if not name: return jsonify({'error': 'Tên khách hàng là bắt buộc.'}), 400
    # Thêm kiểm tra định dạng email/phone nếu cần
    if email and '@' not in email: return jsonify({'error': 'Email không hợp lệ.'}), 400
    if phone and not phone.isdigit(): return jsonify({'error': 'Số điện thoại không hợp lệ.'}), 400

    try:
        new_customer = Customer(
            name=name,
            contact_person=contact_person,
            phone=phone,
            email=email,
            address=address
        )
        db.session.add(new_customer)
        db.session.commit()
        return jsonify({'message': 'Thêm khách hàng thành công', 'customer': new_customer.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi thêm khách hàng: {e}", exc_info=True)
        if "UNIQUE constraint failed: customers.name" in str(e):
            return jsonify({'error': 'Tên khách hàng đã tồn tại.'}), 400
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

@app.route(f'{API_PREFIX}/customers/<int:customer_id>', methods=['PUT'])
@login_required
def update_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer: return jsonify({'error': 'Không tìm thấy khách hàng'}), 404
    data = request.get_json()
    
    name = data.get('name', '').strip()
    contact_person = data.get('contact_person', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    address = data.get('address', '').strip()

    if not name: return jsonify({'error': 'Tên khách hàng là bắt buộc.'}), 400
    # Thêm kiểm tra định dạng email/phone nếu cần
    if email and '@' not in email: return jsonify({'error': 'Email không hợp lệ.'}), 400
    if phone and not phone.isdigit(): return jsonify({'error': 'Số điện thoại không hợp lệ.'}), 400

    try:
        customer.name = name
        customer.contact_person = contact_person
        customer.phone = phone
        customer.email = email
        customer.address = address
        db.session.commit()
        return jsonify({'message': 'Cập nhật khách hàng thành công', 'customer': customer.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi cập nhật khách hàng: {e}", exc_info=True)
        if "UNIQUE constraint failed: customers.name" in str(e):
            return jsonify({'error': 'Tên khách hàng đã tồn tại.'}), 400
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

@app.route(f'{API_PREFIX}/customers/<int:customer_id>', methods=['DELETE'])
@login_required
def delete_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer: return jsonify({'error': 'Không tìm thấy khách hàng'}), 404
    try:
        db.session.delete(customer)
        db.session.commit()
        return jsonify({'message': 'Xóa khách hàng thành công'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Lỗi xóa khách hàng: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500


# --- API cho Dashboard ---
@app.route(f'{API_PREFIX}/dashboard_stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    total_products_count = Product.query.count()
    low_stock_threshold = 10
    low_stock_products_count = Product.query.filter(Product.quantity <= low_stock_threshold).count()
    
    # Cải thiện: Lấy tổng nhập/xuất hôm nay chính xác hơn
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)

    imports_today_query = db.session.query(func.sum(Transaction.quantity)).filter(
        Transaction.type == 'import',
        Transaction.transaction_date >= today_start,
        Transaction.transaction_date <= today_end
    )
    total_imports_today = imports_today_query.scalar() or 0
    
    exports_today_query = db.session.query(func.sum(Transaction.quantity)).filter(
        Transaction.type == 'export',
        Transaction.transaction_date >= today_start,
        Transaction.transaction_date <= today_end
    )
    total_exports_today = exports_today_query.scalar() or 0

    return jsonify({
        'total_products': total_products_count,
        'low_stock_products': low_stock_products_count,
        'imports_today': int(total_imports_today),
        'exports_today': int(total_exports_today)
    })

@app.route(f'{API_PREFIX}/low_stock_products_list', methods=['GET'])
@login_required
def get_low_stock_products_list():
    low_stock_threshold = 10
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 5, type=int)
    products_query = Product.query.filter(Product.quantity <= low_stock_threshold).order_by(Product.quantity)
    low_stock_products_paginated = products_query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'products': [{'name': p.name, 'code': p.code, 'quantity': p.quantity} for p in low_stock_products_paginated.items],
        'total_pages': low_stock_products_paginated.pages,
        'current_page': low_stock_products_paginated.page,
        'per_page': per_page
    })

# --- API cho Báo cáo (MỚI / CẢI TIẾN) ---
@app.route(f'{API_PREFIX}/reports/total_inventory_value', methods=['GET'])
@login_required
def get_total_inventory_value_report():
    try:
        # Tính tổng giá trị tồn kho: Sum(quantity * price)
        total_value = db.session.query(func.sum(Product.quantity * Product.price)).scalar()
        total_value = float(total_value) if total_value is not None else 0.0
        return jsonify({'total_value': total_value}), 200
    except Exception as e:
        logging.error(f"Lỗi khi tính tổng giá trị tồn kho: {e}", exc_info=True)
        return jsonify({'error': 'Không thể tính tổng giá trị tồn kho.'}), 500

@app.route(f'{API_PREFIX}/reports/import_export_summary', methods=['GET'])
@login_required
def get_import_export_summary_report():
    # Ví dụ: Báo cáo nhập xuất theo tháng trong 6 tháng gần nhất
    # Dữ liệu thực tế từ bảng Transaction
    try:
        summary_data = []
        
        # Lấy 6 tháng gần nhất
        today = datetime.utcnow()
        months = []
        for i in range(6):
            # Lấy tháng và năm của tháng hiện tại trừ đi i tháng
            target_month = (today - timedelta(days=30*i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            months.insert(0, target_month) # Thêm vào đầu để có thứ tự tăng dần

        for month_start_dt in months:
            month_end_dt = (month_start_dt + timedelta(days=32)).replace(day=1) - timedelta(seconds=1) # Cuối tháng
            month_label = month_start_dt.strftime('%m/%Y') # Format tháng/năm

            # Tổng nhập trong tháng
            imports_in_month = db.session.query(func.sum(Transaction.quantity)).filter(
                Transaction.type == 'import',
                Transaction.transaction_date >= month_start_dt,
                Transaction.transaction_date <= month_end_dt
            ).scalar() or 0

            # Tổng xuất trong tháng
            exports_in_month = db.session.query(func.sum(Transaction.quantity)).filter(
                Transaction.type == 'export',
                Transaction.transaction_date >= month_start_dt,
                Transaction.transaction_date <= month_end_dt
            ).scalar() or 0

            summary_data.append({
                'month': month_label,
                'imports': int(imports_in_month),
                'exports': int(exports_in_month)
            })
        
        return jsonify({'summary': summary_data}), 200
    except Exception as e:
        logging.error(f"Lỗi khi lấy báo cáo nhập xuất: {e}", exc_info=True)
        return jsonify({'error': 'Không thể lấy báo cáo nhập xuất.'}), 500

@app.route(f'{API_PREFIX}/reports/top_products_by_quantity', methods=['GET'])
@login_required
def get_top_products_by_quantity_report():
    # Ví dụ: Top 5 sản phẩm tồn kho nhiều nhất
    try:
        top_products = Product.query.order_by(Product.quantity.desc()).limit(5).all()
        return jsonify({
            'top_products': [{'name': p.name, 'code': p.code, 'quantity': p.quantity} for p in top_products]
        }), 200
    except Exception as e:
        logging.error(f"Lỗi khi lấy top sản phẩm tồn kho: {e}", exc_info=True)
        return jsonify({'error': 'Không thể lấy top sản phẩm tồn kho.'}), 500

def initialize_database():
    with app.app_context():
        db.create_all()
        # Tạm thời comment phần tạo người dùng admin để deploy trước
        # if not User.query.filter_by(username='admin').first():
        #     admin_user = User(username='admin', role='admin') # Dòng này gây lỗi
        #     admin_user.set_password('admin123')
        #     db.session.add(admin_user)
        #     db.session.commit()
        #     logging.info("Đã tạo người dùng admin mặc định (admin/admin123). VUI LÒNG THAY ĐỔI MẬT KHẨU NÀY!")

if __name__ == '__main__':
    initialize_database()
    app.run(debug=False, port=os.environ.get('PORT', 5000)) # Sử dụng PORT từ env nếu có
