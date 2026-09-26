---
name: techwiz-django-backend
description: Quy chuẩn Backend Django REST Framework + MySQL 8 cho dự án MarketLink (Techwiz 7) — cấu trúc thư mục, envelope phản hồi, danh mục mã lỗi, Model/Service/Serializer/View, FSM đơn hàng, khóa đồng thời, audit, thông báo, WebSocket, chính sách English-only và quy tắc Git. Dùng khi viết hoặc review code backend, thiết kế endpoint, hoặc chuẩn bị commit.
---

# MarketLink — Django REST Framework Implementation Standard (MySQL 8)

## 0. Nguồn chuẩn & thứ tự ưu tiên

Khi các tài liệu mâu thuẫn, áp dụng theo thứ tự sau (cao → thấp):

1. `CLAUDE.md` / `GEMINI.md` ở thư mục gốc — luật cứng cho AI (không tự ý sửa file, không commit).
2. `Document/doc/MarketLink_requirement_analysis_ok (5).md` (bản v1.7, D-001 → D-035) — nguồn sự thật về nghiệp vụ, CSDL (Pass 4A), hợp đồng API (Pass 4B) và **danh mục mã lỗi (Pass 4B §2.5)**.
3. `Document/doc/MarketLink_Implementation_Notes.md` — 4 lưu ý kỹ thuật bắt buộc khi thi công.
4. File skill này (`Document/skill/SKILL.md`) — phương pháp lập trình và chữ ký hàm khung. Đây là **file skill chuẩn duy nhất** của dự án (cập nhật theo tài liệu v1.7); mọi bản skill khác (kể cả `django-backend_skill.md` nếu chưa được đồng bộ) đều cũ, không dùng.

Skill này **không** định nghĩa lại nghiệp vụ. Mọi tên trường, endpoint, trạng thái, mã lỗi phải lấy đúng từ tài liệu phân tích; tuyệt đối không suy đoán.

---

## 1. Chính sách ngôn ngữ — 100% tiếng Anh

Toàn bộ những gì nằm trong repo và những gì hệ thống trả ra cho người dùng đều bằng **tiếng Anh**. Quy tắc này thay thế mọi chỗ trong tài liệu phân tích ghi "`message` tiếng Việt".

| Hạng mục | Ngôn ngữ |
| :--- | :--- |
| Tên biến, hàm, class, module, thư mục, file, migration (`--name`) | English |
| Comment, docstring, log message | English |
| `message` trong envelope API | **English** (câu ngắn, thân thiện với người dùng cuối) |
| `errors` (thông báo lỗi theo trường) | English |
| `code` (mã lỗi), enum, `AuditAction` | English `UPPER_SNAKE_CASE` |
| Tiêu đề / nội dung thông báo in-app (`notifications.title`, `notifications.message`) | English |
| Email (subject, template HTML/TXT) | English |
| `change_reason` do hệ thống sinh (ví dụ tóm tắt sửa đơn, sự kiện yêu cầu thay đổi) | English — ví dụ `"Customer modified: Tomato 5→8 KG"` |
| Nhãn `TextChoices`, `verbose_name`, `help_text`, Django Admin `fieldsets` | English |
| Dữ liệu hệ thống seed bằng migration (tên role…) | English |
| Commit message, tên branch, tiêu đề/mô tả Pull Request | English |

**Ngoại lệ duy nhất**: nội dung *dữ liệu demo* mô phỏng thực tế (tên chợ, tên người, địa chỉ, tên sản phẩm trong lệnh seed demo) được phép giữ tên riêng tiếng Việt vì đó là dữ liệu, không phải mã nguồn hay thông điệp hệ thống.

Quét ký tự có dấu tiếng Việt trước khi commit:

```bash
grep -rlP '[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]' \
  backend/ frontend/src/ \
  --exclude-dir=node_modules --exclude-dir=__pycache__ --exclude-dir=migrations
```

Lệnh không bắt được tiếng Việt không dấu (`don hang`) — phải tự soát khi review. File seed demo cố ý chứa tên tiếng Việt thì thêm `--exclude` đúng file đó.

---

## 2. Cấu trúc thư mục

```
backend/
├── manage.py
├── marketlink_core/            # Project package: config + shared infrastructure
│   ├── settings.py  urls.py  wsgi.py
│   ├── asgi.py                 # ProtocolTypeRouter; websocket_urlpatterns declared here (no routing.py)
│   ├── apps.py                 # ready() imports signals
│   ├── models.py               # BaseModel, CreatedAtModel, HistoryRequestMeta, UUIDUploadTo
│   ├── context.py              # request_id ContextVar
│   ├── signals.py              # attach request_id to simple-history rows
│   ├── middleware.py           # RequestIDMiddleware (reuses X-Request-ID only if it is a UUID)
│   ├── exceptions.py           # ErrorCode constants + DomainError hierarchy (Error Catalog)
│   ├── responses.py            # api_response() + custom_exception_handler
│   ├── pagination.py           # StandardPagination
│   ├── permissions.py          # IsCustomer, IsFarmer, IsAdmin
│   ├── http.py                 # parse_if_match(), client_ip(), normalize_request_id()
│   ├── views.py                # HealthCheckView — SY-01 GET /api/health/ (no auth, no throttle)
│   ├── policies/
│   │   ├── roles.py            # RoleCode
│   │   └── base.py             # BasePolicy
│   └── services/
│       ├── db_retry.py         # run_with_deadlock_retry()
│       ├── ws_ticket.py        # AU-08 one-time WebSocket ticket (Redis GETDEL; LocMem fallback for dev/test)
│       └── idempotency.py      # (not built yet — C2, Customer) Idempotency-Key two-phase lock
├── system/                     # AuditLog + log_security_event() (system/services.py);
│                               # management/commands/seed_minimal.py (P6 minimal seed)
├── accounts/                   # CustomUser, roles, profiles; auth endpoints in accounts/auth/:
│                               #   AU-02 (Farmer, đã làm — v1.8) + build_me() dùng chung; AU-01, AU-03 → AU-07 (not built yet — P2, Customer)
│                               # services/tokens.py — issue_token_pair(user) -> { access, refresh }; services/registration.py — register_farmer()
│                               # geocoding.py — geocode_address(address) -> (lat, lng) | None (Nominatim, D-032;
│                               #   timeout 5s, 1 req/s qua cache, lỗi trả None; settings NOMINATIM_URL, NOMINATIM_USER_AGENT, GEOCODING_ENABLED)
│                               # operating_days.py — normalize_operating_days() (D-031)
│                               # selectors.py — build_farmer_public(), build_farmer_own_profile()
│                               #   (FarmerPublic dùng chung cho FA-02, PU-07, AD-03)
│                               # services/farmer_profile.py — update_farmer_profile() (FA-03); farmer/ — FA-02, FA-03
├── markets/                    # selectors.py — build_market_summaries() (MarketSummary), serialize_pickup_slot(), serialize_closure()
│                               # services/validation.py — validate_pickup_date(); services/farmer_schedule.py — F3 (FA-05 → FA-10, FA-32, FA-33)
│                               # farmer/ — FA-04 → FA-10, FA-31 → FA-33 (3 nhóm URL: markets/, pickup-slots/, closures/)
├── notifications/              # services.py — notify(), serialize_notification() (một dạng Notification cho NO-01/NO-03 và payload WebSocket)
│                               # views.py + urls.py — NO-01 → NO-04 (Customer, Farmer; Admin 403), gắn tại api/notifications/
├── orders/                     # services/dashboard.py — resolve_date_range(), build_farmer_dashboard() (FA-01, D1–D4 v1.8)
├── reviews/                    # selectors.py — customer_display_name() (U-05), serialize_review(), farmer_reviews_of(), product_reviews_of()
│                               # services.py — reply_to_review() (FA-29/30, D-016); farmer/ — FA-28 → FA-30
├── catalog/  favorites/  chat_bot/
```

Mỗi app nghiệp vụ:

```
[app]/
├── models.py  admin.py  policies.py  selectors.py  urls.py
├── services/                   # business logic, FSM, locking
├── public/     views_public.py    serializers_public.py    urls_public.py
├── customer/   views_customer.py  serializers_customer.py  urls_customer.py
├── farmer/     views_farmer.py    serializers_farmer.py    urls_farmer.py
└── admin/      views_admin.py     serializers_admin.py     urls_admin.py
```

