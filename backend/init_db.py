# backend/init_db.py
from app import app, db, User
from flask_bcrypt import Bcrypt
import os
from sqlalchemy.exc import OperationalError

with app.app_context():
    try:
        print("Attempting to create database tables...")
        db.create_all()
        print("Database tables created/checked.")

        print("Checking for default admin user...")
        if not User.query.filter_by(username='admin').first():
            bcrypt = Bcrypt(app)
            admin_user = User(username='admin', role='admin')
            admin_user.password_hash = bcrypt.generate_password_hash('admin123').decode('utf-8')
            db.session.add(admin_user)
            db.session.commit()
            print("Default admin user created: admin/admin123")
        else:
            print("Admin user already exists.")
        db.session.close()
        print("Database initialization complete.")
    except OperationalError as e:
        print(f"ERROR: Database connection or operation failed: {e}")
        print("This might happen if the database is not ready or URL is incorrect.")
        # Exit with an error code so Render knows the build failed
        exit(1) # Rất quan trọng để Render biết build failed nếu DB lỗi
    except Exception as e:
        print(f"An unexpected error occurred during database initialization: {e}")
        exit(1) # Rất quan trọng để Render biết build failed nếu có lỗi khác