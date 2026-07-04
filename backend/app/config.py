import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "postgresql://ringsolutions:password@localhost:5432/ringsolutions_db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}

    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
    CELERY_TASK_SERIALIZER = "json"
    CELERY_RESULT_SERIALIZER = "json"
    CELERY_ACCEPT_CONTENT = ["json"]
    CELERY_TIMEZONE = "Africa/Nairobi"
    CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "false").lower() == "true"

    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "RingSolutions <noreply@ringsolutions.com>")

    # Africa's Talking
    AT_USERNAME = os.getenv("AT_USERNAME", "sandbox")
    AT_API_KEY = os.getenv("AT_API_KEY", "")
    AT_SHORTCODE = os.getenv("AT_SHORTCODE", "")
    AT_SENDER_ID = os.getenv("AT_SENDER_ID", "RingSol")

    # M-Pesa
    MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "")
    MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "")
    MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
    MPESA_PASSKEY = os.getenv("MPESA_PASSKEY", "")
    MPESA_CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "")
    MPESA_ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox")

    # WhatsApp
    WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v20.0")

    # Pricing (KES)
    SMS_PRICE_PER_MESSAGE = float(os.getenv("SMS_PRICE_PER_MESSAGE", "0.80"))
    WHATSAPP_PRICE_PER_MESSAGE = float(os.getenv("WHATSAPP_PRICE_PER_MESSAGE", "1.20"))
    CUSTOM_SENDER_ID_FEE = float(os.getenv("CUSTOM_SENDER_ID_FEE", "500.00"))
    MINIMUM_TOPUP = float(os.getenv("MINIMUM_TOPUP", "100.00"))

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5000")
    APP_NAME = os.getenv("APP_NAME", "RingSolutions")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB upload limit
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
    SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@ringsolutions.com")

    CORS_ORIGINS = [os.getenv("FRONTEND_URL", "http://localhost:5173")]

    SENTRY_DSN = os.getenv("SENTRY_DSN", "")


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False
    # SQLite doesn't support check_same_thread=True in multi-threaded Flask
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "connect_args": {"check_same_thread": False}} if "sqlite" in os.getenv("DATABASE_URL", "") else {"pool_pre_ping": True, "pool_recycle": 300}


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_ECHO = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config():
    env = os.getenv("FLASK_ENV", "development")
    return config_map.get(env, DevelopmentConfig)
