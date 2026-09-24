---
name: marketlink-feature-documentation
description: Auto-generate feature documentation after each task (summary, libraries, strengths, improvements, tradeoffs, Vietnamese presentation script)
---

# MarketLink Feature Documentation Generator

> **Purpose:** After each of the 50 tasks in the 72-hour sprint completes, generate comprehensive Vietnamese documentation that:
> 1. Summarizes what was built (feature summary)
> 2. Lists libraries & technologies used
> 3. Documents strengths & advantages (✅)
> 4. Documents improvements & limitations (⚠️)
> 5. Records tradeoffs made (why choice A over choice B)
> 6. Generates Vietnamese presentation script for demo/handover
>
> **Links to Architecture:** Each doc references relevant D-001 to D-026 decisions + Use Cases

---

## When to Use This Skill

**After each completed task (0.1, 0.2, 1.1, 1.2, etc), run:**

```bash
/marketlink-feature-documentation
```

**Input:** Feature name, UC covered, files modified/created, commit hash + message  
**Output:** `docs/features/PHASE_X_TASK_Y_<feature-name>.md` (Vietnamese documentation + presentation script)

---

## Key References

**Use these docs to provide context in each feature doc:**

| Doc | Purpose | Link |
|-----|---------|------|
| Requirement Analysis v4 | 26 Architecture Decisions (D-001 to D-026) | `Document/doc/MarketLink_requirement_analysis_ok (4).md` |
| Database Design (Pass 4A) | 22 Tables, ERD, constraints | `Document/doc/MarketLink_Pass4_Database_Design.md` |
| API Contract (Pass 4B) | 23 Endpoints, response format, error codes | `Document/doc/MarketLink_Pass4B_API_Contract.md` |
| Implementation Notes | 4 Critical Techniques (Audit, WebSocket, Idempotency, OCC) | `Document/doc/MarketLink_Implementation_Notes.md` |

**When writing each feature doc, reference:**
- Relevant **D-NNN** decisions that affected this feature
- **UC-NNN** use cases this feature implements
- **§X** sections from Pass 4B API Contract if endpoints involved

---

## Output Format (Vietnamese)

Each feature doc will contain:

### 1. **Tóm Tắt Feature**
- Tên feature
- Mục đích (purpose)
- UC được cover (UC-01, UC-07, etc)
- Files được tạo/modify
- Commits (hash, message)

### 2. **Thư Viện & Dependencies Sử Dụng**
```markdown
### 📚 Thư Viện & Dependencies

| Thư viện | Phiên bản | Tác dụng | Lý do chọn |
|---------|----------|---------|-----------|
| django-rest-framework | ^3.14 | API framework | DRF chuẩn |
| djangorestframework-simplejwt | ^5.2 | JWT auth | SimpleJWT recommended |
| django-filter | ^23.0 | Query filtering | Search products |
| ... | ... | ... | ... |
```

### 3. **Điểm Tốt (Strengths) ✅**
- Gì works well?
- Performance benefits?
- Code quality?
- Test coverage?
- Architecture decisions?

### 4. **Điểm Cần Cải Thiện (Improvements) ⚠️**
- Gì có thể tối ưu hơn?
- Technical debt?
- Performance bottlenecks?
- Test gaps?
- Edge cases?

### 5. **Tradeoffs Đã Thực Hiện** 🔄
- Decision A vs B — chọn A vì sao?
- Tradeoff là gì?
- Cost/Benefit?

Example:
```markdown
### 🔄 Tradeoffs

| Decision | Alternative | Lý do Chọn | Tradeoff |
|----------|------------|-----------|----------|
| OCC via version + If-Match header | Pessimistic locking | DRF convention, scalable | Client must handle 409 |
| Subagent per task | Single long task | Focus, no context loss | More commits |
| Soft delete (is_archived) | Hard delete | Audit trail, recovery | Storage grows |
```

### 6. **Script Trình Bày (Vietnamese Presentation)**
```markdown
### 🎤 Script Trình Bày (Tiếng Việt)

**Tên Feature:** [Feature Name]

**Giới thiệu (30 giây):**
Hôm nay tôi sẽ giới thiệu feature [feature name] — một phần quan trọng của MarketLink.
Tính năng này giúp [user benefit].

**Chi tiết kỹ thuật (2 phút):**
- Kiến trúc: [Architecture]
- Model: [Models]
- Endpoint: [Endpoints]
- Logic xử lý: [Processing logic]

**Kết quả (1 phút):**
- Test coverage: 80%
- Performance: <100ms per request
- Deployment: Ready for production

**Q&A:**
[Anticipated questions and answers]
```