- Chỉ tạo thư mục role mà app đó thực sự cần.
- **Hai lớp đặt tên**:
  - **Tầng HTTP đặt theo role**: file trong `[role]/` bắt buộc có hậu tố `_[role]`, tên số nhiều — `views_farmer.py`, `serializers_admin.py`, `urls_customer.py`. Class cũng mang role: `OrderFarmerReadSerializer`, `DeclineOrderFarmerWriteSerializer`.
  - **Tầng service đặt theo miền nghiệp vụ**, không gắn role, vì nhiều role cùng gọi (ví dụ FSM được Farmer, Customer, Admin và System gọi).
- **`services.py` hay `services/`**: app chỉ có một nhóm service dùng file `services.py` (`notifications`, `system`); app có nhiều nhóm dùng thư mục `services/`, mỗi file là danh từ `snake_case` theo miền (`stock.py`, `fsm.py`, `expiry.py`), không thêm hậu tố `_service`, không trùng tên một app (tránh `orders/services/notifications.py`).
- **Service dùng chung đã có** (import đúng đường dẫn này, không viết lại; phần logic phải theo v1.7 — xem §6, §7): `catalog/services/stock.py` (`lock_products`, `apply_stock_delta`, `get_held_quantities`), `orders/services/fsm.py` (`TRANSITIONS`, `transition_order`, `record_order_placed`), `orders/services/expiry.py` (`expire_overdue_orders`), `orders/services/notification_context.py` (`build_order_context`), `notifications/services.py` (`notify`), `system/services.py` (`log_security_event`, `log_request_event`), `accounts/phone.py` (`normalize_phone` — mọi nơi nhận số điện thoại phải chuẩn hóa bằng hàm này trước khi kiểm tra trùng, D-028).
- **Service dùng chung chưa có (v1.7)** — nhánh phụ trách tạo đúng đường dẫn, chữ ký hàm chốt khi hiện thực rồi ghi bổ sung vào đây:
  - Hàm **kiểm tra tồn kho khả dụng** (chỉ đọc, không khóa, không trừ) trong `catalog/services/stock.py` — Farmer; dùng ở CU-04, CU-07 (D-029).
  - `validate_pickup_date()` trong `markets/services/` — Farmer; điều kiện ngày hợp lệ theo A-019 (gồm ngày hoạt động của Farmer, không phải ngày quá khứ).
  - `orders/services/change_request.py` — Farmer: chấp nhận / từ chối / tự hủy yêu cầu thay đổi (FA-34, FA-35, quét lười — D-030).
  - `orders/services/modify.py` — Customer: sửa đơn `PLACED` và **gửi** yêu cầu thay đổi (CU-07). File hiện có đang theo logic cũ (T7, trừ kho khi sửa) và phải viết lại theo D-030.
- **Chia service theo role thực hiện**: thao tác do role nào làm thì nhánh của role đó viết (ví dụ khách gửi yêu cầu thay đổi → Customer; Farmer xử lý → Farmer). Hai bên dùng chung dữ liệu thì phải theo đúng định dạng đã chốt ở Pass 4A (ví dụ `orders.pending_change`).
- **Lệnh quản trị** (`management/commands/`): động từ + danh từ `snake_case` — `seed_minimal`, `expire_orders`.
- **Audit trail (v1.8)**: `FarmerProfile`, `Product`, `Order`, `OrderItem`, `FarmerMarket`, `PickupSlot`, `FarmerClosure` có `HistoricalRecords`. Ghi vào các model này **phải** qua `save()` / `delete()` từng dòng hoặc `marketlink_core/history.py` (`save_with_history(instance, update_fields=..., reason=..., user=...)`, `delete_with_history(...)`; `user=None` = hành động hệ thống). **Cấm** `QuerySet.update()` và `bulk_create` thường trên các model này (mất dấu vết). `catalog/services/stock.py::apply_stock_delta(..., reason=, user=)` nhận lý do để ghi vào lịch sử kho. Đọc lịch sử: `system/selectors.py::build_change_log(model, object_id)`.
- **AD-16 (Admin đổi lịch chợ)**: khi tắt khung giờ của Farmer phải lưu từng dòng: `save_with_history(slot, update_fields=["is_active", "updated_at"], reason="Market schedule changed")`, không `PickupSlot.objects...update()`. AD-15 → AD-17 ghi `audit_logs` (`MARKET_CREATED` / `MARKET_UPDATED` / `MARKET_DEACTIVATED` / `MARKET_ACTIVATED`) sau khi commit, chỉ khi thành công.
- Mục đánh dấu **(not built yet)** là thiết kế đã chốt nhưng chưa có code: không import chúng; nhánh phụ trách tạo đúng đường dẫn và chữ ký đã ghi.
- Route WebSocket mới được thêm thẳng vào danh sách `websocket_urlpatterns` trong `marketlink_core/asgi.py`.
- `selectors.py`: hàm truy vấn chỉ đọc, dùng chung giữa các nhánh (ví dụ selector hiển thị công khai).
- Sở hữu code theo bảng phân công: mỗi nhánh chỉ sửa view/serializer/url của role mình; service dùng chung (FSM, kho, `notify()`, `validate_pickup_date()`) chỉ nhánh cung cấp được sửa; **chỉ Lead sửa `models.py` và chạy `makemigrations`**.

---

## 3. Hợp đồng API

### 3.1 Định tuyến (Pass 4B §1.1)

| Nhóm | Tiền tố | Quyền mặc định |
| :--- | :--- | :--- |
| Xác thực | `/api/auth/` | Theo endpoint |
| Công khai | `/api/public/` | `AllowAny` |
| Khách hàng | `/api/customer/` | `IsAuthenticated` + `IsCustomer` |
| Nông dân | `/api/farmer/` | `IsAuthenticated` + `IsFarmer` |
| Quản trị | `/api/admin/` | `IsAuthenticated` + `IsAdmin` |
| Thông báo | `/api/notifications/` | `IsAuthenticated` |
| Chat AI | `/api/chat/` | `AllowAny` |
| Hệ thống | `/api/health/` | `AllowAny` |
| WebSocket | `/ws/notifications/?ticket=<uuid>` | Vé 1 lần |

- Django Admin mount tại `/django-admin/` (không trùng `/api/admin/`); chỉ là công cụ cho dev, không phải trang quản trị của đề bài.
- Tài liệu API: `/api/schema/` (OpenAPI) và `/api/docs/` (Swagger UI), `AllowAny`.
- Tài nguyên: danh từ số nhiều `kebab-case`; 100% URL kết thúc bằng `/`.
- Hành động nghiệp vụ: động từ sau ID, luôn `POST` — `POST /api/farmer/orders/<int:id>/accept/`.
- ID trên URL luôn là số nguyên `<int:id>`; không thêm `public_id`/UUID.

### 3.2 Header chuẩn (Pass 4B §1.2)

| Header | Khi nào |
| :--- | :--- |
| `Authorization: Bearer <access>` | Endpoint cần đăng nhập |
| `If-Match: "<version>"` | Mọi thao tác ghi lên `orders` do Customer/Farmer thực hiện |
| `Idempotency-Key: <uuid4>` | `POST /api/customer/orders/` |
| `X-Request-ID` | Tùy chọn ở request; luôn có ở response |
| `Content-Disposition` | Response xuất Excel |
| `Idempotent-Replayed: true` | Response trả lại từ cache idempotency |

### 3.3 Envelope (Pass 4B §2.1)

```json
{
  "success": true,
  "message": "Order placed successfully",
  "request_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "data": {},
  "errors": {}
}
```

```json
{
  "success": false,
  "message": "Some items are out of stock",
  "code": "INSUFFICIENT_STOCK",
  "request_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "data": {},
  "errors": {
    "groups.0.items.1.quantity": ["Only 3 KG left."]
  }
}
```

- `code` chỉ có ở phản hồi lỗi.
- `errors`: `{ "<field.path>": ["<English message>"] }`; trường lồng dùng dấu chấm + chỉ số mảng; lỗi không gắn trường dùng `non_field_errors`.
- `204 No Content` không có body.
- Ngoại lệ duy nhất không bọc envelope: file Excel thành công của `GET /api/admin/reports/export/`.
- JSON key 100% `snake_case`; enum 100% `UPPER_SNAKE_CASE`.

### 3.4 Phân trang (Pass 4B §2.2)

```json
{
  "success": true,
  "message": "OK",
  "request_id": "…",
  "data": {
    "count": 134,
    "page": 2,
    "page_size": 20,
    "total_pages": 7,
    "next": 3,
    "previous": 1,
    "results": []
  },
  "errors": {}
}
```

