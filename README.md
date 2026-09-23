# PRJ-Techwiz 2026

Project skeleton for the PRJ-Techwiz 2026 build: **Django REST Framework** backend,
**React 19 + Vite** frontend, laid out per the team playbook.

The SRS has not been chosen yet, so nothing role-specific is in here. What is
present is the part every brief needs regardless of topic: authentication,
realtime notifications, route guards, and the UI primitives.

---

## 1. Layout

```
PRJ-Techwiz-2026/
├── .claude/skills/
│   └── techwiz-django-backend/   # team coding standard, loaded by Claude Code
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── config/                   # ROOT CONFIGURATION (no business code)
│   │   ├── settings.py           # MySQL, Redis, CORS, SimpleJWT, throttling
│   │   ├── urls.py               # Root URLconf, mounts each app under /api/
│   │   ├── wsgi.py
│   │   ├── asgi.py               # Django ASGI + Channels router
│   │   └── routing.py            # Root WebSocket URLconf for /ws/ routes
│   │
│   ├── core/                     # SHARED LAYER
│   │   ├── models.py             # BaseModel, HistoryRequestMeta
│   │   ├── utils.py              # api_response() + custom_exception_handler
│   │   ├── exceptions.py         # BusinessValidationError, ConflictError, ...
│   │   ├── middleware.py         # RequestIDMiddleware (X-Request-ID)
│   │   ├── context.py            # request_id ContextVar
│   │   ├── signals.py            # stamps request_id on history rows
│   │   ├── pagination.py         # StandardPagination (page_size 20, in `data`)
│   │   ├── policies/             # RoleCode, BasePolicy
│   │   └── services/ws_ticket.py # single-use WebSocket tickets
│   │
│   ├── system/                   # SECURITY AUDIT LOG (Super Admin)
│   │   ├── models.py             # AuditLog (table audit_logs, append-only)
│   │   ├── services.py           # log_security_event()
│   │   └── views.py              # GET /api/admin/audit-logs/
│   │
│   ├── accounts/                 # ACCOUNTS & AUTHENTICATION
│   │   ├── models.py             # Role, CustomUser (email login), Profile
│   │   ├── admin.py
│   │   ├── permissions.py        # HasRole, IsAdmin
│   │   ├── authentication.py     # JWT + cache-backed token blacklist
│   │   ├── services/             # auth, token rotation, password
│   │   ├── auth/                 # login, logout, refresh, me, ws-ticket
│   │   └── urls.py               # mounted at /api/auth/
│   │
│   ├── notifications/            # REALTIME NOTIFICATIONS
│   │   ├── models.py             # durable Notification rows
│   │   ├── consumers.py          # WebSocket consumer, one-time ticket handshake
│   │   ├── routing.py            # ws/notifications/
│   │   ├── services.py           # push_notification(user_id, title, ...)
│   │   ├── views.py              # list, mark read, mark all read
│   │   └── urls.py               # mounted at /api/notifications/
│   │
│   └── media/                    # local upload target during development
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── assets/
        ├── config/
        │   ├── env.js            # validates VITE_* variables at load
        │   └── constants.js      # ROLES, QUERY_KEYS, STORAGE_KEYS
        │
        ├── components/           # DOMAIN-AGNOSTIC UI
        │   ├── ui/               # Button, Input, Dialog, Dropdown, Select,
        │   │                     # Tabs, Badge, Table (Radix + Tailwind)
        │   ├── feedback/         # ErrorBoundary, PageSkeleton, EmptyState
        │   └── layout/           # AppHeader, AppSidebar
        │
        ├── features/             # ONE FOLDER PER DOMAIN
        │   ├── auth/             # authApi, useAuth, LoginForm,
        │   │                     # ChangePasswordForm, UserMenu
        │   └── notifications/    # notificationsApi, useNotifications,
        │                         # NotificationBell
        │
        ├── layouts/
        │   ├── AuthLayout.jsx    # centred card for signed-out screens
        │   └── AppLayout.jsx     # sidebar + header shell for signed-in screens
        │
        ├── pages/public/         # Login, Home, ChangePassword, Sitemap, 403, 404
        │
        ├── router/
        │   ├── AppRouter.jsx
        │   ├── ProtectedRoute.jsx   # blocks anonymous, forces password change
        │   ├── PublicOnlyRoute.jsx  # keeps signed-in users off /login
        │   └── RoleRoute.jsx        # role gate, ready for when roles exist
        │
        ├── stores/               # useAuthStore, useUIStore, useNotificationStore
        ├── lib/                  # axiosClient (401 refresh queue), queryClient, cn()
        └── utils/                # formatters, validators
```

---

## 2. Running it

### Backend

Every developer works against **MySQL 8** (8.4 LTS recommended), never SQLite:
settings refuse to start without `DB_NAME`. Create the database once:

```sql
CREATE DATABASE techwiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'techwiz_user'@'%' IDENTIFIED BY '<password>';
GRANT ALL PRIVILEGES ON techwiz_db.* TO 'techwiz_user'@'%';
GRANT ALL PRIVILEGES ON test_techwiz_db.* TO 'techwiz_user'@'%';   -- pytest
```

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt   # Linux needs default-libmysqlclient-dev pkg-config