---

## Example Usage

**After Task 1.1 (auth.py) completes:**

```bash
# Feature info:
Feature: auth.py (register_customer, login_customer, logout_customer)
Phase: 1
Task: 1.1
Files: core/services/auth.py, accounts/models.py, tests/test_services/test_auth.py
UC: UC-01, UC-02

# Run skill:
/marketlink-feature-documentation
```

**Output:** `docs/features/PHASE_1_TASK_1.1_auth-service.md`

---

## What Gets Included in Each Doc

```markdown
# Phase 1, Task 1.1: Auth Service

**Tổng Tắc:**
- Feature Name: Authentication (Register, Login, Logout)
- Purpose: Handle customer registration and JWT token generation
- Use Cases: UC-01 (Register), UC-02 (Login/Logout)
- Files Created: core/services/auth.py, tests/test_services/test_auth.py
- Models Modified: accounts/models.py (CustomUser, Role, CustomerProfile)
- Commits: abc123 "feat(auth): register_customer, login_customer"

**📚 Thư Viện Sử Dụng:**
| Thư viện | Phiên bản | Tác dụng | Lý do |
| djangorestframework-simplejwt | 5.2 | JWT token generation | DRF standard |
| django.contrib.auth.hashers | builtin | Password hashing | Django standard |
| ... | ... | ... | ... |

**✅ Điểm Tốt:**
- ✅ JWT tokens (access + refresh) per RFC 7519
- ✅ Password hashing secure (PBKDF2)
- ✅ Tests cover: valid register, email exists, weak password, login fail
- ✅ Transaction atomic (user + profile created together)
- ✅ OCC-ready (CustomerProfile.version for future)

**⚠️ Điểm Cần Cải Thiện:**
- Email validation (regex check, not just format)
- Password strength meter on frontend
- Rate limiting on register endpoint (prevent brute force)
- 2FA/MFA support (future phase)
- Remember device option (D-021)

**🔄 Tradeoffs:**
| Decision | Alternative | Lý do | Tradeoff |
| Stateless JWT | Session cookie | Scalable, support D-021 multi-device | Client must store token |
| SimpleJWT library | Custom JWT | DRF standard, tested | Less control |
| Atomic transaction | Sequential create | Guarantee consistency | Slightly slower |

**🎤 Script Trình Bày:**

Giới thiệu (30s):
"Xin chào, hôm nay tôi giới thiệu hệ thống xác thực của MarketLink.
Khách hàng có thể đăng ký tài khoản và đăng nhập qua email.
Hệ thống dùng JWT token cho phép chia sẻ tài khoản giữa nhiều thiết bị trong gia đình."

Chi tiết (2m):
- Model: CustomUser với email làm username
- Service: 3 hàm (register, login, logout)
- JWT: Access token (15m) + Refresh token (7 ngày)
- Password: Hash với PBKDF2
- Khi đăng xuất: Refresh token đưa vào blacklist Redis

Kết quả (1m):
- Test: 100% pass (3 test cases)
- Coverage: 95%
- Performance: <50ms per auth request

Q&A:
Q: Tài khoản có thể chia sẻ không?
A: Có, D-021 cho phép đa phiên. Mỗi thiết bị có token riêng.

Q: Token hết hạn thì sao?
A: Dùng refresh token để lấy access token mới.

Q: Mật khẩu có bao giờ được reset không?
A: Có, trong UC-32 (change password feature).
```

---

## How to Generate Doc

**Manual process (for now):**

1. After task completes, collect:
   - Feature name + description
   - Files created/modified
   - Libraries added/used
   - What works well
   - What needs improvement
   - Tradeoffs made
   - Presentation script (Vietnamese)

2. Save to: `docs/features/PHASE_X_TASK_Y_<feature-name>.md`

3. Update: `docs/features/INDEX.md` (master list)

---

## Example Feature Docs to Generate