- Query `page` (mặc định 1) và `page_size` chỉ nhận **5, 10, 20**; thiếu hoặc giá trị khác → dùng mặc định, không báo lỗi. Mặc định 20; review công khai 10 (`PublicReviewPagination`); dropdown chuông cố định 10 (qua `limit`).
- `data.page_size` luôn là giá trị thực sự được áp dụng; FE hiển thị bộ chọn "Rows per page: 5 / 10 / 20".
- `next` / `previous` là **số trang** hoặc `null`, không phải URL.
- Hiện thực bằng `StandardPagination(PageNumberPagination)` trong `marketlink_core/pagination.py`, override `get_paginated_response()` để trả qua `api_response()`.

### 3.5 Kiểu dữ liệu JSON (Pass 4B §2.3)

| Loại | Kiểu | Ví dụ |
| :--- | :--- | :--- |
| ID, số lượng | integer | `1024`, `5` |
| Tiền USD | chuỗi thập phân 2 chữ số (serializer `DecimalField(max_digits=10, decimal_places=2)`) | `"12.50"` |
| Tọa độ | number 6 chữ số thập phân | `10.772345` |
| Ngày | `YYYY-MM-DD` giờ Việt Nam | `"2026-09-26"` |
| Giờ trong ngày | `HH:MM` | `"07:00"` |
| Thời điểm | ISO 8601 có offset `+07:00` | `"2026-09-26T07:00:00+07:00"` |
| Thứ trong tuần | integer 1–7 (1 = Monday) | `6` |
| Ảnh | URL tuyệt đối hoặc `null` | |
| Danh sách trong query | phân cách dấu phẩy | `?status=PLACED,ACCEPTED` |

### 3.6 Mã HTTP thành công

`200` GET / PATCH / PUT / hành động `POST …/<action>/` · `201` tạo mới · `204` DELETE và `POST /api/auth/logout/`.

### 3.7 Chữ ký `api_response()` (`marketlink_core/responses.py`)

```python
def api_response(
    *,
    message: str,
    data: Any = None,
    status_code: int = 200,
    request: Any = None,
    code: str | None = None,
    errors: dict[str, list[str]] | None = None,
    headers: dict[str, str] | None = None,
) -> Response:
    """
    Wrap a payload in the standard envelope.

    request_id comes from request.id, falling back to marketlink_core.context.get_request_id().
    data defaults to {}; errors defaults to {}.
    When status_code >= 400, success is False and code is required; if omitted it falls back to
    DEFAULT_ERROR_CODES[status_code].
    """
```

`DEFAULT_ERROR_CODES` (chỉ dùng khi không truyền `code`):

| HTTP | Mã mặc định |
| :---: | :--- |
| 400 | `VALIDATION_ERROR` |
| 401 | `NOT_AUTHENTICATED` |
| 403 | `PERMISSION_DENIED` |
| 404 | `NOT_FOUND` |
| 409 | `RESOURCE_MODIFIED` |
| 422 | `FAILED_PRECONDITION` |
| 428 | `PRECONDITION_REQUIRED` |
| 429 | `THROTTLED` |
| 500 | `INTERNAL_SERVER_ERROR` |
| 503 | `AI_UNAVAILABLE` |

---

## 4. Danh mục mã lỗi (nguồn: Pass 4B §2.5)

Chỉ được dùng các mã dưới đây. Cần mã mới → đề xuất bổ sung vào tài liệu phân tích trước, không tự đặt trong code.

| HTTP | `code` | Khi nào |
| :---: | :--- | :--- |
| 400 | `VALIDATION_ERROR` | Dữ liệu sai định dạng / thiếu trường (gồm cả lỗi file upload) |
| 400 | `EMAIL_EXISTS` | Email đã đăng ký |
| 400 | `INSUFFICIENT_STOCK` | Thiếu hàng khi đặt / sửa đơn / gửi yêu cầu thay đổi (kiểm tra khả dụng), hoặc khi Farmer duyệt đơn / chấp nhận yêu cầu thay đổi (trừ kho — D-029) |
| 400 | `INVALID_STATUS_TRANSITION` | Gate 1: cạnh FSM không tồn tại |
| 401 | `NOT_AUTHENTICATED` | Thiếu / hết hạn access token |
| 401 | `INVALID_CREDENTIALS` | Sai email / mật khẩu |
| 401 | `TOKEN_INVALID` | Refresh token sai / đã thu hồi |
| 403 | `ACCOUNT_LOCKED` | `is_active = false`; chỉ trả khi mật khẩu đúng; `errors.reason` chứa lý do khóa (D-024) |
| 403 | `PERMISSION_DENIED` | Sai role cho nhánh API |
| 403 | `ACTION_NOT_PERMITTED_FOR_ROLE` | Gate 2 FSM |
| 403 | `FARMER_NOT_APPROVED` | Farmer chưa `APPROVED` tạo sản phẩm / mẫu tuần |
| 403 | `FARMER_SUSPENDED` | Farmer bị đình chỉ thực hiện thao tác ghi |
| 404 | `NOT_FOUND` | Không tồn tại **hoặc ngoài phạm vi sở hữu** |
| 409 | `RESOURCE_MODIFIED` | `If-Match` lệch `version` |
| 409 | `IDEMPOTENCY_IN_PROGRESS` | Cùng `Idempotency-Key` đang xử lý |
| 409 | `CONFLICT_RETRY` | Deadlock MySQL sau 1 lần retry |
| 422 | `OPEN_ORDER_LIMIT_EXCEEDED` | Vượt 10 đơn `PLACED` chưa qua `pickup_start_at` trên toàn sàn (D-005 v1.5); không giới hạn theo Farmer |
| 422 | `CUTOFF_PASSED` | Khách sửa / gửi yêu cầu thay đổi / hủy / đặt sau `cutoff_at` (không còn dùng cho Farmer từ chối đơn — v1.7) |
| 422 | `CUTOFF_NOT_REACHED` | Đánh dấu sẵn sàng trước `cutoff_at` (T9) |
| 422 | `PICKUP_ALREADY_STARTED` | Duyệt / từ chối đơn (T2, T3, T4) hoặc xử lý yêu cầu thay đổi sau `pickup_start_at` |
| 422 | `PICKUP_NOT_ENDED` | Đánh dấu không đến trước `pickup_end_at` (T11, T14) |
| 422 | `SLOT_NOT_AVAILABLE` | Khung giờ tắt / sai thứ / ngày quá khứ / ngoài horizon / không phải ngày chợ họp hoặc ngày hoạt động của Farmer (D-031) / chợ ngừng / chợ đóng cửa / Farmer nghỉ (D-023) |
| 422 | `PRODUCT_NOT_AVAILABLE` | Sản phẩm lưu trữ / tạm ngừng / bị gỡ / Farmer không `APPROVED` |
| 422 | `REVIEW_NOT_ALLOWED` | Đơn chưa `COMPLETED` hoặc đã đánh giá |
| 422 | `REPLY_ALREADY_EXISTS` | Farmer phản hồi lần 2 |
| 422 | `RESOURCE_IN_USE` | Xóa / ngừng tài nguyên còn được tham chiếu hoặc còn đơn mở; bỏ ngày hoạt động khi còn đơn mở vào thứ đó (D-031) |
| 422 | `IDEMPOTENCY_KEY_REUSED` | Cùng `Idempotency-Key` nhưng body khác |
| 422 | `FAILED_PRECONDITION` | Đánh dấu sẵn sàng khi còn yêu cầu thay đổi đang chờ; chấp nhận / từ chối khi không có yêu cầu (D-030); dự phòng |
| 428 | `PRECONDITION_REQUIRED` | Thiếu `If-Match` / `Idempotency-Key` |
| 429 | `THROTTLED` | Vượt giới hạn tần suất |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi không lường trước |
| 503 | `AI_UNAVAILABLE` | Chat tắt hoặc Gemini lỗi / quá 15s |

### 4.1 Lớp exception (`marketlink_core/exceptions.py`)

