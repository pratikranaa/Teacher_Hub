from django.apps import AppConfig

class TeachingSessionsConfig(AppConfig):
    name = 'teaching_sessions'

    def ready(self):
        import teaching_sessions.signals