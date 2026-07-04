from flask import Flask
from .config import get_config
from .extensions import db, migrate, jwt, mail, cors, celery


def create_app(config_class=None):
    app = Flask(__name__)

    cfg = config_class or get_config()
    app.config.from_object(cfg)

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    # Celery
    celery.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"],
        task_serializer=app.config["CELERY_TASK_SERIALIZER"],
        result_serializer=app.config["CELERY_RESULT_SERIALIZER"],
        accept_content=app.config["CELERY_ACCEPT_CONTENT"],
        timezone=app.config["CELERY_TIMEZONE"],
        task_always_eager=app.config.get("CELERY_TASK_ALWAYS_EAGER", False),
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask

    # Blueprints
    from .api.auth import auth_bp
    from .api.campaigns import campaigns_bp
    from .api.contacts import contacts_bp
    from .api.wallet import wallet_bp
    from .api.templates import templates_bp
    from .api.webhooks import webhooks_bp
    from .api.reports import reports_bp
    from .api.admin import admin_bp
    from .api.notifications import notifications_bp
    from .api.subscribe import subscribe_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(campaigns_bp, url_prefix="/api/campaigns")
    app.register_blueprint(contacts_bp, url_prefix="/api/contacts")
    app.register_blueprint(wallet_bp, url_prefix="/api/wallet")
    app.register_blueprint(templates_bp, url_prefix="/api/templates")
    app.register_blueprint(webhooks_bp, url_prefix="/api/webhooks")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(subscribe_bp, url_prefix="/api/subscribe")

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {"error": "Token has expired", "code": "TOKEN_EXPIRED"}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {"error": "Invalid token", "code": "INVALID_TOKEN"}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {"error": "Authorization token required", "code": "MISSING_TOKEN"}, 401

    # Sentry
    if app.config.get("SENTRY_DSN"):
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        sentry_sdk.init(dsn=app.config["SENTRY_DSN"], integrations=[FlaskIntegration()])

    @app.route("/api/health")
    def health():
        return {"status": "ok", "app": "RingSolutions API"}

    return app