```python
from rest_framework.exceptions import APIException


class DomainError(APIException):
    """Base for every business error; carries an Error Catalog code and field errors."""

    status_code = 400
    default_code = "VALIDATION_ERROR"
    default_detail = "Invalid request."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        errors: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(message or self.default_detail)
        self.code = code or self.default_code
        self.errors = errors or {}


class BusinessValidationError(DomainError):
    status_code = 400
    default_code = "VALIDATION_ERROR"
    default_detail = "Invalid request."


class AuthenticationError(DomainError):
    status_code = 401
    default_code = "NOT_AUTHENTICATED"
    default_detail = "Please sign in to continue."


class ForbiddenActionError(DomainError):
    status_code = 403
    default_code = "ACTION_NOT_PERMITTED_FOR_ROLE"
    default_detail = "You are not allowed to perform this action."


class ResourceNotFoundError(DomainError):
    status_code = 404
    default_code = "NOT_FOUND"
    default_detail = "The requested resource was not found."


class ConflictError(DomainError):
    status_code = 409
    default_code = "RESOURCE_MODIFIED"
    default_detail = "This record was changed by someone else. Please reload."


class UnprocessableEntityError(DomainError):
    status_code = 422
    default_code = "FAILED_PRECONDITION"
    default_detail = "This action cannot be completed right now."


class PreconditionRequiredError(DomainError):
    status_code = 428
    default_code = "PRECONDITION_REQUIRED"
    default_detail = "A required request header is missing."


class ServiceUnavailableError(DomainError):
    status_code = 503
    default_code = "AI_UNAVAILABLE"
    default_detail = "The assistant is temporarily unavailable."
```

Mọi mã lỗi được khai báo tập trung ở class hằng số `ErrorCode` trong cùng file (đúng danh sách §4); code dùng `ErrorCode.X`, không gõ chuỗi tay.

Cách dùng — luôn truyền `code` đúng catalog, `message` tiếng Anh:

```python
from marketlink_core.exceptions import ErrorCode, ForbiddenActionError, UnprocessableEntityError

raise UnprocessableEntityError("The order cutoff time has passed.", code=ErrorCode.CUTOFF_PASSED)
raise ForbiddenActionError(
    "Your account has been locked.",
    code=ErrorCode.ACCOUNT_LOCKED,
    errors={"reason": [profile.deactivation_reason]},
)
```

### 4.2 `custom_exception_handler` (`marketlink_core/responses.py`)

Khai báo `REST_FRAMEWORK["EXCEPTION_HANDLER"] = "marketlink_core.responses.custom_exception_handler"`.

1. `request_id` lấy từ `request.id` hoặc `get_request_id()`.
2. **`DomainError` được kiểm tra trước** mọi class built-in → dùng nguyên `exc.code`, `exc.errors`, `str(exc.detail)`.
3. Ánh xạ exception built-in / CSDL sang catalog:

| Exception | HTTP | `code` |
| :--- | :---: | :--- |
| `rest_framework.exceptions.ValidationError`, `django.core.exceptions.ValidationError` | 400 | `VALIDATION_ERROR` (chi tiết vào `errors`) |
| `DataError` MySQL 1406 (data too long) | 400 | `VALIDATION_ERROR` |
| `IntegrityError` MySQL 1062 (duplicate) | 400 | `VALIDATION_ERROR` |
| `NotAuthenticated`, `AuthenticationFailed`, SimpleJWT `InvalidToken` trên access token | 401 | `NOT_AUTHENTICATED` |
| SimpleJWT `TokenError` / `InvalidToken` ở endpoint refresh | 401 | `TOKEN_INVALID` |
| `PermissionDenied` (DRF / Django) | 403 | `PERMISSION_DENIED` |
| `NotFound`, `Http404` | 404 | `NOT_FOUND` |
| `ProtectedError`, `RestrictedError`, `IntegrityError` MySQL 1451/1452 | 422 | `RESOURCE_IN_USE` |
| `OperationalError` MySQL 1213 lọt ra ngoài `run_with_deadlock_retry` | 409 | `CONFLICT_RETRY` |
| `ParseError` (body JSON hỏng) | 400 | `VALIDATION_ERROR` |
| `Throttled` | 429 | `THROTTLED` (kèm header `Retry-After`) |
| `APIException` 4xx khác ngoài catalog (405, 406, 415) | giữ nguyên status | `VALIDATION_ERROR` |
| Mọi exception khác | 500 | `INTERNAL_SERVER_ERROR` |

4. Lỗi 500: `logger.exception(...)`, gọi `rest_framework.views.set_rollback()` (không tham số — **không** gọi `connection.set_rollback(True)`), ẩn toàn bộ chi tiết nội bộ, `message = "Something went wrong. Please try again later."`.
5. Lỗi 403 `PERMISSION_DENIED` (sai nhánh role): gọi `log_security_event(action=AuditAction.ACCESS_DENIED, …)` — handler chạy ngoài transaction nghiệp vụ nên log không bị rollback.

---

## 5. Tầng Model & CSDL MySQL

### 5.1 Quy ước bắt buộc (Pass 4A §0)

| # | Quy ước |
| :---: | :--- |
| 1 | PK `BigAutoField` (`DEFAULT_AUTO_FIELD`); model không tự khai báo `id`. Profile 1-1 dùng `user` làm PK |
| 2 | `db_table` tường minh, `snake_case` số nhiều |
| 3 | Bảng nghiệp vụ kế thừa `BaseModel` (`created_at`, `updated_at`). Bảng append-only kế thừa `CreatedAtModel`: `order_status_history`, `notifications`, `favorite_*`, `audit_logs` |
| 4 | Enum lưu `VARCHAR` `UPPER_SNAKE_CASE`, khai báo `TextChoices`; so sánh bằng enum, không dùng chuỗi cứng |
| 5 | Tiền USD: `DecimalField(max_digits=10, decimal_places=2)`; giá sản phẩm $0.01–$10,000.00; cấm `FloatField` |
| 6 | Tọa độ: `DecimalField(max_digits=9, decimal_places=6)` |
| 7 | Giờ trong ngày: `TimeField` naive, hiểu theo giờ Việt Nam |
| 8 | FK mặc định `RESTRICT`; `CASCADE` chỉ cho profile 1-1 và dòng con thuần phụ thuộc; `SET_NULL` cho tham chiếu có thể mất (actor, slot) |
| 9 | `related_name` bắt buộc, danh từ số nhiều; cấm hậu tố `_set` |
| 10 | Không xóa cứng thực thể đã có giao dịch: dùng `is_archived` / `is_active` / `is_hidden_by_admin` |
| 11 | Chuỗi unique cần phân biệt dấu: `db_collation="utf8mb4_0900_as_ci"` |
| 12 | MySQL bỏ qua `UniqueConstraint(condition=...)` → bảo vệ bằng `select_for_update()` trong service |

- Engine InnoDB, charset `utf8mb4`, collation duy nhất `utf8mb4_0900_ai_ci`.
- Mọi `CharField` có `max_length`. Không `db_index`/`unique` trên `TextField`; index ghép ≤ 3072 byte.
- Index khai báo tập trung trong `Meta.indexes`, đặt `name` tường minh.
- `JSONField`: `default=dict`, `encoder=DjangoJSONEncoder`. Ngoại lệ v1.7: `farmer_profiles.operating_days` (`default=list`, danh sách số 1–7, ≥ 1 ngày, không trùng — kiểm ở `FarmerProfile.clean()` / `save()` qua `accounts/operating_days.normalize_operating_days`, serializer dùng lại hàm này; không CHECK ở CSDL) và `orders.pending_change` (`null=True`) — định dạng theo Pass 4A; không thêm bảng cho hai dữ liệu này.
- Thực thể có OCC (`orders`) có `version = PositiveIntegerField(default=1)`.
- Model chỉ chứa phương thức kiểm tra trạng thái của chính nó (`is_open`); không gửi mail, không logic liên bảng trong `save()`.

### 5.2 Lịch sử thực thể

- `farmer_profiles` dùng `django-simple-history`: `history = HistoricalRecords(table_name="farmer_profile_histories", bases=[HistoryRequestMeta])`. Signal `pre_create_historical_record` (`marketlink_core/signals.py`, nạp trong `apps.ready()`) gắn `request_id`.
- `orders` **không** dùng simple-history; lịch sử nằm ở bảng tự thiết kế `order_status_history` (xem §7).
- `products` không gắn history.
- Đặt `SIMPLE_HISTORY_HISTORY_CHANGE_REASON_USE_TEXT_FIELD = True` trong settings.

### 5.3 User model & migration

- `AUTH_USER_MODEL = "accounts.CustomUser"`; `username`, `first_name`, `last_name` = `None`; `USERNAME_FIELD = "email"`; email chuẩn hóa `strip().lower()`; `role` FK `RESTRICT` tới `roles`.
- `CustomUserManager` override `create_user` và `create_superuser` (tự gán role `ADMIN`).
- Không đăng ký `CustomUser` bằng `UserAdmin` mặc định (lỗi `admin.E108/E116` vì thiếu `username`). Dùng `CustomUserAdmin(UserAdmin)` với form riêng (`BaseUserCreationForm` / `UserChangeForm`, `Meta.model = CustomUser`) và `fieldsets` / `add_fieldsets` tiếng Anh — **không** dùng `admin.ModelAdmin` thuần, vì nó lưu mật khẩu dạng thô.
- Role seed bằng data migration (`ADMIN`, `FARMER`, `CUSTOMER`).
- MySQL không rollback DDL → **chỉ Lead chạy `makemigrations`**; mọi người dev trên MySQL cục bộ, không dùng SQLite. Tài khoản MySQL cho pytest cần quyền `CREATE`/`DROP`.

