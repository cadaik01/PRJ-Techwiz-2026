# MarketLink — eGreen Basket (TechWiz 7)

MarketLink connects local farmers with shoppers at traditional markets. Customers pre-order
produce from one or more farmers and pick it up at the farmer's stall on a chosen day and time
slot; farmers manage their stall, products, weekly stock and orders; administrators approve
farmers, run the markets and moderate content.

- **Backend**: Django 5.2 + Django REST Framework, MySQL 8 (InnoDB), SimpleJWT, Channels + Daphne, Redis
- **Frontend**: React 19 + Vite
- **Language & currency**: the whole UI, every API `message`, notification and email is in English; prices are in USD
- **Payment & delivery**: out of scope — cash on pickup at the stall (SRS §1.5)

---

## 1. Documentation

| File | Purpose |
| :--- | :--- |
| `Document/SRS_End-to-End Web Solutions/…_SRS.pdf` | Original requirement specification |
| `Document/doc/MarketLink_requirement_analysis_ok (4).md` | Single source of truth: decision log (D-001 → D-027), FR/NFR register, screen specs, database design, frozen API contract and Error Catalog |
| `Document/doc/MarketLink_Implementation_Notes.md` | Four mandatory implementation rules (audit logging outside transactions, one-time WebSocket tickets, lock ordering, CORS headers) |
| `Document/doc/MarketLink_phan_cong(new).md` | Work split across the Customer, Farmer and Admin branches, with cross-branch deadlines |
| `Document/skill/SKILL.md` | Backend coding standard (folder layout, response envelope, error codes, services, FSM, concurrency, audit, Git rules) |

When code and documents disagree, the requirement analysis wins; raise a change there first.

---

## 2. Repository layout

```
MarketLink-Project/
├── Document/                    # SRS, analysis, work split, coding standard
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── marketlink_core/         # project config + shared infrastructure
│   │   ├── settings.py  urls.py  asgi.py  wsgi.py
│   │   ├── models.py            # BaseModel, CreatedAtModel, HistoryRequestMeta, UUIDUploadTo
│   │   ├── exceptions.py        # Error Catalog (ErrorCode) + DomainError hierarchy
│   │   ├── responses.py         # api_response() + custom_exception_handler
│   │   ├── pagination.py        # StandardPagination (page_size 5 / 10 / 20)
│   │   ├── middleware.py        # RequestIDMiddleware (X-Request-ID)
│   │   ├── permissions.py       # IsCustomer, IsFarmer, IsAdmin
│   │   ├── http.py              # parse_if_match(), client_ip()
│   │   ├── policies/            # RoleCode, BasePolicy
│   │   └── services/            # run_with_deadlock_retry()
│   ├── accounts/                # users, roles, customer & farmer profiles
│   ├── markets/                 # markets, operating days, farmer stalls, pickup slots, closures
│   ├── catalog/                 # categories, products
│   ├── orders/                  # orders, order items, order status history (FSM audit trail)
│   ├── reviews/                 # product & farmer reviews
│   ├── favorites/               # favourite farmers, products, markets
│   ├── notifications/           # in-app notifications, announcements
│   ├── system/                  # audit_logs + log_security_event()
│   └── chat_bot/                # AI assistant (bonus, no tables)
└── frontend/
    └── src/                     # router, layouts, features/, components/, lib/axiosClient, stores
```

The database has 24 tables; the full data dictionary is in Pass 4A of the requirement analysis.

---

## 3. Running locally

### Backend

Requires Python 3.10+ and MySQL 8. Redis is optional for local development.

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # macOS / Linux: source venv/bin/activate
pip install -r requirements.txt

copy .env.example .env           # macOS / Linux: cp .env.example .env
# edit DB_NAME, DB_USER, DB_PASSWORD in .env, and create that database in MySQL (utf8mb4)

python manage.py migrate
python manage.py runserver       # http://localhost:8000
```

- API docs (Swagger): `http://localhost:8000/api/docs/`
- Django Admin (developer tool only): `http://localhost:8000/django-admin/`
- With `USE_REDIS=False` the cache and channel layer run in memory, which is fine for a single
  development process. Set `USE_REDIS=True` and `REDIS_URL` (Upstash uses `rediss://…`) before
  running more than one worker.
- Production / WebSocket server: `daphne marketlink_core.asgi:application`

### Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

Vite proxies `/api`, `/media` and `/ws` to `http://localhost:8000`.

---

## 4. Accounts and sign-in

| Role | How the account is created | Where to sign in |
| :--- | :--- | :--- |
| Customer | Self-registration | `/login` |
| Farmer | Self-registration, then approved by an administrator | `/login` |
| Admin | Provided by IT — `python manage.py createsuperuser` or the seed command; there is no sign-up or "create admin" screen | `/admin/login` |

`createsuperuser` asks for an email and password and assigns the `ADMIN` role automatically.
Sign-in is always by email. The demo administrator account used for grading will be listed here
once the seed data is finalised (SRS §1.9).

---

## 5. Team rules

- **Coding standard**: follow `Document/skill/SKILL.md` for all backend work.
- **English only** in source code, comments, API messages, notifications and emails.
- **Models and migrations**: only the lead (Farmer branch) edits `models.py` and runs
  `makemigrations`; other branches request schema changes.
- **One branch per role**: each branch owns its `[app]/[role]/` views, serializers and URLs and
  its `pages/[role]/` on the frontend; shared services are changed only by their owner.
- **Commits**: every member commits under their own GitHub identity. No AI attribution in commit
  messages or pull requests (no `Co-Authored-By:` for any assistant, no "Generated with" lines).
  Check before pushing:

  ```bash
  git log --format='%an <%ae> | %cn <%ce>' | sort -u
  git log --format='%B' | grep -inE '^co-authored-by:|generated with|anthropic'
  ```
