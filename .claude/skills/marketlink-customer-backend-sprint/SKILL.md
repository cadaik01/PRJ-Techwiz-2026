---
name: marketlink-customer-backend-72h-sprint
description: 72-hour implementation sprint for MarketLink Customer Backend (22 tables, 13 services, 26 architecture decisions, subagent-driven, manual commit)
---

# MarketLink Customer Backend 72-Hour Implementation Sprint

> **For Manual Executor (You):**
> 
> - Agents **will NOT commit or push** — you handle all git operations
> - Each task produces working, testable code ready to commit
> - After each task completes: `git add` → `git commit` → `git push`
> - ~50 tasks across 5 phases, each task 1-5 minutes of actual coding
> - Total: 72 hours of pure implementation

---

## Sprint Overview

**Goal:** Implement complete backend for 14 Customer use cases (8 modules: C1-C8) covering:
- ✅ **22 Database Tables** (3 tiers: Identity, Catalog/Locations, Transactional) per Pass 4A
- ✅ **13 Core Services** (pure Python functions in `core/services/`)
- ✅ **23 API Endpoints** with thin Views (<15 lines each) per Pass 4B
- ✅ **26 Architecture Decisions** (D-001 → D-026) per Requirement Analysis v4
- ✅ **75-80% Test Coverage** (Unit + Integration + E2E)

**Architecture:** Service-Oriented Design
- Thin Views (≤15 lines): deserialize → call service → respond
- Pure Services in `core/services/`: no request/response coupling
- Standard Error Envelope + Request ID tracing
- OCC (version + If-Match) for concurrent order updates
- FSM (8 states, 13 transitions) for Order lifecycle

**Tech Stack:**
- Backend: Django 5.x + DRF
- Database: MySQL 8.x (InnoDB, utf8mb4_0900_ai_ci)
- Auth: JWT (simplejwt)
- Testing: pytest + factory-boy
- WebSocket: Channels + Upstash Redis
- Email: Gmail SMTP + ThreadPoolExecutor
- AI: Gemini Flash API

---

## Global Constraints (Apply to ALL Tasks)

**From Design Doc & Pass 4B API Contract:**

- **Code Language:** English only (no Vietnamese in source code)
- **API Messages:** Vietnamese, user-friendly (in `message` field per envelope)
- **Error Codes:** English, machine-readable (e.g., `INSUFFICIENT_STOCK`)
- **Database:** MySQL 8.x LTS, InnoDB, `utf8mb4_0900_ai_ci` collation, `ATOMIC_REQUESTS = False`
- **Currency:** `DecimalField(max_digits=12, decimal_places=0)` for VND (D-020)
- **Coordinates:** `DecimalField(max_digits=9, decimal_places=6)` for lat/lng (D-012)
- **TimeField:** Naive datetime (no tzinfo), compare via `timezone.localtime()` in Python (D-007 cutoff, D-013 slots)
- **Concurrency Control:** OCC via `version` field + `If-Match` header on `orders` (D-006)
- **FSM:** 8 states (PLACED, ACCEPTED, READY_FOR_PICKUP, COMPLETED, CANCELLED, DECLINED, NO_SHOW, EXPIRED)
- **State Transitions:** 13 valid paths (T1-T13) per D-006, Triple-Gate Validation (400/403/422)
- **Stock Management:** Immediate deduction on PLACED (D-005), 4 guards vs spam orders, select_for_update() locking
- **Soft Delete:** Use `is_archived`, `is_active`, `is_hidden_by_admin` flags (D-017)
- **WebSocket:** One-Time Ticket via Redis GETDEL (D-010, Implementation Notes §2)
- **Audit Logging:** ATOMIC_REQUESTS=False → audit_logs outside atomic blocks (Implementation Notes §1)
- **Email:** ThreadPoolExecutor(max_workers=2) + on_commit callback, not Celery (D-010)
- **Throttling:** orders=10/hour (per user, D-005), chat=20/minute, login=5/minute, register=10/hour
- **Naming:**
  - Classes: `PascalCase`
  - Functions/Methods: `snake_case`
  - Files: `snake_case`
  - DB Tables: `snake_case` plural, `db_table` explicit
  - JSON Keys: `snake_case`