---

## 6. Tầng Service & kiểm soát đồng thời

- Hàm thuần Python, tham số keyword-only (`*`); không nhận `request`, không trả `Response`.
- Service thay đổi trạng thái nhận **`id: int`**, không nhận instance từ view (tránh snapshot cũ).
- Ghi ≥ 2 bảng hoặc cần khóa → `with transaction.atomic():` mở tường minh ở service (`ATOMIC_REQUESTS = False`).
- Báo lỗi nghiệp vụ bằng lớp `DomainError` (§4.1) với `code` đúng catalog.

### 6.1 Khóa dòng

```python
with transaction.atomic():
    products = list(
        Product.objects.filter(id__in=sorted(set(product_ids)))
        .order_by("id")
        .select_for_update(of=("self",))
    )
```

- `order_by("id")` + `of=("self",)` + `list(...)` bên trong khối atomic.
- **Khi nào khóa `products` (D-029)**: chỉ khi trừ / cộng kho — Farmer duyệt đơn (T2), Farmer chấp nhận yêu cầu thay đổi, các cạnh cộng trả kho (T4, T6, T11, T12, T13, T14), và khi Farmer đánh dấu món hết hàng (FA-24 kèm khai báo, FA-36 — D-036). Tạo đơn (T1), sửa đơn `PLACED` và gửi yêu cầu thay đổi **chỉ đọc** tồn kho để kiểm tra, không khóa, không trừ.
- Quét lười (`expire_overdue_orders`) chạy trong transaction riêng và commit **trước** transaction checkout / mẫu tuần, để không giữ khóa sản phẩm lẫn lộn.
- **Thứ tự khóa giữa các bảng (bắt buộc)**: `users` / `customer_profiles` / `farmer_profiles` → `orders` (theo id) → `products` (theo id). Không service nào khóa `products` trước `orders`.
- Cập nhật tồn kho: đọc dưới khóa rồi gán và `save(update_fields=[...])`, hoặc `F()` có điều kiện (`filter(id=..., stock_quantity__gte=n).update(...)`) — `products` không có history nên `F()` được phép.
- Không dùng `F("version") + 1`; dùng `instance.version += 1` sau khi đã khóa dòng.

### 6.2 Retry deadlock (`marketlink_core/services/db_retry.py`)

```python
from django.db import OperationalError

from marketlink_core.exceptions import ConflictError

MYSQL_DEADLOCK = 1213


def run_with_deadlock_retry(fn, *args, **kwargs):
    """Run fn (which opens its own transaction.atomic()) and retry once on a MySQL deadlock."""
    for attempt in range(2):
        try:
            return fn(*args, **kwargs)
        except OperationalError as exc:
            if not exc.args or exc.args[0] != MYSQL_DEADLOCK:
                raise
            if attempt == 1:
                raise ConflictError("The system is busy. Please try again.", code="CONFLICT_RETRY")
```

Vòng retry luôn nằm **bên ngoài** `transaction.atomic()`.

### 6.3 Thời gian

- `TIME_ZONE = "Asia/Ho_Chi_Minh"`, `USE_TZ = True`; CSDL lưu UTC.
- So sánh với `TimeField`: `timezone.localtime(timezone.now()).time()`; không dùng `timezone.now().time()` (lệch 7 giờ).
- Hàm ngày theo múi giờ (`TruncDate`, `__date`) cần MySQL đã nạp `mysql_tzinfo_to_sql`.

---

## 7. FSM đơn hàng (D-006)

### 7.1 Quy trình chuyển trạng thái

1. **View**: lấy đơn qua `get_queryset()` đã thu hẹp theo actor (ngoài phạm vi → 404), đọc `If-Match` bằng `parse_if_match()`, gọi service với `order_id` và `expected_version`.
2. **Khóa**: trong `transaction.atomic()`, `Order.objects.select_for_update(of=("self",)).get(id=order_id)`.
3. **OCC**: `order.version != expected_version` → `ConflictError(code="RESOURCE_MODIFIED")`. Hợp lệ → `order.version += 1`.
4. **Gate 1**: cặp (trạng thái hiện tại → đích) phải có trong ma trận `TRANSITIONS` (13 cạnh v1.7: T1–T6, T8–T14; **T7 bãi bỏ**, **T14 `ACCEPTED → NO_SHOW` mới**) → sai: `BusinessValidationError(code="INVALID_STATUS_TRANSITION")`.
5. **Gate 2**: đúng actor cho cạnh đó → sai: `ForbiddenActionError(code="ACTION_NOT_PERMITTED_FOR_ROLE")`.
6. **Gate 3**: điều kiện thời gian / lý do theo Pass 4B §5.3 → `UnprocessableEntityError` với mã cụ thể (`CUTOFF_PASSED`, `CUTOFF_NOT_REACHED`, `PICKUP_ALREADY_STARTED`, `PICKUP_NOT_ENDED`, …).
7. **Ghi**: cập nhật `orders`, điều chỉnh kho theo bảng §7.5, xóa `pending_change` khi đơn kết thúc, ghi **đúng 1 dòng** `order_status_history` (`from_status`, `to_status`, `transition`, `actor`, `actor_role`, `change_reason`, `request_id`) — tất cả **trong cùng** `transaction.atomic()`.
8. **Thông báo**: gọi `notify()` bên trong transaction; phần WebSocket/email tự chạy sau commit (§9).

### 7.2 OCC & `If-Match`

- Bắt buộc với thao tác do Customer / Farmer thực hiện (T2–T6, T9–T11, T14, sửa đơn, gửi / chấp nhận / từ chối yêu cầu thay đổi).
- T8 (quét lười), T12, T13 và các cạnh Admin kích hoạt hàng loạt: không cần `If-Match`, chạy dưới khóa dòng nhưng **vẫn tăng `version`**.
- `parse_if_match()` (`marketlink_core/http.py`): thiếu header → `PreconditionRequiredError`; chấp nhận `"3"`, `3`, `W/"3"`; giá trị không phải số nguyên dương → `BusinessValidationError(code="VALIDATION_ERROR", errors={"if_match": ["Invalid If-Match value."]})`.
- `ReadSerializer` của đơn luôn trả `version` và `allowed_actions`.

### 7.3 `change_reason`

| Cạnh | Giá trị |
| :--- | :--- |
| T3, T4 | Lý do Farmer nhập (≤ 500 ký tự) hoặc `FARMER_SUSPENDED_BY_ADMIN` |
| T5, T6 | Lý do Khách nhập hoặc `CUSTOMER_LOCKED_BY_ADMIN` |
| Sửa đơn `PLACED`, sự kiện yêu cầu thay đổi (`transition = NULL`, `from_status = to_status`) | Tóm tắt bằng tiếng Anh: `"Customer modified: …"`, `"Change request submitted: …"`, `"Change request approved by farmer"`, `"Change request rejected: …"`, `"Change request expired"` |
| T8 | `SYSTEM_EXPIRED` |
| T12 | `FARMER_SUSPENDED_BY_ADMIN` |
| T13 | `CUSTOMER_LOCKED_BY_ADMIN` |

Actor hệ thống: `actor = None`, `actor_role = ActorRole.SYSTEM`.

Lý do Admin tự nhập khi đình chỉ / khóa **không** ghi vào `change_reason` và không gửi cho khách; chỉ lưu `status_reason` / `deactivation_reason` và `audit_logs` (D-033).

### 7.4 Timeline API

`GET /api/[role]/orders/<int:id>/histories/` đọc thẳng `order.status_history.order_by("created_at")` — một truy vấn, không so sánh bản ghi liền kề. Với `farmer_profile_histories` (simple-history) không gọi `.prev_record` trong vòng lặp (N+1); lấy toàn bộ rồi diff trong bộ nhớ.

### 7.5 Tồn kho theo cạnh (D-029)

| Sự kiện | `products.stock_quantity` |
| :--- | :--- |
| T2 Farmer duyệt | − số lượng (khóa, thiếu → `INSUFFICIENT_STOCK`) |
| Farmer chấp nhận yêu cầu thay đổi | − phần tăng / + phần giảm |
| T4, T6, T11, T12, T13, T14 (đơn đã bị trừ kho) | + trả lại |
| T1, T3, T5, T8, T9, T10, sửa đơn `PLACED`, gửi / từ chối / tự hủy yêu cầu thay đổi | không đổi |

