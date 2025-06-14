# backend/config.py
import os

class Config:
    # Đường dẫn đến tệp CSDL warehouse.db ở thư mục cha của thư mục backend (tức là thư mục gốc của dự án)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')), 'warehouse.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Đảm bảo SECRET_KEY được lấy từ biến môi trường
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'SUPER_SECRET_DEV_KEY_DO_NOT_USE_IN_PROD_12345')
    # Thêm cấu hình cho phép các kiểu file ảnh
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    MAX_IMAGE_FILESIZE = 16 * 1024 * 1024 # 16 MB