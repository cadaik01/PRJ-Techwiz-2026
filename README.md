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
│   ├── core/                     # ROOT CONFIGURATION
│   │   ├── settings.py           # DB, Redis channel layer, CORS, SimpleJWT
│   │   ├── urls.py               # Root URLconf, mounts each app under /api/
│   │   ├── wsgi.py
│   │   ├── asgi.py               # Django ASGI + Channels router
│   │   ├── routing.py            # Root WebSocket URLconf for /ws/ routes
│   │   ├── models.py             # BaseModel (created_at, updated_at)
│   │   └── responses.py          # api_response() + envelope exception handler
│   │
│   ├── accounts/                 # ACCOUNTS & AUTHENTICATION
│   │   ├── models.py             # CustomUser (email login, open role field)
│   │   ├── admin.py
│   │   ├── permissions.py        # IsAdmin, IsStaff, IsOwner
│   │   ├── authentication.py     # JWT with a cache-backed revocation list
│   │   ├── services/             # token, password and ws-ticket logic
│   │   ├── auth/                 # login, logout, refresh, me, ws-ticket
│   │   └── urls.py               # mounted at /api/auth/
│   │
│   ├── notifications/            # REALTIME NOTIFICATIONS
│   │   ├── models.py             # durable Notification rows
│   │   ├── consumers.py          # WebSocket consumer, one-time ticket handshake
│   │   ├── routing.py            # ws/notifications/
│   │   ├── services.py           # push_notification(user_id, verb, payload)
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

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver        # http://localhost:8000
```

API docs: `http://localhost:8000/api/docs/`

Two defaults keep a fresh clone runnable with nothing else installed:

- **SQLite** until `DB_NAME` is set in `.env`, then PostgreSQL.
- **In-process cache and channel layer** until `USE_REDIS=True`. That fallback is
  single-process only: WebSocket broadcasts do not cross workers, and tickets do
  not survive a restart. Switch Redis on before running more than one worker.

For WebSockets under a production server:

```bash
daphne core.asgi:application
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
pytest                            # coverage report lands in htmlcov/
```

---

## 3. What is already wired

**Authentication.** `POST /api/auth/login/` returns an access/refresh pair plus the
profile. The frontend `axiosClient` retries a 401 once behind a single-flight
refresh queue, so a burst of parallel requests triggers one refresh rather than
one per request. Logout and password change revoke the current token through a
cache-backed revocation list, so it stops working immediately instead of at expiry.

**WebSocket handshake.** A browser cannot set an `Authorization` header on a
WebSocket, and a token in the query string ends up in proxy logs. Instead the
client calls `POST /api/auth/ws-ticket/` over authenticated HTTP, gets a random
30-second ticket, and presents it once during the handshake. Redeeming deletes it,
so a captured URL cannot be replayed. `useNotifications` fetches a fresh ticket per
connection attempt, which is what makes reconnects work.

**Notifications.** `push_notification(user_id, verb, payload)` writes the row first,
then broadcasts to that user's channel group. A recipient who was offline still
sees it when the bell loads.

**One response shape.** Every endpoint returns
`{success, message, data, errors}`, including handled errors: `core/responses.py`
installs a DRF exception handler so a serializer `ValidationError` comes back in
the same envelope as a success. The frontend `axiosClient` unwraps it, so feature
code sees the payload directly and reads field errors off `error.fieldErrors`.

**Object-level permissions.** `IsOwner` in `accounts/permissions.py` compares the
record's owner with the caller. Any endpoint addressing a record by id needs this
in addition to a role check, otherwise the id is guessable and the API is open to
IDOR.

---

## 4. Coding standard

`.claude/skills/techwiz-django-backend/SKILL.md` is the binding standard for
backend work: URL and JSON conventions, the response envelope, the model /
service / serializer / view split, audit logging, English-only source, and the
git attribution rules. Read it before the first commit. Claude Code loads it
automatically from this repo.

Two rules bite immediately:

- **Source is English only.** Names, comments, docstrings, error messages, commit
  messages. Vietnamese belongs in seed data and email templates, not in logic.
  Section 8 has the grep that checks it.
- **No AI attribution in commits.** No `Co-Authored-By:` for any assistant, no
  "generated with" line. GitHub counts contributors from the author, committer
  and that trailer, so one stray line puts a tool in the project's contributor
  list. Section 9 has the checks and the fix.

---

## 5. Adding the SRS apps

```bash
cd backend
python manage.py startapp <app_name>
```

1. Add `services/` for the business logic. Views stay thin: validate, call a
   service, return a response.
2. Add `'<app_name>'` to `INSTALLED_APPS` in `core/settings.py`.
3. Mount its routes in `core/urls.py`.
4. If it broadcasts over WebSocket, declare `websocket_urlpatterns` in the app's
   `routing.py` and append it in `core/routing.py`.

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

On the frontend, fill in `ROLES` in `config/constants.js`, copy `AppLayout` into a
layout per role, add `pages/<role>/`, and gate the branch with
`<RoleRoute allow={[ROLES.X]} />` in `AppRouter.jsx`.