- `EXPIRED` (T8): không đổi kho, không tính lỗi khách. `NO_SHOW` (T11, T14): cộng trả kho; cờ At risk / `no_show_count` **chỉ đếm `NO_SHOW` qua T11** — T14 không tính lỗi khách (D-028, D-036).
- Từ chối đơn `ACCEPTED` (T4) do Farmer: bắt buộc khai báo món hết hàng (`mark_sold_out` hoặc `mark_sold_out_product_ids`, `false` / `[]` = trả tất cả về kho); món khai báo hết có tồn kho cuối = 0. Việc cộng trả và đặt 0 chạy trong cùng transaction của `transition_order` (D-036).
- FA-36 (đơn `PLACED`): bỏ 1 món hết hàng khỏi đơn, tồn kho món = 0, tính lại `total_amount`, ghi lịch sử `transition = NULL`, báo khách `ORDER_ITEM_SOLD_OUT`; đơn phải còn ≥ 1 món (D-036).
- Restock alert chỉ gửi khi Farmer chủ động nạp hàng (FA-14, FA-18), không gửi khi kho tăng do các cạnh trên (D-025).

### 7.6 Yêu cầu thay đổi đơn (D-030)

- Đơn `PLACED`: khách sửa trực tiếp (không đổi trạng thái, không trừ kho).
- Đơn `ACCEPTED`: khách gửi yêu cầu → lưu `orders.pending_change`, đơn giữ nguyên nội dung và số hàng đã trừ; yêu cầu mới ghi đè yêu cầu cũ.
- Định dạng `pending_change` (v1.8): `{ items: [{product_id, quantity, unit_price}] | null, pickup_date, pickup_slot_id, note, requested_at }`. `unit_price` là giá khách thấy lúc gửi (món giữ nguyên = giá trong đơn, món mới = giá sản phẩm lúc gửi); FA-34 dùng đúng giá này. Đọc / kiểm tra / hiển thị qua `orders/services/pending_change.py` (`parse_pending_change`, `present_pending_change`); sai định dạng → 422 `FAILED_PRECONDITION`, không 500.
- Farmer: chấp nhận (FA-34, khóa sản phẩm cũ ∪ mới theo `id`, trừ / trả chênh lệch, áp dụng nội dung mới), từ chối (FA-35, giữ đơn cũ), hoặc hủy cả đơn (T4).
- Quy tắc thời gian: gửi trước `cutoff_at`; ngày nhận mới từ hôm nay đến `BOOKING_HORIZON_DAYS`; Farmer xử lý trước `pickup_start_at`, quá hạn thì quét lười tự hủy và báo khách `ORDER_CHANGE_REJECTED`.
- Còn yêu cầu đang chờ thì T9 bị chặn (`FAILED_PRECONDITION`).

---

## 8. Phân quyền

### 8.1 Ba lớp

1. **Nhánh URL theo role** — permission class `IsCustomer`, `IsFarmer`, `IsAdmin` (`marketlink_core/permissions.py`) so `request.user.role.code` với `RoleCode`. Sai nhánh → 403 `PERMISSION_DENIED` + `audit_logs` `ACCESS_DENIED`.
2. **Phạm vi đối tượng** — mọi view thu hẹp tại `get_queryset()` theo Pass 4B §6.1; bản ghi ngoài phạm vi trả **404**, không 403.
3. **Policy** — `[app]/policies.py` kế thừa `BasePolicy`, dùng cho Gate 2 và tính `allowed_actions`.

### 8.2 `BasePolicy` (`marketlink_core/policies/base.py`)

```python
from abc import ABC, abstractmethod
from typing import Any


class BasePolicy(ABC):
    """Five-dimension permission check: actor, action, resource, ownership, FSM state."""

    @abstractmethod
    def can_view(self, actor: Any, resource: Any) -> bool: ...

    @abstractmethod
    def can_create(self, actor: Any) -> bool: ...

    @abstractmethod
    def can_update(self, actor: Any, resource: Any) -> bool: ...

    @abstractmethod
    def can_delete(self, actor: Any, resource: Any) -> bool: ...

    @abstractmethod
    def can_transition(self, actor: Any, resource: Any, to_status: str) -> bool: ...
```

- `can_create(actor)` không nhận `resource` vì đối tượng chưa tồn tại; dùng cho kiểm tra trước khi tạo, ví dụ Farmer chưa `APPROVED` → `FARMER_NOT_APPROVED`, đang `SUSPENDED` → `FARMER_SUSPENDED`.
- Mọi policy cụ thể phải hiện thực đủ 5 hàm; hành động không áp dụng thì trả `False`.

`RoleCode` chỉ gồm `ADMIN`, `FARMER`, `CUSTOMER` (`marketlink_core/policies/roles.py`).

### 8.3 Khóa ngoại trong WriteSerializer

Giới hạn `queryset` của các `PrimaryKeyRelatedField` theo actor trong `__init__()` (ví dụ Farmer chỉ chọn được `farmer_market` của mình).

---

## 9. Hai tầng lưu vết

| Tầng | Bảng | Ghi ở đâu |
| :--- | :--- | :--- |
| Audit trail nghiệp vụ | `order_status_history`, `farmer_profile_histories` | **Trong** transaction nghiệp vụ |
| Nhật ký an ninh | `audit_logs` | **Ngoài** transaction nghiệp vụ |

### 9.1 `log_security_event()` (`system/services.py`)

```python
def log_security_event(
    *,
    action: str,
    user: Any | None,
    endpoint: str | None,
    method: str | None,
    ip_address: str | None,
    user_agent: str | None,
    status_code: int | None,
    request_id: str | None,
    details: dict | None = None,
) -> AuditLog:
    """Append one row to audit_logs; strips password, token and credential keys from details."""
```

Tiện ích đi kèm, tự lấy `endpoint`, `method`, IP, user agent và `request_id` từ request:

```python
def log_request_event(request, *, action: str, status_code: int | None, user=None, details: dict | None = None) -> AuditLog: ...
```

- `request_id` được chuẩn hóa qua `normalize_request_id()`: không phải UUID thì lưu `NULL` (cột `CHAR(36)`).
- `action` chỉ dùng giá trị `AuditAction`: `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_CHANGED`, `ACCESS_DENIED`, `EXPORT_DATA`, `FARMER_APPROVED`, `FARMER_REJECTED`, `FARMER_SUSPENDED`, `FARMER_REINSTATED`, `CUSTOMER_DEACTIVATED`, `CUSTOMER_ACTIVATED`, `PRODUCT_HIDDEN`, `PRODUCT_RESTORED`, `REVIEW_HIDDEN`, `REVIEW_RESTORED`.
- Thất bại (403, đăng nhập sai…): ghi sau khi khối atomic kết thúc — trong `except` ở view hoặc trong exception handler.
- Thành công (đình chỉ Farmer, khóa khách, xuất Excel): ghi sau khi atomic commit, hoặc qua `transaction.on_commit()`.
- `user_agent` cắt ≤ 255 ký tự; `ip_address` lấy qua `client_ip()` (`X-Forwarded-For` → `REMOTE_ADDR`), giá trị không phải IP hợp lệ bị bỏ để không tràn cột.
- Không có API sửa / xóa `audit_logs`.

---

## 10. Thông báo & email (D-010)

### 10.1 Điểm phát duy nhất (`notifications/services.py`)

```python
def notify(*, recipient: CustomUser, event_type: str, context: dict[str, Any]) -> Notification:
    """
    Create an in-app notification inside the caller's transaction, then on commit push it over
    WebSocket to group user_<id> and, for email-enabled events, send the email in the background.
    """
```

1. Ghi dòng `notifications` (`type`, `title`, `message`, `target_url`) trong transaction hiện tại — `title`/`message` tiếng Anh, sinh từ `event_type` + `context`.
2. `transaction.on_commit(...)` → `channel_layer.group_send(f"user_{recipient.id}", {"type": "notify", "data": …})`.
3. `transaction.on_commit(...)` → nếu sự kiện có email: render template rồi đẩy vào `ThreadPoolExecutor(max_workers=2)` khai báo cấp module.