---

## 5 Phases × ~50 Tasks

### **Phase 0: Setup & Models (6h)**
- 0.1: Project setup, middleware, context, exceptions
- 0.2: Core models (BaseModel, AuditLog, OutboxEvent)
- 0.3: User models (CustomUser, Role, CustomerProfile)
- 0.4: Product & Market models
- 0.5: Order & OrderItem models
- 0.6: Review & Notification models
- 0.7: Serializers (Read/Write pairs)

### **Phase 1: Core Services (20h)**
- 1.1: auth.py (register, login, logout)
- 1.2: checkout.py (multi-farmer, all-or-nothing, 4 guards, idempotency, stock lock, notify)
- 1.3: order_management.py (FSM transitions, OCC, modify, expire)

### **Phase 2: Supporting Services (10h)**
- 2.1: search.py (full-text, filters)
- 2.2: favorites.py (toggle, reorder)
- 2.3: restock_alerts.py (signal handler, notify on stock 0→>0)
- 2.4: reviews.py (ProductReview, FarmerReview, reply)
- 2.5: notifications.py (in-app WebSocket + Email threading)
- 2.6: chat.py (Gemini Flash + Function Calling)
- 2.7: profile.py + dashboard.py (CRUD, aggregation)
- 2.8: geolocation.py (Haversine, Nominatim)
- 2.9: ws_ticket.py (Redis atomic ops)

### **Phase 3: API Endpoints & Views (8h)**
- 3.1: Auth endpoints (register, login, logout)
- 3.2: Order endpoints (5), Product (2), Market (2), Favorites (3), Reviews (2), Notifications (3), Chat (1), Dashboard (1), Profile (3)
- 3.3: URL routing & configuration

### **Phase 4: Testing (20h)**
- 4.1: Unit tests for services (5h)
- 4.2: Integration tests for endpoints (10h)
- 4.3: E2E tests (3h, optional)
- 4.4: Coverage report (2h)

### **Phase 5: Polish & Buffer (8h)**
- 5.1: Error handling & edge cases (3h)
- 5.2: Documentation & setup (3h)
- 5.3: Performance & security (2h)

---

## How to Execute This Sprint

### **Step 1: Create New Branch**
```bash
git checkout -b customer-backend-sprint-72h
```

### **Step 2: Create Project Structure**
```bash
mkdir -p backend/config backend/core/services backend/{accounts,products,orders,markets,favorites,reviews,notifications,chat,audit,tests/{test_services,test_api}}
touch backend/manage.py backend/requirements.txt backend/pytest.ini
```

### **Step 3: Invoke Subagent-Driven Development**

Use `superpowers:subagent-driven-development` to execute tasks:
- Each task gets a fresh subagent
- Subagent codes 1 feature (~2-5 min)
- No commits from subagent
- You commit manually after each feature

### **Step 4: After Each Task Completes**
```bash
# Review subagent's work
git status

# Stage changes
git add .

# Commit (you choose the message)
git commit -m "feat(phase0): task 0.1 project setup"

# Optional: push to remote
git push origin customer-backend-sprint-72h
```

### **Step 5: Repeat for 50 Tasks**
- ~72 hours total
- Subagent finishes, you commit
- Move to next task

---

## Execution Checklist

- [ ] **Phase 0 Complete** (6h): All models + serializers working
- [ ] **Phase 1 Complete** (20h): Core services tested (auth, checkout, order_management)
- [ ] **Phase 2 Complete** (10h): 9 supporting services
- [ ] **Phase 3 Complete** (8h): 23 API endpoints
- [ ] **Phase 4 Complete** (20h): 75-80% test coverage
- [ ] **Phase 5 Complete** (8h): Polish, docs, security

---

## 26 Architecture Decisions (D-001 → D-026)

