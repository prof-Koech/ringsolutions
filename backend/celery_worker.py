from app import create_app
from app.extensions import celery

app = create_app()

with app.app_context():
    # Import all tasks to register them
    import app.tasks.campaign_tasks  # noqa

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
