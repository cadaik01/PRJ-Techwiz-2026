"""
Module: config.settings
Description: Central Django configuration - MySQL (InnoDB), JWT auth, CORS, Redis
             cache and channel layer.
"""

import os
from datetime import timedelta
from pathlib import Path

from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-change-this-before-deploying')
DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party libraries
    'rest_framework',
    'rest_framework_simplejwt',
    'simple_history',
    'corsheaders',
    'drf_spectacular',
    'channels',

    # Project applications
    'core',
    'system',
    'accounts',
    'notifications',
    'markets',
    'catalog',
    'orders',
    'reviews',
    'favorites',
    'manager',
]

MIDDLEWARE = [
    'core.middleware.RequestIDMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'simple_history.middleware.HistoryRequestMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Every developer works against MySQL directly: a schema built on SQLite and then
# moved to MySQL hides collation, strict-mode and DDL differences until demo day.
if not os.environ.get('DB_NAME'):
    raise ImproperlyConfigured(
        'DB_NAME is not set. Copy backend/.env.example to backend/.env and point it '
        'at a MySQL 8 database created with utf8mb4 / utf8mb4_0900_ai_ci.'
    )

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        # Must stay False: a request-wide transaction would roll back the
        # audit_logs row written when the request fails.
        'ATOMIC_REQUESTS': False,
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'isolation_level': 'read committed',
        },
        'TEST': {
            'CHARSET': 'utf8mb4',
            'COLLATION': 'utf8mb4_0900_ai_ci',
        },
        'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '0')),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

AUTH_USER_MODEL = 'accounts.CustomUser'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# TEXT instead of VARCHAR(100) for history_change_reason, so a long FSM reason does
# not hit MySQL error 1406. Must be set before the first migrate.
SIMPLE_HISTORY_HISTORY_CHANGE_REASON_USE_TEXT_FIELD = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.ProjectJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.utils.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # High enough that the jury testing from one IP is never blocked.
        'anon': '2000/hour',
        'user': '5000/hour',
        'auth': '5/minute',
        'export': '10/hour',
    },
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'PRJ-Techwiz 2026 API',
    'VERSION': '0.1.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Refresh rotation and the refresh-token blacklist live in
# accounts.services.token_service (cache-backed, no token_blacklist tables).
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173',
).split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + [
    'if-match',
    'idempotency-key',
    'x-request-id',
]
# content-disposition lets the browser read the Excel file name (Pass 4B §1.2, AD-26).
CORS_EXPOSE_HEADERS = ['x-request-id', 'content-disposition']

REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
USE_REDIS = os.environ.get('USE_REDIS', 'False').lower() in ('true', '1', 't')

# Redis backs the token blacklist, WebSocket tickets, throttling and the channel
# layer. The in-process fallback is single-worker only: counters, tickets and
# broadcasts do not cross workers. Switch Redis on before running more than one.
if USE_REDIS:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
        },
    }
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            # redis-py 8 defaults to a 5 s socket timeout, which kills the blocking
            # read channels-redis keeps open for each WebSocket and drops the socket.
            'CONFIG': {'hosts': [{'address': REDIS_URL, 'socket_timeout': None}]},
        },
    }
else:
    CACHES = {
        'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'},
    }
    CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    }

EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend',
)
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@prj-techwiz.local')

# Lifetime of a one-time WebSocket handshake ticket, in seconds.
WS_TICKET_TTL = int(os.environ.get('WS_TICKET_TTL', '30'))