cp .env.example .env              # fill in DB_NAME, DB_USER, DB_PASSWORD

python manage.py migrate          # also seeds the ADMIN role
python manage.py createsuperuser  # gets the ADMIN role automatically
python manage.py runserver        # http://localhost:8000
```

API docs: `http://localhost:8000/api/docs/`

The cache and channel layer stay **in-process** until `USE_REDIS=True`. That
fallback is single-process only: WebSocket broadcasts, tickets, throttle counters
and the token blacklist do not cross workers or survive a restart. Switch Redis on
before running more than one worker.

For WebSockets under a production server:

```bash
daphne config.asgi:application
```

### Frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

Vite proxies `/api`, `/media` and `/ws` to `http://localhost:8000`, so local
development involves no CORS preflight.

### Tests

```bash
cd backend
pytest                            # runs against MySQL (test_<DB_NAME>); coverage in htmlcov/
```

---

## 3. What is already wired

**Authentication.** `POST /api/auth/login/` returns an access/refresh pair plus the
profile. `POST /api/auth/refresh/` rotates: it returns a new pair and blacklists the
old refresh token, so a stolen refresh token that was already used gets
`TOKEN_BLACKLISTED`. Logout blacklists the access token and the refresh token the
client sends; password change blacklists the access token. The blacklist lives in
the cache (`blacklist:<jti>` with the token's remaining lifetime as TTL), so no
`token_blacklist` tables grow in MySQL. The frontend `axiosClient` retries a 401
once behind a single-flight refresh queue and stores the rotated refresh token.

**WebSocket handshake.** A browser cannot set an `Authorization` header on a
WebSocket, and a token in the query string ends up in proxy logs. Instead the
client calls `POST /api/auth/ws-ticket/` over authenticated HTTP, gets a random
30-second ticket, and presents it once during the handshake. Redeeming deletes it,
so a captured URL cannot be replayed (close code 4401). The socket joins
`user_<id>` and `role_<ROLE>` groups.

**Notifications.** `push_notification(user_id=..., title=..., message=..., level=...,
target_url=...)` writes the row first, then broadcasts `{"event": "NEW_NOTIFICATION",
"data": {...}}` once the transaction commits. A recipient who was offline still
sees it when the bell loads.

**One response shape.** Every endpoint returns
`{success, message, request_id, data, errors}`, and failures add `code`:
`core/utils.py` renders every exception in the same envelope, mapping DRF, Django
and MySQL errors (1062/1451/1452 → 409, 1213 → 409 `CONCURRENCY_DEADLOCK`, 1406 →
400) to the error catalog in the skill. `message` is Vietnamese for the end user;
`code` and `errors` are English. Unhandled errors return a generic 500 with no
internals. `X-Request-ID` ties the response, the log line and the audit row together.

**Security audit log.** Logins (successful or not), logouts, password changes and
every 403 are written to `audit_logs`, outside any business transaction, with
passwords and tokens stripped. The Super Admin reads it at `GET /api/admin/audit-logs/`.

**Authorization.** `accounts/permissions.py` checks the caller's role at view level
only. Object-level access belongs in each app's `policies.py` (subclassing
`core.policies.base.BasePolicy`) plus queryset scoping in `get_queryset()`, which
turns someone else's id into a 404.

---

## 4. Coding standard

`.claude/skills/techwiz-django-backend/SKILL.md` is the binding standard for
backend work, and `docs/spec_for_techwiz7.md` is the playbook from brief to
delivery. Read both before the first commit. Claude Code loads the skill
automatically from this repo.

Two rules bite immediately:

- **Language split.** Code, comments, `code` and `errors` are English; the
  `message` shown to users is Vietnamese.
- **No AI attribution in commits.** No `Co-Authored-By:` for any assistant, no
  "generated with/by" line. GitHub counts contributors from the author, committer
  and that trailer, so one stray line puts a tool in the project's contributor
  list. Section 16 of the skill has the checks and the fix.

---

## 5. Adding the SRS apps

```bash
cd backend
python manage.py startapp <app_name>
```

1. Add `services/` for the business logic. Views stay thin: validate, call a
   service, return a response.
2. Add `'<app_name>'` to `INSTALLED_APPS` in `config/settings.py`.
3. Mount its routes in `config/urls.py`.
4. If it broadcasts over WebSocket, declare `websocket_urlpatterns` in the app's
   `routing.py` and append it in `config/routing.py`.

Once the brief names the actors, split any app serving several audiences into
role folders, so two people can work on the same domain without colliding and a
customer serializer can never expose a manager's fields:

```
<app>/
├── services/
├── <role_a>/     views_<role_a>.py, serializers_<role_a>.py, urls_<role_a>.py
├── <role_b>/     views_<role_b>.py, serializers_<role_b>.py, urls_<role_b>.py
└── urls.py       combines both, mounted as /api/<role>/<resource>/
```

Add the actors to `RoleCode` (`core/policies/roles.py`) and seed them in an
`accounts` data migration next to `0002_seed_roles.py`.

On the frontend, fill in `ROLES` in `config/constants.js`, copy `AppLayout` into a
layout per role, add `pages/<role>/`, and gate the branch with
`<RoleRoute allow={[ROLES.X]} />` in `AppRouter.jsx`.