| Phase | Task | Feature | Doc |
|-------|------|---------|-----|
| 0 | 0.1 | Project Setup | `PHASE_0_TASK_0.1_setup.md` |
| 0 | 0.2 | Core Models | `PHASE_0_TASK_0.2_core-models.md` |
| 1 | 1.1 | Auth Service | `PHASE_1_TASK_1.1_auth-service.md` |
| 1 | 1.2 | Checkout (Complex) | `PHASE_1_TASK_1.2_checkout-service.md` |
| 1 | 1.3 | Order Management | `PHASE_1_TASK_1.3_order-management.md` |
| 2 | 2.1 | Search Service | `PHASE_2_TASK_2.1_search-service.md` |
| ... | ... | ... | ... |

---

## Tips for Documentation

**For Each Feature Doc:**

1. **Be specific:** Not "good code" but "OCC prevents race conditions on stock updates"
2. **Include numbers:** "95% test coverage", "<100ms response time"
3. **Link Decisions:** Reference D-001 to D-026 (architecture decisions)
4. **Link Use Cases:** Reference UC-01 to UC-34 (from requirement analysis)
5. **Tradeoffs matter:** Why JWT over sessions? Why soft delete over hard delete? Reference D-NNN for justification
6. **Vietnamese script is key:** Practice explaining to non-technical stakeholders (business context, benefits, Q&A)
7. **Performance metrics:** Response time, CPU, memory, test coverage
8. **Dependencies:** List all new libraries added + why (avoid bloat)
9. **Edge cases:** What failure scenarios are handled? What's missing?
10. **Security notes:** Any RBAC, OCC, idempotency, or audit considerations?

---

## Checklist Per Feature Doc

- [ ] Feature name + UC covered
- [ ] Files created/modified listed
- [ ] Commit hash + message
- [ ] Dependencies table (library, version, purpose, why)
- [ ] Strengths (✅) — 3-5 points
- [ ] Improvements (⚠️) — 2-4 points
- [ ] Tradeoffs table (decision, alternative, why, cost)
- [ ] Vietnamese presentation script (30s intro + 2m detail + 1m result + Q&A)
- [ ] Performance metrics (response time, coverage, etc)

---

## Example: How to Call This Skill

**After Task 1.2 (checkout.py) completes:**

```
Subagent finishes coding checkout_orders service.
You review: git diff core/services/checkout.py
You run: /marketlink-feature-documentation

Input:
- Feature: checkout_orders (multi-farmer, all-or-nothing, 4 guards, idempotency, stock lock, notify)
- Phase: 1
- Task: 1.2
- Files: core/services/checkout.py, tests/test_services/test_checkout.py
- UC: UC-07
- Commit: def456 "feat(checkout): multi-farmer orders, guards, stock lock (10h)"

Output:
docs/features/PHASE_1_TASK_1.2_checkout-service.md

Contains:
- Tóm tắt: Checkout 72h tạo N đơn độc lập, all-or-nothing, 4 chốt chặn
- Thư viện: Django ORM, Decimal field, TimeField, JSONField
- Điểm tốt: ✅ Concurrency safe (select_for_update), ✅ All-or-nothing atomicity, ✅ Idempotency via OutboxEvent
- Cải thiện: ⚠️ Haversine distance optimization, ⚠️ Cache farmer availability, ⚠️ Webhook retry logic
- Tradeoffs: Why lock by id order? Why OutboxEvent instead of Celery? Why customer profile lock?
- Script: "Hôm nay tôi trình bày checkout — tính năng phức tạp nhất của MarketLink..."
```

---

## Integration with 72h Sprint

After each of 50 tasks:

```
1. Subagent codes task
2. You review + commit
3. You run /marketlink-feature-documentation
4. Docs auto-generated → docs/features/
5. Move to next task

At the end of 72h:
- 50 feature docs
- Comprehensive technical record
- Vietnamese scripts for demo/presentation
- Tradeoff analysis for future refactoring
```

---

## Benefits

✅ **Technical Record:** Know what was built and why  
✅ **Knowledge Transfer:** Understand decisions and tradeoffs  
✅ **Demo Ready:** Vietnamese script for stakeholder presentation  
✅ **Future Maintenance:** Why was this chosen? Can we improve?  
✅ **Team Onboarding:** New team members learn architecture  
✅ **Architecture Decisions:** D-001 to D-021 traced to code  

---

**Ready to generate feature docs after each task?**

This skill will make your 72h sprint much more documented and presentable! 🎉