- Không nơi nào khác được tự tạo `Notification`, tự gửi WebSocket hay tự gửi mail.
- `NotificationType`: `ORDER_ACCEPTED`, `ORDER_READY`, `ORDER_DECLINED`, `ORDER_EXPIRED`, `RESTOCK`, `ORDER_PLACED`, `ORDER_MODIFIED`, `ORDER_CANCELLED`, `ORDER_CANCELLED_CUSTOMER_LOCKED`, `ACCOUNT_STATUS_CHANGED`, `MARKET_SCHEDULE_CHANGED`, và từ v1.7 `ORDER_CHANGE_APPROVED`, `ORDER_CHANGE_REJECTED` (gửi khách, chỉ in-app — D-030), từ v1.8 `ORDER_ITEM_SOLD_OUT` (gửi khách, chỉ in-app — D-036).
- `ORDER_CANCELLED_CUSTOMER_LOCKED` báo Farmer rằng hàng của đơn đã duyệt / sẵn sàng đã được trả về kho online (không còn câu "bán tại sạp" — D-033).
- Sự kiện có email (6): Customer `ORDER_ACCEPTED`, `ORDER_READY`, `ORDER_DECLINED`, `ORDER_EXPIRED`; Farmer `ORDER_CANCELLED`, `ORDER_CANCELLED_CUSTOMER_LOCKED`. `RESTOCK` chỉ in-app và chỉ khi Farmer chủ động nạp hàng làm tồn kho từ 0 lên > 0 (D-025).
- Template email tiếng Anh, mỗi sự kiện một cặp HTML + TXT: `order_accepted`, `order_ready`, `order_declined`, `order_expired`, `order_cancelled_by_customer`, `order_cancelled_customer_locked`.
- Settings: `EMAIL_TIMEOUT = 10`; `EMAIL_ASYNC` (đặt `False` khi chạy pytest để gửi đồng bộ).

### 10.2 WebSocket one-time ticket

`marketlink_core/services/ws_ticket.py` (đã làm — v1.8). Vé và channel layer dùng Redis thật qua `REDIS_URL` khi `USE_REDIS=True` (Redis ≥ 6.2 cho `GETDEL`). Khi `USE_REDIS=False`, vé lưu LocMem và kiểm bằng `get` + `delete` có kiểm kết quả xóa — **chỉ dùng cho dev một tiến trình và test** (LocMem không chia sẻ giữa các tiến trình / worker).

Cách làm thực tế (v1.8):

- Vé phải là UUID hợp lệ (`uuid.UUID`), sai thì trả `None` ngay, không gọi Redis.
- Redis: client gốc lấy qua `django_redis.get_redis_connection("default")`; tạo vé `SET ws_ticket:<uuid> <json> EX WS_TICKET_TTL`, kiểm vé `GETDEL ws_ticket:<uuid>` (một lệnh nguyên tử). Lỗi Redis khi kiểm vé → ghi log, trả `None` → consumer đóng `4401` (fail closed).
- Consumer gọi service qua `sync_to_async(..., thread_sensitive=False)` (không dùng ORM) thay cho `redis.asyncio` ở code mẫu dưới; `accept()` rồi `close(4401)` giữ nguyên.

Code mẫu gốc (tham khảo):

```python
import json
import uuid
from typing import Any

import redis
from django.conf import settings

_redis = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def create_ws_ticket(*, user_id: int, role: str) -> str:
    """Store a single-use ticket in Redis for WS_TICKET_TTL seconds and return it."""
    ticket = uuid.uuid4().hex
    payload = json.dumps({"user_id": user_id, "role": role})
    _redis.set(f"ws_ticket:{ticket}", payload, ex=settings.WS_TICKET_TTL)
    return ticket
```

Consumer (`notifications/consumers.py`) — tra và xóa vé bằng **một lệnh nguyên tử `GETDEL`** qua `redis.asyncio`; vé sai phải `accept()` rồi mới `close(code=4401)`:

```python
import json
from urllib.parse import parse_qs

import redis.asyncio as aioredis
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

redis_async = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query = parse_qs(self.scope["query_string"].decode())
        ticket = query.get("ticket", [None])[0]
        payload = await redis_async.getdel(f"ws_ticket:{ticket}") if ticket else None
        if payload is None:
            # Closing before accept() makes Channels reject the handshake with HTTP 403,
            # so the browser only sees 1006 instead of 4401.
            await self.accept()
            await self.close(code=4401)
            return
        data = json.loads(payload)
        self.group_name = f"user_{data['user_id']}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notify(self, event):
        await self.send(text_data=json.dumps({"event": "NEW_NOTIFICATION", "data": event["data"]}))
```

- Không dùng `get()` rồi `delete()` hai lệnh riêng; API cache của `django-redis` không có `getdel` → dùng client `redis` gốc.
- Frontend mỗi lần kết nối lại luôn xin vé mới qua `POST /api/auth/ws-ticket/`.

---

## 11. Idempotency-Key (`POST /api/customer/orders/`)

`marketlink_core/services/idempotency.py`:

- Khóa Redis: `idem:<user_id>:<endpoint>:<key>`; lưu kèm hash body request.
- **Pha 1**: `SET key {"state":"PROCESSING","body_hash":…} NX EX 60`.
  - Key đang `PROCESSING` → 409 `IDEMPOTENCY_IN_PROGRESS`.
  - Key đã xong, cùng body hash → trả lại response đã lưu, kèm header `Idempotent-Replayed: true`.
  - Key đã có nhưng body hash khác → 422 `IDEMPOTENCY_KEY_REUSED`.
- **Pha 2**: service thành công → ghi response JSON với TTL 86400 giây.
- Service ném lỗi → `delete(key)` trong `except` để client retry ngay.
- Thiếu header → 428 `PRECONDITION_REQUIRED`.

---

## 12. Token & xác thực

- SimpleJWT: access 15 phút; refresh 7 ngày, `ROTATE_REFRESH_TOKENS = True`.
- Blacklist JTI trên **Redis** qua cache alias `blacklist`: `SET blacklist:<jti> 1 EX <remaining_lifetime>` — key tự hết hạn cùng token, không cần dọn dẹp. Không dùng app `rest_framework_simplejwt.token_blacklist` (không sinh bảng trong MySQL); `SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] = False`.
- Chỉ **refresh token** bị blacklist: AU-05 logout đưa refresh token hiện tại vào blacklist; AU-04 refresh kiểm tra blacklist (có → 401 `TOKEN_INVALID`), kiểm tra `is_active` (khóa → 403 `ACCOUNT_LOCKED`), rồi blacklist JTI cũ khi xoay vòng. Access token (15 phút) không bị blacklist; `JWTAuthentication` mặc định đã từ chối user `is_active = False`. Phần này thuộc P2 (nhánh Customer).
- Access token có thêm claim `role`.
- **Hai cổng đăng nhập (D-027)**: `POST /api/auth/login/` (AU-03) chỉ nhận `CUSTOMER`, `FARMER`; `POST /api/auth/admin/login/` (AU-09, throttle `admin_login`) chỉ nhận `ADMIN`. Sai cổng → 401 `INVALID_CREDENTIALS`, kể cả khi mật khẩu đúng. Refresh, logout, me, change-password dùng chung.
- **Tài khoản Admin do IT cấp** bằng `createsuperuser` hoặc lệnh seed; không có API tạo Admin. Không có luồng bắt buộc đổi mật khẩu lần đầu (không có cột `must_change_password`).
- Đa phiên (D-021): mỗi thiết bị một cặp token; đăng xuất chỉ thu hồi refresh token của thiết bị đó.
- Đăng nhập: sai mật khẩu → 401 `INVALID_CREDENTIALS` (không tiết lộ trạng thái khóa); đúng mật khẩu nhưng `is_active = False` → 403 `ACCOUNT_LOCKED` kèm `errors.reason`.

---

## 13. Settings bắt buộc (`marketlink_core/settings.py`)