**D-001 to D-021 (Core):**  
✅ Django 5 + DRF + MySQL 8 + CSS Modules (D-001)  
✅ 4 Actors: Admin, Farmer, Customer, Guest (D-002)  
✅ No online payment, no shipping, no cert validation (D-003)  
✅ Multi-farmer checkout → N independent orders, all-or-nothing (D-004)  
✅ Immediate stock deduction + 4 spam guards (D-005)  
✅ FSM 8 states, 13 transitions T1-T13, Triple-Gate validation (D-006)  
✅ Order cutoff per order (order_cutoff_hours), customer edits before cutoff (D-007)  
✅ Weekly stock template (weekly_default_quantity), no separate table (D-008)  
✅ Lazy expiry (quét lười) at 3 checkpoints, no Celery Beat (D-009)  
✅ In-app WebSocket (One-Time Ticket) + Email (ThreadPoolExecutor) (D-010)  
✅ Gemini Flash + Function Calling (4 read-only tools, no DB access) (D-011)  
✅ OpenStreetMap + React-Leaflet, free no API key (D-012)  
✅ PickupSlots repeat weekly (day_of_week, time), not daily (D-013)  
✅ Shared stock INT per product, unit=TextChoices (D-014)  
✅ Farmer suspended → all open orders → DECLINED + refund (D-015)  
✅ Reviews only when COMPLETED, 1 per item, soft-delete (D-016)  
✅ Soft delete via is_archived/is_active/is_hidden_by_admin (D-017)  
✅ Audit logs replace reports table, action=EXPORT_DATA (D-018)  
✅ 3 favorite tables (farmers, products, markets), reorder by current price (D-019)  
✅ VND currency, Vietnamese UI (D-020)  
✅ Multi-device JWT (no limit), Zustand+localStorage for cart (D-021)  

**D-022 to D-026 (Advanced):**  
✅ Market open_time/close_time shared daily, PickupSlots must fit window (D-022)  
✅ Market closures (holiday) + Farmer closures (weekly break) by date range (D-023)  
✅ Customer deactivation_reason mandatory when locked, visible on login fail (D-024)  
✅ Restock alert only when stock 0→>0 on active restock action (D-025)  
✅ Stall label (vị trí sạp) in farmer_markets + snapshot in orders (D-026)  

**Key Design Patterns:**  
✅ Service-Oriented Architecture (thin Views <15 lines, pure Services in `core/services/`)  
✅ Standard Error Envelope + request_id tracing  
✅ OCC for concurrent order updates  
✅ Transactional Outbox pattern for notifications  
✅ Django signals for restock alerts  
✅ select_for_update() for stock atomicity  

---

## To Reuse This Skill Later

If you start a new project/repo:
1. Copy this skill to `.claude/skills/marketlink-customer-backend-sprint/SKILL.md`
2. Run: `/marketlink-customer-backend-72h-sprint`
3. Subagents will follow the same 50-task breakdown

---

## Key References

- **Requirement Analysis v4:** `Document/doc/MarketLink_requirement_analysis_ok (4).md` (26 decisions D-001 to D-026)
- **Database Design (Pass 4A):** `Document/doc/MarketLink_Pass4_Database_Design.md` (22 tables, ERD, constraints)
- **API Contract (Pass 4B):** `Document/doc/MarketLink_Pass4B_API_Contract.md` (10-point freeze, 23 endpoints)
- **Implementation Notes:** `Document/doc/MarketLink_Implementation_Notes.md` (4 critical techniques)
- **5 Pass Playbook:** `Document/spec/spec_for_techwiz7.md` (Outside-In methodology)

## Important Notes

- **No Auto-Commit:** Agents will NOT run `git commit` or `git push`
- **Your Responsibility:** After each task, you run git commands (add → commit → push)
- **Fresh Subagent Per Task:** No context loss, maximum parallelization
- **Checkpoint After Each Phase:** Review, test, push before moving to next phase
- **4 Critical Techniques** (see Implementation Notes):
  1. Audit logging outside transaction atomicity (ATOMIC_REQUESTS=False)
  2. WebSocket ticket one-time use (Redis GETDEL atomic operation)
  3. Idempotency handling (Idempotency-Key header + Redis state machine)
  4. OCC conflict detection (version + If-Match → 409 Conflict)
- **72 Hours:** Real implementation time, not including your commit+push overhead

**Ready to start? Run:** `/marketlink-customer-backend-72h-sprint`