```python
DATABASES["default"]["ATOMIC_REQUESTS"] = False

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_TZ = True

REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")  # rediss://… on Upstash

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "marketlink_core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "marketlink_core.responses.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/min",
        "user": "300/min",
        "login": "5/min",
        "admin_login": "5/min",
        "register": "10/hour",
        "orders": "10/hour",
        "chat": "20/min",
    },
}

CORS_ALLOW_HEADERS = list(default_headers) + ["if-match", "idempotency-key", "x-request-id"]
CORS_EXPOSE_HEADERS = ["x-request-id", "content-disposition", "idempotent-replayed"]

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,  # blacklist lives in Redis (§12), not the token_blacklist app
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

USE_REDIS = os.environ.get("USE_REDIS", "False").lower() in ("true", "1", "t")
if USE_REDIS:
    CACHES = {
        "default": {"BACKEND": "django_redis.cache.RedisCache", "LOCATION": REDIS_URL, "KEY_PREFIX": "cache", ...},
        "blacklist": {"BACKEND": "django_redis.cache.RedisCache", "LOCATION": REDIS_URL, "KEY_PREFIX": "blacklist", ...},
    }
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels_redis.core.RedisChannelLayer", "CONFIG": {"hosts": [{"address": REDIS_URL, ...}], "prefix": "marketlink"}}}
else:
    CACHES = {"default": LocMemCache, "blacklist": LocMemCache}   # single-process dev only
    CHANNEL_LAYERS = {"default": InMemoryChannelLayer}

SIMPLE_HISTORY_HISTORY_CHANGE_REASON_USE_TEXT_FIELD = True
EMAIL_TIMEOUT = 10
EMAIL_ASYNC = True          # False in pytest so emails are sent synchronously

MAX_PLACED_ORDERS_PER_CUSTOMER = 10   # D-005: unconfirmed (PLACED) orders per customer, no per-farmer limit
BOOKING_HORIZON_DAYS = 7              # U-01 / D-030: latest pickup date a customer can choose or move to
AT_RISK_THRESHOLD = 3                 # D-028/D-036: NO_SHOW orders via T11 that flag a customer "At risk"
AT_RISK_WINDOW_DAYS = 30

LOGGING = {...}             # logger "marketlink" -> console; use logging.getLogger("marketlink")
```

- `INSTALLED_APPS` **không** có `rest_framework_simplejwt.token_blacklist`.
- Cấu hình gọi Nominatim (URL, User-Agent riêng của dự án, timeout 5 giây) đặt trong settings và đọc từ `.env` (D-032); gọi ngoài transaction, tối đa 1 lượt/giây, lỗi thì để tọa độ trống.

- Scope `login`, `admin_login`, `register`, `orders`, `chat` gắn vào view bằng `ScopedRateThrottle` + `throttle_scope`.
- Throttle, idempotency, blacklist, ws-ticket đều cần Redis dùng chung giữa các worker; `LocMemCache` chỉ chấp nhận khi dev một tiến trình.
- `MIDDLEWARE` có `marketlink_core.middleware.RequestIDMiddleware` (đọc hoặc sinh `X-Request-ID` UUID4 → `request.id`, `set_request_id()`, header response) đặt ngay sau `CorsMiddleware`.
- Secret, DB URI, API key chỉ nằm trong `.env`; không hardcode.

---

## 14. Serializer & View

- Tách `[Resource]ReadSerializer` và `[Resource]WriteSerializer`; **cấm `fields = "__all__"`**; khai báo `fields = [...]` tường minh.
- Tiền trả về bằng `DecimalField` dạng chuỗi 2 chữ số (`"12.50"`), không dùng `FloatField`/float; thời điểm trả ISO 8601 có offset.
- `validate_<field>()` cho 1 trường, `validate()` cho nhiều trường; thông báo lỗi tiếng Anh.
- View mỏng (≤ 15 dòng/method): validate serializer → gọi service/selector → `api_response()`. Không ORM phức tạp, không transaction, không logic FSM trong view.
- `get_queryset()` luôn thu hẹp theo actor (§8.1).
- Endpoint hành động FSM trả `OrderDetail` sau cập nhật (có `version` mới, `allowed_actions`, `pending_change`).
- `allowed_actions` do backend tính theo role + trạng thái + thời gian + có / không có `pending_change`; giá trị theo `OrderAction` (Pass 4B §3.4), gồm cả `REQUEST_CHANGE`, `APPROVE_CHANGE`, `REJECT_CHANGE`. Luật đặt ở `orders/policies.py`, dùng chung điều kiện thời gian với Gate 3, không viết lại trong từng serializer.

---

## 15. Upload file an toàn

Áp dụng cho ảnh sản phẩm, ảnh sạp, ảnh chợ:

1. Dung lượng ≤ 2 MB (NFR-01, Pass 3 §1.5, PU-01 `max_upload_mb: 2`).
2. Đuôi file thuộc `{".jpg", ".jpeg", ".png", ".webp"}`.
3. Mở bằng Pillow, `img.verify()`, và `img.format` thuộc `{"JPEG", "PNG", "WEBP"}` (chặn file đổi đuôi).
4. Lưu với tên ngẫu nhiên qua `UUIDUploadTo(folder)`.

Mọi vi phạm trả 400 `VALIDATION_ERROR` với lỗi theo trường, ví dụ `errors={"image": ["Image must be 2 MB or smaller."]}`.

---

## 16. MySQL — cấm thói quen PostgreSQL

1. Cấm `.distinct("field")`, `ArrayField`, `HStoreField`, `django.contrib.postgres`, `select_for_update(no_key=True)`, ràng buộc `deferrable`.
2. `UniqueConstraint(condition=...)` chỉ sinh cảnh báo `models.W036`, điều kiện bị bỏ qua → bảo vệ trong service.
3. `bulk_create()` không trả `id` → cần id thì `create()` trong vòng lặp bên trong atomic.
4. `filter(x__in=qs[:n])` gây lỗi 1235 → `list(qs.values_list("id", flat=True)[:n])` trước.
5. `NULL` xếp đầu khi `ASC` → dùng `F("col").asc(nulls_last=True)` khi cần.
6. Tìm kiếm dùng `icontains` (không phân biệt dấu/hoa nhờ `utf8mb4_0900_ai_ci`); `contains` phân biệt cả hai.

---

## 17. Quy ước đặt tên & comment

- File: `snake_case` (`views_customer.py`, `serializers_farmer.py`). Class: `PascalCase`. Hàm, biến, trường: `snake_case`. Hằng số và thành viên enum: `UPPER_SNAKE_CASE`.
- Enum: `class OrderStatus(models.TextChoices): PLACED = "PLACED", "Placed"`.
- **Comment chỉ ghi WHY, 1 dòng, và chỉ ở chỗ thật sự cần**: logic nghiệp vụ hoặc kỹ thuật mà đọc code không tự hiểu được (ví dụ vì sao retry nằm ngoài `atomic`, vì sao Farmer chỉ được từ chối trước `cutoff_at`). Đa số hàm không cần ghi chú.
- Không viết: docstring đầu file, docstring mô tả hàm làm gì, dòng phân đoạn (`# ---`), nhãn lặp lại điều code đã nói (`# 400`), câu nhắc lại quy định chung ("All text is English"), giọng văn chatbot.
- Được ghi mã tài liệu (D-xxx, Pass 4B §x) trong comment khi nó giúp truy vết lý do nghiệp vụ.
- Đối chiếu chéo thực tế: khi ghép nối hai tầng phải đọc trực tiếp file đối ứng (serializer ↔ API service frontend) để lấy đúng tên trường.
- Không che lỗi bằng dữ liệu giả (`data.field || "Sample"`); hiển thị rõ loading / empty / error.

---

## 18. Git & quyền tác giả commit

- **AI tuyệt đối không commit, push, merge, rebase, tạo branch hay mở Pull Request** (luật cứng số 4 trong `CLAUDE.md`). AI chỉ được dùng `git status`, `git diff`, `git log` và có thể gợi ý commit message trong chat. Mục này dành cho thành viên khi tự commit.
- Mỗi thành viên cấu hình đúng danh tính trước commit đầu tiên; email trùng email đã xác minh trên GitHub:

```bash
git config user.name  "Full Name"
git config user.email "verified-github-email@example.com"
```

- Không đưa bất kỳ công cụ AI nào vào lịch sử: không trailer `Co-Authored-By:` trỏ tới AI, không dòng `Generated with …`, không link session, không tên model AI trong code / comment / file commit.
- Merge vào nhánh chính ít nhất 1 lần mỗi ngày; nhánh Lead merge `marketlink_core` và model trước để các nhánh khác kéo về.

Kiểm tra trước khi push:

```bash
git log --format='%B' \
  | grep -inE '^co-authored-by:|^generated with|noreply@anthropic' \
  && echo "FOUND AI ATTRIBUTION" || echo "clean"
git log --format='%an <%ae>' | sort -u
git log --format='%cn <%ce>' | sort -u
```

Hook chặn tự động (mỗi máy tự tạo `.git/hooks/commit-msg`, `chmod +x`):

```bash
#!/bin/sh
# Reject any AI attribution line before it enters history.
if grep -qiE 'co-authored-by:.*(claude|anthropic|copilot|cursor)|generated with' "$1"; then
  echo "commit-msg hook: remove the AI attribution line before committing." >&2
  exit 1
fi
```
