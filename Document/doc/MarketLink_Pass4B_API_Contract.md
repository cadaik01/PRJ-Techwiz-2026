# 📡 PASS 4 (PHẦN B): ĐÓNG BĂNG HỢP ĐỒNG API (API CONTRACT FREEZE — 10 ĐIỂM)
## DỰ ÁN MARKETLINK — TECHWIZ 7
> **Đầu vào**: Pass 3 (màn hình G/C/F/A) · Pass 4A (22 bảng) · Decision Log D-001 → D-021 · FSM 13 cạnh T1–T13.
> **Phạm vi**: Toàn bộ REST endpoint + kênh WebSocket thông báo.
> **Kỷ luật Freeze**: Sau khi Lead Architect chốt, **không** đổi tên trường, kiểu dữ liệu, URL, mã lỗi. Mọi thay đổi phải qua Lead và ghi vào §8 (Change Log).
> **Trạng thái**: Lead Architect duyệt đóng băng.

### Bản đồ 10 điểm đóng băng → mục trong tài liệu
| # | Điểm đóng băng (playbook) | Mục |
| :---: | :--- | :--- |
| 1 | Endpoint URL chuẩn hóa & phương thức HTTP | §1, §4 |
| 2 | Request body & query params | §4, §5 |
| 3 | Response body (envelope, `snake_case`, enum HOA, `message` tiếng Việt, `code`/`errors` tiếng Anh) | §2.1 |
| 4 | Tên trường & kiểu dữ liệu | §2.3, §3 |
| 5 | Nullable / Optional | §3 (ký hiệu `?` và `\| null`) |
| 6 | Mã HTTP thành công | §2.4, cột "OK" ở §4 |
| 7 | Định dạng lỗi chuẩn + `request_id` | §2.1, §2.5 |
| 8 | Cấu trúc phân trang | §2.2 |
| 9 | Yêu cầu xác thực | §1.3, cột "Auth" ở §4 |
| 10 | Phạm vi quyền cấp đối tượng | §6, cột "Scope" ở §4 |

---

## 1. QUY ƯỚC ĐỊNH TUYẾN & GIAO THỨC

### 1.1 Tiền tố và nhóm route
| Nhóm | Tiền tố | Quyền mặc định | Django app / module |
| :--- | :--- | :--- | :--- |
| Xác thực | `/api/auth/` | Theo endpoint | `accounts/auth/` |
| Công khai (Guest + mọi role) | `/api/public/` | `AllowAny` (JWT nếu có vẫn được đọc) | các app, nhánh `public/` |
| Khách hàng | `/api/customer/` | `IsAuthenticated` + `IsCustomer` | nhánh `customer/` |
| Nông dân | `/api/farmer/` | `IsAuthenticated` + `IsFarmer` | nhánh `farmer/` |
| Quản trị | `/api/admin/` | `IsAuthenticated` + `IsAdmin` | nhánh `admin/` |
| Thông báo (dùng chung) | `/api/notifications/` | `IsAuthenticated` (Customer, Farmer) | `notifications/` |
| Chat AI | `/api/chat/` | `AllowAny` (tool đơn hàng cần JWT) | `chat/` |
| Hệ thống | `/api/health/` | `AllowAny` | `core/` |
| WebSocket | `/ws/notifications/?ticket=<uuid>` | Vé 1 lần | `notifications/consumers.py` |

- Tên tài nguyên: danh từ số nhiều `kebab-case`. 100% URL kết thúc bằng `/`.
- Hành động nghiệp vụ: động từ đặt sau ID, luôn `POST` (ví dụ `POST /api/farmer/orders/<id>/accept/`).
- ID trên URL: số nguyên `<int:id>`. Với Farmer, `farmer_id` = `users.id` của Farmer (profile dùng `user_id` làm PK).
- **Django Admin** mount tại `/django-admin/` để không trùng `/api/admin/`.

### 1.2 Header chuẩn
| Header | Chiều | Bắt buộc khi | Giá trị |
| :--- | :--- | :--- | :--- |
| `Authorization` | Request | Endpoint cần đăng nhập | `Bearer <access_token>` |
| `Content-Type` | Request | Có body | `application/json`; endpoint có ảnh dùng `multipart/form-data` (Axios tự sinh boundary) |
| `If-Match` | Request | Mọi thao tác ghi lên `orders` (§5.3) | `"<version>"`, ví dụ `"3"` |
| `Idempotency-Key` | Request | `POST /api/customer/orders/` | UUID v4, sinh 1 lần khi mở Checkout |
| `X-Request-ID` | Request / Response | Tùy chọn ở request; luôn có ở response | UUID v4 |
| `Content-Disposition` | Response | Endpoint xuất Excel | `attachment; filename="marketlink-report-<from>-<to>.xlsx"` |
- CORS: `CORS_ALLOW_HEADERS` thêm `if-match`, `idempotency-key`, `x-request-id`; `CORS_EXPOSE_HEADERS = ["x-request-id", "content-disposition"]`.

### 1.3 Xác thực & token (SimpleJWT)
| Thông số | Giá trị |
| :--- | :--- |
| Access token | 15 phút |
| Refresh token | 7 ngày, `ROTATE_REFRESH_TOKENS = True`, JTI cũ vào blacklist Redis |
| Đa phiên | Không giới hạn thiết bị (D-021); đăng xuất chỉ thu hồi refresh token của thiết bị đó |
| Claim bổ sung trong access token | `role`, `must_change_password` |
| Tài khoản `is_active = false` | Không đăng nhập được (403 `ACCOUNT_LOCKED`); token cũ bị từ chối ở lần refresh kế tiếp |

### 1.4 Giới hạn tần suất (DRF Throttling)
| Scope | Áp dụng | Mức |
| :--- | :--- | :--- |
| `login` | `POST /api/auth/login/` | 5 / phút / IP |
| `register` | `POST /api/auth/register/*` | 10 / giờ / IP |
| `orders` | `POST /api/customer/orders/` | 10 / giờ / user (D-005) |
| `chat` | `POST /api/chat/messages/` | 20 / phút / user hoặc IP |
| `anon` | Mọi endpoint còn lại, chưa đăng nhập | 120 / phút |
| `user` | Mọi endpoint còn lại, đã đăng nhập | 300 / phút |

---

## 2. KHUNG PHẢN HỒI, KIỂU DỮ LIỆU & MÃ LỖI

### 2.1 Envelope chuẩn
**Thành công**
```json
{
  "success": true,
  "message": "Đặt hàng thành công",
  "request_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "data": { },
  "errors": {}
}
```
**Lỗi**
```json
{
  "success": false,
  "message": "Một số sản phẩm không đủ hàng",
  "code": "INSUFFICIENT_STOCK",
  "request_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "data": {},
  "errors": {
    "groups.0.items.1.quantity": ["Chỉ còn 3 kg"]
  }
}
```
- `message`: tiếng Việt, hiển thị trực tiếp cho người dùng.
- `code`: tiếng Anh `UPPER_SNAKE_CASE`, FE dùng để rẽ nhánh xử lý. Chỉ có ở phản hồi lỗi.
- `errors`: object `{ "<đường_dẫn_trường>": ["<thông báo tiếng Việt>"] }`. Trường lồng dùng dấu chấm và chỉ số mảng. Lỗi không gắn trường dùng khóa `non_field_errors`.
- `204 No Content` không có body.
- **Ngoại lệ duy nhất không bọc envelope**: file Excel ở `GET /api/admin/reports/export/` (khi thành công).

### 2.2 Phân trang
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
    "results": [ ]
  },
  "errors": {}
}
```
- Query: `page` (mặc định 1). `page_size` cố định **20**, riêng review công khai **10**, dropdown chuông **10** (qua `limit`).
- `next` / `previous`: số trang hoặc `null`.
- Endpoint có phân trang được đánh dấu **[P]** ở §4.

### 2.3 Quy ước kiểu dữ liệu JSON
| Loại | Kiểu JSON | Ví dụ | Ghi chú |
| :--- | :--- | :--- | :--- |
| ID | integer | `1024` | |
| Tiền VND | integer | `45000` | Serializer dùng `IntegerField`, không trả chuỗi thập phân |
| Tọa độ | number (6 chữ số thập phân) | `10.772345` | |
| Số lượng | integer | `5` | |
| Ngày | string `YYYY-MM-DD` | `"2026-09-26"` | Theo giờ Việt Nam |
| Giờ trong ngày | string `HH:MM` | `"07:00"` | Giờ Việt Nam |
| Thời điểm | string ISO 8601 có offset | `"2026-09-26T07:00:00+07:00"` | Backend trả theo `Asia/Ho_Chi_Minh` |
| Thứ trong tuần | integer 1–7 | `6` | 1 = Thứ 2 … 7 = Chủ nhật |
| Enum | string HOA | `"READY_FOR_PICKUP"` | |
| Ảnh | string URL tuyệt đối hoặc `null` | `"https://api…/media/products/9f…c1.webp"` | |
| Boolean query param | `true` / `false` | `?in_stock=true` | |
| Danh sách trong query | chuỗi phân cách dấu phẩy | `?status=PLACED,ACCEPTED` | |

### 2.4 Mã HTTP thành công
| Mã | Dùng khi |
| :---: | :--- |
| `200 OK` | GET; PATCH / PUT; hành động nghiệp vụ `POST …/<action>/` trả về đối tượng sau cập nhật |
| `201 Created` | POST tạo tài nguyên mới (đăng ký, tạo đơn, tạo sản phẩm, tạo review…) |
| `204 No Content` | DELETE (bỏ yêu thích, xóa khung giờ, lưu trữ sản phẩm…); `POST /api/auth/logout/` |

### 2.5 Danh mục mã lỗi (đóng băng)
| HTTP | `code` | Khi nào | Xử lý FE (Pass 3 §1.7) |
| :---: | :--- | :--- | :--- |
| 400 | `VALIDATION_ERROR` | Dữ liệu sai định dạng / thiếu trường | Lỗi inline theo `errors` |
| 400 | `EMAIL_EXISTS` | Email đã đăng ký | Lỗi dưới ô email |
| 400 | `INSUFFICIENT_STOCK` | Thiếu hàng khi đặt / sửa đơn | Tô đỏ dòng theo `errors` |
| 400 | `INVALID_STATUS_TRANSITION` | Gate 1: cạnh FSM không tồn tại | Toast + refetch |
| 401 | `NOT_AUTHENTICATED` | Thiếu / hết hạn access token | Interceptor refresh |
| 401 | `INVALID_CREDENTIALS` | Sai email / mật khẩu | Lỗi trên form, không refresh |
| 401 | `TOKEN_INVALID` | Refresh token sai / đã thu hồi | Đăng xuất về `/login` |
| 403 | `ACCOUNT_LOCKED` | Tài khoản `is_active = false` | Thông báo trên form đăng nhập |
| 403 | `PERMISSION_DENIED` | Sai role cho nhánh API | `/403` hoặc toast |
| 403 | `ACTION_NOT_PERMITTED_FOR_ROLE` | Gate 2 FSM | Toast |
| 403 | `FARMER_NOT_APPROVED` | Farmer chưa `APPROVED` tạo sản phẩm / mẫu tuần | Toast + banner |
| 403 | `FARMER_SUSPENDED` | Farmer bị đình chỉ thực hiện thao tác ghi | Toast + banner |
| 404 | `NOT_FOUND` | Không tồn tại **hoặc ngoài phạm vi sở hữu** | `/404` |
| 409 | `RESOURCE_MODIFIED` | `If-Match` lệch `version` | Dialog "Tải lại" |
| 409 | `IDEMPOTENCY_IN_PROGRESS` | Cùng `Idempotency-Key` đang xử lý | Chờ, không gửi lại |
| 409 | `CONFLICT_RETRY` | Deadlock MySQL sau 1 lần retry | Toast "Vui lòng thử lại" |
| 422 | `OPEN_ORDER_LIMIT_EXCEEDED` | Vượt 1 đơn mở / Farmer hoặc 5 đơn mở (D-005) | Dialog giới hạn |
| 422 | `CUTOFF_PASSED` | Sửa / hủy / đặt sau `cutoff_at`; Farmer từ chối đơn `ACCEPTED` sau cutoff | Toast + refetch |
| 422 | `CUTOFF_NOT_REACHED` | Đánh dấu Sẵn sàng trước `cutoff_at` (T9) | Toast |
| 422 | `PICKUP_ALREADY_STARTED` | Duyệt / từ chối đơn `PLACED` sau `pickup_start_at` | Toast + refetch |
| 422 | `PICKUP_NOT_ENDED` | Đánh dấu Không đến trước `pickup_end_at` (T11) | Toast |
| 422 | `SLOT_NOT_AVAILABLE` | Khung giờ tắt / sai thứ / ngoài `BOOKING_HORIZON_DAYS` / chợ ngừng hoạt động | Yêu cầu chọn lại |
| 422 | `PRODUCT_NOT_AVAILABLE` | Sản phẩm lưu trữ / tạm ngừng / bị gỡ / Farmer không `APPROVED` | Tô xám dòng |
| 422 | `REVIEW_NOT_ALLOWED` | Đơn chưa `COMPLETED` hoặc đã đánh giá | Toast |
| 422 | `REPLY_ALREADY_EXISTS` | Farmer phản hồi lần 2 | Toast |
| 422 | `RESOURCE_IN_USE` | Xóa danh mục còn sản phẩm; gỡ chợ khỏi Farmer khi còn đơn mở; xóa khung giờ còn đơn mở | Toast |
| 422 | `IDEMPOTENCY_KEY_REUSED` | Cùng `Idempotency-Key` nhưng body khác lần trước | Sinh key mới, gửi lại |
| 422 | `FAILED_PRECONDITION` | Điều kiện tiên quyết khác (dự phòng) | Toast `message` |
| 428 | `PRECONDITION_REQUIRED` | Thiếu `If-Match` / `Idempotency-Key` | Lỗi lập trình |
| 429 | `THROTTLED` | Vượt giới hạn tần suất | Toast |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi không lường trước | Toast + mã sự cố |
| 503 | `AI_UNAVAILABLE` | Chat tắt (`AI_CHAT_ENABLED=false`) hoặc Gemini lỗi / quá 15s | Tin nhắn lỗi trong khung chat |

---

## 3. LƯỢC ĐỒ ĐỐI TƯỢNG DÙNG CHUNG (SHARED SCHEMAS)
*Ký hiệu: `field?` = có thể vắng mặt trong request (optional); `type | null` = có thể nhận giá trị null. Trường không ghi chú là bắt buộc và không null.*

### 3.1 Tài khoản
```ts
Me = {
  id: integer
  email: string
  role: "CUSTOMER" | "FARMER" | "ADMIN"
  must_change_password: boolean
  display_name: string                 // full_name (Customer) | stall_name (Farmer) | "Quản trị viên"
  farmer_status: FarmerStatus | null   // chỉ Farmer
}
CustomerProfile = { full_name: string, phone: string, address: string, email: string }
FarmerStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED"
```

### 3.2 Chợ, Nông dân, khung giờ
```ts
MarketSummary = {
  id: integer, name: string, address: string, image: string | null
  latitude: number, longitude: number
  operating_days: integer[]            // [2, 4, 7]
  open_time: "HH:MM", close_time: "HH:MM"
  farmer_count: integer                // Farmer APPROVED đang bán tại chợ
  distance_km: number | null           // chỉ khi request có lat & lng
  is_favorite: boolean | null          // null nếu không phải Customer
}
Market = MarketSummary & { description: string | null, map_provider: string }
MarketAdmin = Market & { is_active: boolean, open_order_count: integer, created_at, updated_at }

FarmerSummary = {
  id: integer, stall_name: string, image: string | null
  rating_avg: number | null, rating_count: integer
  markets: { market_id: integer, market_name: string, stall_label: string | null }[]
  operating_days: integer[]            // suy ra từ pickup_slots đang bật
  in_stock_product_count: integer
  distance_km: number | null
  is_favorite: boolean | null
}
FarmerPublic = FarmerSummary & {
  contact_person: string, phone: string, address: string, description: string | null
  latitude: number | null, longitude: number | null
  order_cutoff_hours: integer
  pickup_windows: { farmer_market_id, market_id, market_name, stall_label: string | null,
                    latitude, longitude,
                    slots: PickupSlot[] }[]
}
PickupSlot = { id: integer, day_of_week: integer, start_time: "HH:MM", end_time: "HH:MM", is_active: boolean }

PickupOption = {                        // dùng cho Checkout (C-02) và sửa đơn (C-06)
  market_id: integer, market_name: string, stall_label: string | null
  latitude: number, longitude: number
  dates: {
    date: "YYYY-MM-DD", day_of_week: integer
    slots: { pickup_slot_id: integer, start_time: "HH:MM", end_time: "HH:MM",
             cutoff_at: datetime, is_bookable: boolean }[]   // false nếu đã qua cutoff
  }[]
}
```

### 3.3 Danh mục & sản phẩm
```ts
Category = { id: integer, name: string, icon: string | null, display_order: integer }
CategoryAdmin = Category & { is_active: boolean, product_count: integer }
Unit = "KG" | "BUNCH" | "PIECE" | "PACK"

ProductCard = {
  id: integer, name: string, image: string | null
  price: integer, unit: Unit
  stock_quantity: integer
  is_available: boolean
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNAVAILABLE"   // tính sẵn cho badge
  category: { id: integer, name: string }
  farmer: { id: integer, stall_name: string }
  rating_avg: number | null, rating_count: integer
  is_favorite: boolean | null
}
ProductDetail = ProductCard & {
  description: string | null
  markets: { market_id: integer, market_name: string, days: integer[] }[]
}
FarmerProduct = ProductDetail & {      // phía Farmer
  weekly_default_quantity: integer | null
  held_quantity: integer               // đang giữ bởi đơn mở
  is_archived: boolean
  is_hidden_by_admin: boolean, hidden_reason: string | null
  created_at: datetime, updated_at: datetime
}
```

### 3.4 Đơn hàng
```ts
OrderStatus = "PLACED" | "ACCEPTED" | "READY_FOR_PICKUP" | "COMPLETED"
            | "CANCELLED" | "DECLINED" | "NO_SHOW" | "EXPIRED"

OrderSummary = {
  id: integer
  status: OrderStatus
  is_overdue: boolean                  // PLACED đã qua pickup_start_at nhưng chưa quét (D-009)
  version: integer
  customer: { id: integer, full_name: string, phone: string }      // Farmer, Admin thấy; Customer thấy chính mình
  farmer: { id: integer, stall_name: string, phone: string }
  market: { id: integer, name: string, address: string, latitude: number, longitude: number }
  stall_label: string | null
  pickup_date: "YYYY-MM-DD"
  pickup_start_at: datetime, pickup_end_at: datetime, cutoff_at: datetime
  item_count: integer
  total_amount: integer
  created_at: datetime
}
OrderDetail = OrderSummary & {
  customer: { id, full_name, phone, email }                          // email chỉ Farmer, Admin thấy
  pickup_slot_id: integer | null
  note: string | null
  items: OrderItem[]
  status_history: StatusHistory[]
  allowed_actions: OrderAction[]       // backend tính theo role + trạng thái + thời gian; FE chỉ dùng để hiển thị
  review_state: {                      // chỉ phía Customer, khi COMPLETED
    farmer_reviewed: boolean
    items_pending_review: integer[]    // order_item_id chưa đánh giá
  } | null
}
OrderItem = {
  id: integer, product_id: integer, product_name: string, unit: Unit
  unit_price: integer, quantity: integer, line_total: integer
  product_image: string | null
}
StatusHistory = {
  from_status: OrderStatus | null, to_status: OrderStatus
  transition: string | null            // "T1" … "T13"
  actor_role: "CUSTOMER" | "FARMER" | "ADMIN" | "SYSTEM"
  actor_name: string | null
  change_reason: string | null         // mã hệ thống được dịch sang câu tiếng Việt khi trả về
  created_at: datetime
}
OrderAction = "MODIFY" | "CANCEL" | "ACCEPT" | "DECLINE" | "READY" | "COMPLETE" | "NO_SHOW" | "REVIEW" | "REORDER"
```

### 3.5 Đánh giá
```ts
Review = {
  id: integer
  type: "FARMER" | "PRODUCT"
  rating: integer                      // 1–5
  comment: string | null
  customer_display_name: string        // "Nguyễn V. A." (U-05)
  product: { id: integer, name: string } | null      // chỉ type PRODUCT
  order_id: integer                                   // Farmer, Admin thấy
  reply: string | null, replied_at: datetime | null
  is_hidden_by_admin: boolean          // chỉ Farmer, Admin thấy
  hidden_reason: string | null         // chỉ Admin thấy
  created_at: datetime
}
RatingSummary = { rating_avg: number | null, rating_count: integer, distribution: { "1": integer, …, "5": integer } }
```

### 3.6 Thông báo, thông cáo, nhật ký
```ts
NotificationType = "ORDER_ACCEPTED" | "ORDER_READY" | "ORDER_DECLINED" | "ORDER_EXPIRED" | "RESTOCK"
                 | "ORDER_PLACED" | "ORDER_MODIFIED" | "ORDER_CANCELLED"
                 | "ORDER_CANCELLED_CUSTOMER_LOCKED" | "ACCOUNT_STATUS_CHANGED"
Notification = { id, type: NotificationType, title: string, message: string,
                 target_url: string | null, is_read: boolean, read_at: datetime | null, created_at: datetime }
Announcement = { id, title: string, content: string, audience: "ALL" | "CUSTOMER" | "FARMER",
                 starts_at: datetime, ends_at: datetime | null }
AnnouncementAdmin = Announcement & { is_active: boolean, created_by_name: string | null, created_at, updated_at }
AuditLog = { id, user: { id, email } | null, action: string, endpoint: string | null, method: string | null,
             ip_address: string | null, user_agent: string | null, status_code: integer | null,
             request_id: string | null, details: object, created_at: datetime }
```

---

## 4. DANH MỤC ENDPOINT (ENDPOINT CATALOG)
*Cột "Auth / Scope": quyền view + phạm vi dữ liệu. **[P]** = có phân trang. Lỗi chung (400 `VALIDATION_ERROR`, 401, 403 `PERMISSION_DENIED`, 404, 429, 500) áp dụng cho mọi endpoint và không nhắc lại.*

### 4.1 Xác thực — `/api/auth/`
| Mã | Method & URL | Auth / Scope | Request | `data` trả về | OK | Lỗi riêng | Màn hình |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| AU-01 | `POST /api/auth/register/customer/` | AllowAny · throttle `register` | `{ email, password, confirm_password, full_name, phone, address }` | `{ access, refresh, user: Me }` (tự đăng nhập) | 201 | `EMAIL_EXISTS` | G-10 |
| AU-02 | `POST /api/auth/register/farmer/` | AllowAny · throttle `register` | `{ email, password, confirm_password, stall_name, contact_person, phone, address }` | `{ access, refresh, user: Me }` (`farmer_status = PENDING`) | 201 | `EMAIL_EXISTS` | G-11 |
| AU-03 | `POST /api/auth/login/` | AllowAny · throttle `login` | `{ email, password }` | `{ access, refresh, user: Me }` | 200 | `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED` | G-09 |
| AU-04 | `POST /api/auth/refresh/` | AllowAny | `{ refresh }` | `{ access, refresh }` (rotation) | 200 | `TOKEN_INVALID`, `ACCOUNT_LOCKED` | Interceptor |
| AU-05 | `POST /api/auth/logout/` | Authenticated | `{ refresh }` | — | 204 | — | Header |
| AU-06 | `GET /api/auth/me/` | Authenticated | — | `Me` | 200 | — | Khởi động app |
| AU-07 | `POST /api/auth/change-password/` | Authenticated | `{ current_password, new_password, confirm_password }` | `{}` (giữ phiên hiện tại, D-021) | 200 | `VALIDATION_ERROR` (`current_password` sai) | C-11, F-11, A-12 |
| AU-08 | `POST /api/auth/ws-ticket/` | Authenticated (Customer, Farmer) | — | `{ ticket: uuid, expires_in: 30 }` | 200 | — | N-01 |
- Quy tắc validate: §1.5 Pass 3 (email chuẩn hóa lowercase; mật khẩu ≥ 8 ký tự, có chữ và số; SĐT regex VN).
- AU-03 ghi `audit_logs` `LOGIN` / `LOGIN_FAILED`; AU-05 ghi `LOGOUT`; AU-07 ghi `PASSWORD_CHANGED`.

### 4.2 Công khai — `/api/public/`
| Mã | Method & URL | Auth / Scope | Query / Request | `data` trả về | OK | Lỗi riêng | Màn hình |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| PU-01 | `GET /api/public/config/` | AllowAny | — | `{ ai_chat_enabled, booking_horizon_days: 7, max_open_orders_total: 5, max_open_orders_per_farmer: 1, max_upload_mb: 2 }` | 200 | — | App |
| PU-02 | `GET /api/public/categories/` | AllowAny · chỉ `is_active` | — | `Category[]` (không phân trang) | 200 | — | G-01, G-04, F-05 |
| PU-03 | `GET /api/public/markets/` **[P]** | AllowAny · chỉ `is_active` | `q?`, `day?` (1–7), `lat?`, `lng?`, `ordering?` = `name` \| `distance` (cần lat/lng) | `MarketSummary[]` | 200 | — | G-01, G-02, F-07 |
| PU-04 | `GET /api/public/markets/<id>/` | AllowAny · chợ `is_active` | `lat?`, `lng?` | `Market` | 200 | — | G-03 |
| PU-05 | `GET /api/public/markets/<id>/farmers/` **[P]** | AllowAny · Farmer `APPROVED` | `day?` | `FarmerSummary[]` (kèm `stall_label` của chợ này) | 200 | — | G-03 |
| PU-06 | `GET /api/public/farmers/` **[P]** | AllowAny · Farmer `APPROVED` | `q?`, `market_id?`, `day?`, `category_id?`, `lat?`, `lng?`, `ordering?` = `rating` \| `in_stock` \| `distance` \| `name` | `FarmerSummary[]` | 200 | — | G-13 |
| PU-07 | `GET /api/public/farmers/<id>/` | AllowAny · Farmer `APPROVED` | — | `FarmerPublic` | 200 | — | G-06 |
| PU-08 | `GET /api/public/farmers/<id>/pickup-options/` | AllowAny · Farmer `APPROVED`, slot `is_active`, chợ `is_active` | `from?` (mặc định hôm nay), `days?` (≤ `booking_horizon_days`) | `PickupOption[]` | 200 | — | C-02, C-06, G-06 |
| PU-09 | `GET /api/public/farmers/<id>/reviews/` **[P10]** | AllowAny · review không bị ẩn | `rating?` | `{ summary: RatingSummary, results: Review[] … }` | 200 | — | G-06 |
| PU-10 | `GET /api/public/products/` **[P]** | AllowAny · §6.2 "công khai" | `q?`, `category?` (ids), `market_id?`, `day?`, `farmer_id?`, `price_min?`, `price_max?`, `in_stock?` (mặc định `true`), `ids?` (tối đa 50, dùng làm mới giỏ C-01), `ordering?` = `newest` \| `price_asc` \| `price_desc` \| `rating` | `ProductCard[]` | 200 | — | G-01, G-04, G-06, C-01 |
| PU-11 | `GET /api/public/products/<id>/` | AllowAny · công khai | — | `ProductDetail` | 200 | — | G-05 |
| PU-12 | `GET /api/public/products/<id>/reviews/` **[P10]** | AllowAny · review không bị ẩn | `rating?` | `{ summary: RatingSummary, results: Review[] … }` | 200 | — | G-05 |
| PU-13 | `GET /api/public/announcements/` | AllowAny; nếu có JWT thì lọc thêm theo role | — | `Announcement[]` đang hiệu lực | 200 | — | N-04 |
- **Khi `ids` dùng cho giỏ hàng**, PU-10 trả cả sản phẩm hết hàng / tạm ngừng (bỏ qua `in_stock`), không trả sản phẩm lưu trữ / bị gỡ → FE đánh dấu "Ngừng bán".
- `is_favorite` chỉ có giá trị khi request mang JWT của Customer.

### 4.3 Khách hàng — `/api/customer/`
| Mã | Method & URL | Auth / Scope | Query / Request | `data` trả về | OK | Lỗi riêng | Màn hình |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| CU-01 | `GET /api/customer/dashboard/` | Customer · chính mình | — | `{ counts: { open, ready_for_pickup, completed, pending_review }, upcoming: OrderSummary[≤3], favorite_farmers: FarmerSummary[≤4], favorite_markets: MarketSummary[], last_order_id: integer \| null, recent_notifications: Notification[≤5] }` | 200 | — | C-00 |
| CU-02 | `GET /api/customer/profile/` | Customer · chính mình | — | `CustomerProfile` | 200 | — | C-10 |
| CU-03 | `PATCH /api/customer/profile/` | Customer · chính mình | `{ full_name?, phone?, address? }` | `CustomerProfile` | 200 | — | C-10 |
| CU-04 | `POST /api/customer/orders/` | Customer · throttle `orders` · **`Idempotency-Key`** | §5.1 | `{ orders: OrderSummary[] }` | 201 | `INSUFFICIENT_STOCK`, `OPEN_ORDER_LIMIT_EXCEEDED`, `SLOT_NOT_AVAILABLE`, `PRODUCT_NOT_AVAILABLE`, `CUTOFF_PASSED`, `IDEMPOTENCY_IN_PROGRESS`, `PRECONDITION_REQUIRED` | C-02, C-03 |
| CU-05 | `GET /api/customer/orders/` **[P]** | Customer · `customer = me` | `tab?` = `open` \| `history`, `status?`, `farmer_id?`, `pickup_from?`, `pickup_to?`, `ordering?` = `pickup_start_at` \| `-created_at` | `OrderSummary[]` | 200 | — | C-04 |
| CU-06 | `GET /api/customer/orders/<id>/` | Customer · `customer = me` | — | `OrderDetail` | 200 | — | C-05, C-06, C-07 |
| CU-07 | `PATCH /api/customer/orders/<id>/` | Customer · `customer = me` · **`If-Match`** | §5.2 | `OrderDetail` | 200 | `RESOURCE_MODIFIED`, `CUTOFF_PASSED`, `INSUFFICIENT_STOCK`, `SLOT_NOT_AVAILABLE`, `PRODUCT_NOT_AVAILABLE`, `INVALID_STATUS_TRANSITION` | C-06 |
| CU-08 | `POST /api/customer/orders/<id>/cancel/` | Customer · `customer = me` · **`If-Match`** | `{ reason?: string ≤ 500 }` | `OrderDetail` (T5 / T6) | 200 | `RESOURCE_MODIFIED`, `CUTOFF_PASSED`, `INVALID_STATUS_TRANSITION` | C-05 |
| CU-09 | `GET /api/customer/orders/<id>/reorder-preview/` | Customer · `customer = me` | — | `{ items: { product: ProductCard, quantity: integer }[], skipped: { product_id, product_name, reason: "OUT_OF_STOCK" \| "UNAVAILABLE" }[] }` (không ghi DB, giá hiện tại) | 200 | — | C-04, C-05 |
| CU-10 | `POST /api/customer/orders/<id>/farmer-review/` | Customer · `customer = me` | `{ rating: 1–5, comment?: string ≤ 1000 }` | `Review` | 201 | `REVIEW_NOT_ALLOWED` | C-07 |
| CU-11 | `POST /api/customer/orders/<id>/items/<item_id>/review/` | Customer · `customer = me`, item thuộc đơn | `{ rating: 1–5, comment?: string ≤ 1000 }` | `Review` | 201 | `REVIEW_NOT_ALLOWED` | C-07 |
| CU-12 | `GET /api/customer/favorite-ids/` | Customer · chính mình | — | `{ farmer_ids: integer[], product_ids: integer[], market_ids: integer[] }` | 200 | — | Tô ♥ toàn app |
| CU-13 | `GET /api/customer/favorite-farmers/` **[P]** | Customer · chính mình | — | `FarmerSummary[]` | 200 | — | C-08 |
| CU-14 | `POST /api/customer/favorite-farmers/` | Customer | `{ farmer_id }` | `{ farmer_id }` (đã có thì vẫn 201) | 201 | — | ♥ |
| CU-15 | `DELETE /api/customer/favorite-farmers/<farmer_id>/` | Customer · chính mình | — | — | 204 | — | ♥ |
| CU-16 | `GET · POST /api/customer/favorite-products/`, `DELETE …/<product_id>/` | Như CU-13 → CU-15 | `{ product_id }` | `ProductCard[]` / `{ product_id }` | 200 / 201 / 204 | — | C-08, ♥ |
| CU-17 | `GET · POST /api/customer/favorite-markets/`, `DELETE …/<market_id>/` | Như CU-13 → CU-15 | `{ market_id }` | `MarketSummary[]` / `{ market_id }` | 200 / 201 / 204 | — | C-08, ♥ |
- **Giỏ hàng không có API** (D-004: Zustand persist). Làm mới giỏ dùng PU-10 `?ids=`; khung nhận dùng PU-08.

### 4.4 Nông dân — `/api/farmer/`
| Mã | Method & URL | Auth / Scope | Query / Request | `data` trả về | OK | Lỗi riêng | Màn hình |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| FA-01 | `GET /api/farmer/dashboard/` | Farmer · chính mình · chạy quét lười (D-009) | `from?`, `to?` (mặc định 7 ngày) | `{ kpis: { total_orders, pending_approval, in_progress, revenue }, revenue_by_day: { date, revenue }[], top_products: { product_id, name, quantity_sold, revenue }[≤5], overdue_open_count: integer, upcoming: OrderSummary[≤5], status: FarmerStatus, status_reason: string \| null }` | 200 | — | F-01 |
| FA-02 | `GET /api/farmer/profile/` | Farmer · chính mình | — | `FarmerPublic` + `{ email, status, status_reason }` | 200 | — | F-08 |
| FA-03 | `PATCH /api/farmer/profile/` | Farmer · chính mình · multipart nếu có ảnh | `{ stall_name?, contact_person?, phone?, address?, description?, image?: file, latitude?, longitude?, order_cutoff_hours?: 0–72 }` | như FA-02 | 200 | `VALIDATION_ERROR` (tọa độ thiếu một nửa) | F-07, F-08 |
| FA-04 | `GET /api/farmer/markets/` | Farmer · `farmer = me` | — | `{ id (farmer_market_id), market: MarketSummary, stall_label, slots: PickupSlot[], open_order_count }[]` | 200 | — | F-07 |
| FA-05 | `POST /api/farmer/markets/` | Farmer · `farmer = me` | `{ market_id, stall_label?: ≤ 30 }` | 1 phần tử như FA-04 | 201 | `VALIDATION_ERROR` (đã tham gia chợ này / chợ ngừng hoạt động) | F-07 |
| FA-06 | `PATCH /api/farmer/markets/<farmer_market_id>/` | Farmer · `farmer = me` | `{ stall_label }` | như FA-04 | 200 | — | F-07 |
| FA-07 | `DELETE /api/farmer/markets/<farmer_market_id>/` | Farmer · `farmer = me` | — | — | 204 | `RESOURCE_IN_USE` (còn đơn mở tại chợ) | F-07 |
| FA-08 | `POST /api/farmer/pickup-slots/` | Farmer · `farmer_market.farmer = me` | `{ farmer_market_id, day_of_week, start_time, end_time }` | `PickupSlot` | 201 | `VALIDATION_ERROR` (không phải ngày chợ họp / ngoài giờ chợ / trùng khung) | F-07 |
| FA-09 | `PATCH /api/farmer/pickup-slots/<id>/` | Như FA-08 | `{ day_of_week?, start_time?, end_time?, is_active? }` | `PickupSlot` | 200 | như FA-08 | F-07 |
| FA-10 | `DELETE /api/farmer/pickup-slots/<id>/` | Như FA-08 | — | — | 204 | `RESOURCE_IN_USE` (còn đơn mở dùng khung này → gợi ý tắt `is_active`) | F-07 |
| FA-11 | `GET /api/farmer/products/` **[P]** | Farmer · `farmer = me` | `q?`, `category_id?`, `state?` = `in_stock` \| `out_of_stock` \| `unavailable` \| `hidden` \| `archived` | `FarmerProduct[]` | 200 | — | F-04 |
| FA-12 | `POST /api/farmer/products/` | Farmer `APPROVED` · multipart | `{ name, category_id, price, unit, stock_quantity, weekly_default_quantity?, description?, image?: file, is_available? }` | `FarmerProduct` | 201 | `FARMER_NOT_APPROVED` | F-05 |
| FA-13 | `GET /api/farmer/products/<id>/` | Farmer · `farmer = me` | — | `FarmerProduct` | 200 | — | F-05 |
| FA-14 | `PATCH /api/farmer/products/<id>/` | Farmer `APPROVED` · `farmer = me` · multipart | Các trường của FA-12 (tùy chọn) | `FarmerProduct` + `{ restock_notified: integer }` | 200 | `FARMER_NOT_APPROVED`, `FAILED_PRECONDITION` (sản phẩm bị Admin gỡ / đã lưu trữ) | F-04, F-05 |
| FA-15 | `DELETE /api/farmer/products/<id>/` | Farmer · `farmer = me` | — | — (đặt `is_archived = true`, D-017) | 204 | — | F-04 |
| FA-16 | `POST /api/farmer/products/<id>/mark-sold-out/` | Farmer · `farmer = me` | — | `FarmerProduct` (`stock_quantity = 0`) | 200 | — | F-04 |
| FA-17 | `GET /api/farmer/products/weekly-template-preview/` | Farmer `APPROVED` · chạy quét lười | — | `{ rows: { product_id, name, weekly_default_quantity, held_quantity, current_stock, new_stock, is_available }[], overdue_orders: OrderSummary[] }` | 200 | `FARMER_NOT_APPROVED` | F-06 |
| FA-18 | `POST /api/farmer/products/apply-weekly-template/` | Farmer `APPROVED` | `{}` | `{ updated_count, restock_notified }` | 200 | `FARMER_NOT_APPROVED` | F-06 |
| FA-19 | `GET /api/farmer/orders/` **[P]** | Farmer · `farmer = me` · chạy quét lười | `tab?` = `placed` \| `accepted` \| `ready` \| `history`, `status?`, `market_id?`, `pickup_from?`, `pickup_to?`, `q?` (mã đơn / tên khách), `overdue?` (`true` = ACCEPTED/READY đã qua `pickup_end_at`) | `OrderSummary[]` | 200 | — | F-02 |
| FA-20 | `GET /api/farmer/orders/tab-counts/` | Farmer · `farmer = me` | — | `{ placed, accepted, ready, overdue }` | 200 | — | F-02 |
| FA-21 | `GET /api/farmer/orders/picking-list/` | Farmer · `farmer = me` | `pickup_date` (bắt buộc), `market_id?` | `{ pickup_date, market_id, rows: { product_id, product_name, unit, total_quantity, order_count }[] }` (U-03) | 200 | — | F-02 |
| FA-22 | `GET /api/farmer/orders/<id>/` | Farmer · `farmer = me` | — | `OrderDetail` | 200 | — | F-03 |
| FA-23 | `POST /api/farmer/orders/<id>/accept/` | Farmer · `farmer = me` · **`If-Match`** | `{}` | `OrderDetail` (T2) | 200 | `RESOURCE_MODIFIED`, `INVALID_STATUS_TRANSITION`, `PICKUP_ALREADY_STARTED`, `FARMER_SUSPENDED` | F-02, F-03 |
| FA-24 | `POST /api/farmer/orders/<id>/decline/` | Như FA-23 | `{ reason: string 5–500 }` | `OrderDetail` (T3 / T4) | 200 | như FA-23 + `CUTOFF_PASSED` (T4) | F-02, F-03 |
| FA-25 | `POST /api/farmer/orders/<id>/ready/` | Như FA-23 | `{}` | `OrderDetail` (T9) | 200 | như FA-23 + `CUTOFF_NOT_REACHED` | F-02, F-03 |
| FA-26 | `POST /api/farmer/orders/<id>/complete/` | Như FA-23 | `{}` | `OrderDetail` (T10) | 200 | `RESOURCE_MODIFIED`, `INVALID_STATUS_TRANSITION` | F-02, F-03, F-06 |
| FA-27 | `POST /api/farmer/orders/<id>/no-show/` | Như FA-23 | `{}` | `OrderDetail` (T11) | 200 | như FA-26 + `PICKUP_NOT_ENDED` | F-02, F-03, F-06 |
| FA-28 | `GET /api/farmer/reviews/` **[P]** | Farmer · review thuộc sạp / sản phẩm của me | `type?` = `FARMER` \| `PRODUCT`, `rating?`, `replied?` | `Review[]` | 200 | — | F-09 |
| FA-29 | `POST /api/farmer/farmer-reviews/<id>/reply/` | Farmer · `order.farmer = me` | `{ reply: string 1–500 }` | `Review` | 200 | `REPLY_ALREADY_EXISTS`, `FAILED_PRECONDITION` (review bị ẩn) | F-09 |
| FA-30 | `POST /api/farmer/product-reviews/<id>/reply/` | Farmer · `product.farmer = me` | `{ reply: string 1–500 }` | `Review` | 200 | như FA-29 | F-09 |
- **Farmer `SUSPENDED`**: mọi endpoint ghi của `/api/farmer/` trả 403 `FARMER_SUSPENDED`; endpoint đọc vẫn dùng được (Pass 3 §2.2).
- **Farmer `PENDING` / `REJECTED`**: được sửa hồ sơ, chợ, khung giờ; không tạo / sửa sản phẩm, không áp dụng mẫu tuần (`FARMER_NOT_APPROVED`).

### 4.5 Quản trị — `/api/admin/`
| Mã | Method & URL | Auth / Scope | Query / Request | `data` trả về | OK | Lỗi riêng | Màn hình |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| AD-01 | `GET /api/admin/dashboard/` | Admin · toàn hệ thống | — | `{ totals: { farmers, farmers_pending, customers, markets_active, orders }, orders_by_day: { date, count }[30], orders_by_status: { status, count }[], pending_farmers: AdminFarmerRow[≤5] }` | 200 | — | A-01 |
| AD-02 | `GET /api/admin/farmers/` **[P]** | Admin | `status?`, `q?` (tên sạp / email / SĐT), `market_id?` | `AdminFarmerRow[]` = `{ id, stall_name, contact_person, phone, email, status, date_joined, product_count, open_order_count }` | 200 | — | A-02 |
| AD-03 | `GET /api/admin/farmers/<id>/` | Admin | — | `FarmerPublic` + `{ email, status, status_reason, products: FarmerProduct[≤20], order_stats: { total, completed, declined, expired, no_show }, status_history: { from_status, to_status, reason, changed_by, changed_at }[] }` | 200 | — | A-03 |
| AD-04 | `GET /api/admin/farmers/<id>/suspension-impact/` | Admin | — | `{ open_orders: { PLACED, ACCEPTED, READY_FOR_PICKUP, total }, affected_customers: integer }` | 200 | — | Dialog A-02 |
| AD-05 | `POST /api/admin/farmers/<id>/approve/` | Admin | `{}` | `AdminFarmerRow` | 200 | `INVALID_STATUS_TRANSITION` (không ở `PENDING`) | A-02, A-03 |
| AD-06 | `POST /api/admin/farmers/<id>/reject/` | Admin | `{ reason: 5–500 }` | `AdminFarmerRow` | 200 | như AD-05 | A-02, A-03 |
| AD-07 | `POST /api/admin/farmers/<id>/suspend/` | Admin | `{ reason: 5–500 }` | `AdminFarmerRow` + `{ affected_orders: integer }` — §5.4 | 200 | `INVALID_STATUS_TRANSITION` (không ở `APPROVED`), `CONFLICT_RETRY` | A-02, A-03 |
| AD-08 | `POST /api/admin/farmers/<id>/reinstate/` | Admin | `{}` | `AdminFarmerRow` | 200 | `INVALID_STATUS_TRANSITION` (không ở `SUSPENDED`) | A-02, A-03 |
| AD-09 | `GET /api/admin/customers/` **[P]** | Admin | `is_active?`, `q?` | `{ id, full_name, email, phone, date_joined, is_active, total_orders, open_orders, no_show_count }[]` | 200 | — | A-04 |
| AD-10 | `GET /api/admin/customers/<id>/` | Admin | — | Như dòng AD-09 + `{ address, recent_orders: OrderSummary[≤10] }` | 200 | — | A-04 |
| AD-11 | `GET /api/admin/customers/<id>/deactivation-impact/` | Admin | — | `{ open_orders: { PLACED, ACCEPTED, READY_FOR_PICKUP, total }, affected_farmers: integer }` | 200 | — | Dialog A-04 |
| AD-12 | `POST /api/admin/customers/<id>/deactivate/` | Admin | `{ reason: 5–500 }` | Dòng AD-09 + `{ affected_orders }` — §5.4 | 200 | `INVALID_STATUS_TRANSITION` (đã khóa), `CONFLICT_RETRY` | A-04 |
| AD-13 | `POST /api/admin/customers/<id>/activate/` | Admin | `{}` | Dòng AD-09 | 200 | `INVALID_STATUS_TRANSITION` (đang hoạt động) | A-04 |
| AD-14 | `GET /api/admin/markets/` **[P]** | Admin · gồm chợ ngừng hoạt động | `q?`, `is_active?` | `MarketAdmin[]` | 200 | — | A-05 |
| AD-15 | `POST /api/admin/markets/` | Admin · multipart nếu có ảnh | `{ name, address, description?, image?: file, latitude, longitude, operating_days: integer[] (≥ 1), open_time, close_time }` | `MarketAdmin` | 201 | `VALIDATION_ERROR` (trùng tên, giờ đóng ≤ giờ mở) | A-06 |
| AD-16 | `GET · PATCH /api/admin/markets/<id>/` | Admin | Các trường AD-15 (tùy chọn) | `MarketAdmin` | 200 | như AD-15 | A-06 |
| AD-17 | `POST /api/admin/markets/<id>/deactivate/` · `…/activate/` | Admin | `{}` | `MarketAdmin` | 200 | — | A-05 |
| AD-18 | `GET · POST /api/admin/categories/` | Admin | `{ name, icon?, display_order? }` | `CategoryAdmin[]` / `CategoryAdmin` | 200 / 201 | `VALIDATION_ERROR` (trùng tên) | A-07 |
| AD-19 | `PATCH · DELETE /api/admin/categories/<id>/` | Admin | `{ name?, icon?, display_order?, is_active? }` | `CategoryAdmin` / — | 200 / 204 | `RESOURCE_IN_USE` (DELETE khi còn sản phẩm) | A-07 |
| AD-20 | `GET /api/admin/products/` **[P]** | Admin | `q?`, `farmer_id?`, `is_hidden?` | `FarmerProduct` + `{ farmer: { id, stall_name } }` | 200 | — | A-08 |
| AD-21 | `POST /api/admin/products/<id>/hide/` · `…/restore/` | Admin | hide: `{ reason: 5–500 }`; restore: `{}` | `FarmerProduct` | 200 | — | A-08 |
| AD-22 | `GET /api/admin/reviews/` **[P]** | Admin | `type?` = `FARMER` \| `PRODUCT`, `rating?`, `is_hidden?` | `Review[]` | 200 | — | A-08 |
| AD-23 | `POST /api/admin/farmer-reviews/<id>/hide/` · `…/restore/` | Admin | hide: `{ reason: 5–500 }` | `Review` | 200 | — | A-08 |
| AD-24 | `POST /api/admin/product-reviews/<id>/hide/` · `…/restore/` | Admin | như AD-23 | `Review` | 200 | — | A-08 |
| AD-25 | `GET /api/admin/reports/summary/` | Admin | `from` (bắt buộc), `to` (bắt buộc, ≤ 366 ngày), `market_id?` | `{ orders_by_status: { status, count }[], revenue_by_market: { market_id, market_name, completed_orders, revenue }[], top_farmers: { farmer_id, stall_name, completed_orders, revenue, rating_avg }[≤10] }` — doanh thu chỉ tính `COMPLETED` | 200 | — | A-09 |
| AD-26 | `GET /api/admin/reports/export/` | Admin | như AD-25 | **File `.xlsx`** (3 sheet tương ứng 3 khối AD-25), không envelope; ghi `audit_logs` `EXPORT_DATA` | 200 | Lỗi trả JSON envelope | A-09 |
| AD-27 | `GET · POST /api/admin/announcements/` **[P]** | Admin | `{ title, content, audience, starts_at, ends_at?, is_active? }` | `AnnouncementAdmin[]` / `AnnouncementAdmin` | 200 / 201 | `VALIDATION_ERROR` (`ends_at ≤ starts_at`) | A-10 |
| AD-28 | `PATCH · DELETE /api/admin/announcements/<id>/` | Admin | các trường AD-27 (tùy chọn) | `AnnouncementAdmin` / — | 200 / 204 | — | A-10 |
| AD-29 | `GET /api/admin/audit-logs/` **[P]** | Admin · chỉ đọc | `action?`, `user_id?`, `from?`, `to?` | `AuditLog[]` | 200 | — | A-11 |
| AD-30 | `GET /api/admin/audit-logs/<id>/` | Admin · chỉ đọc | — | `AuditLog` | 200 | — | A-11 |
- Mọi hành động Admin AD-05 → AD-08, AD-12, AD-13, AD-21, AD-23, AD-24 ghi `audit_logs` với action tương ứng (Pass 4A §4).
- `status_history` ở AD-03 lấy từ `farmer_profile_histories`.

### 4.6 Thông báo — `/api/notifications/` (Customer, Farmer)
| Mã | Method & URL | Auth / Scope | Query / Request | `data` trả về | OK | Màn hình |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| NO-01 | `GET /api/notifications/` **[P]** | `recipient = me` | `is_read?`, `limit?` (≤ 10, bỏ phân trang — dùng cho dropdown) | `Notification[]` | 200 | N-01, C-09, F-10 |
| NO-02 | `GET /api/notifications/unread-count/` | `recipient = me` | — | `{ unread_count }` | 200 | N-01 |
| NO-03 | `POST /api/notifications/<id>/read/` | `recipient = me` | — | `Notification` | 200 | N-01, C-09, F-10 |
| NO-04 | `POST /api/notifications/read-all/` | `recipient = me` | — | `{ updated_count }` | 200 | N-01 |
- Admin gọi nhóm này → 403 `PERMISSION_DENIED` (Admin không nhận thông báo cá nhân).

### 4.7 Chat AI — `/api/chat/` (D-011)
| Mã | Method & URL | Auth / Scope | Request | `data` trả về | OK | Lỗi riêng |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| CH-01 | `POST /api/chat/messages/` | AllowAny · throttle `chat`; tool `get_my_open_orders` chỉ chạy khi JWT là Customer | `{ messages: { role: "user" \| "assistant", content: string ≤ 1000 }[≤ 10] }` (tin cuối là `user`) | `{ reply: string, tools_used: string[] }` | 200 | `AI_UNAVAILABLE` (503) |

### 4.8 Hệ thống
| Mã | Method & URL | Auth | `data` trả về | OK |
| :---: | :--- | :--- | :--- | :---: |
| SY-01 | `GET /api/health/` | AllowAny | `{ status: "ok", database: "ok" \| "error", time: datetime }` (NFR-08) | 200 / 503 |

### 4.9 WebSocket — `/ws/notifications/?ticket=<uuid>` (D-010)
| Bước | Chi tiết |
| :--- | :--- |
| 1 | Client gọi AU-08 lấy `ticket` (TTL 30s, dùng 1 lần) |
| 2 | Kết nối `wss://<host>/ws/notifications/?ticket=<uuid>`; vé sai / hết hạn → đóng mã `4401` |
| 3 | Server tham gia group `user_<id>` |
| 4 | Gói tin server → client: `{ "event": "NEW_NOTIFICATION", "data": Notification }` |
| 5 | Mất kết nối → backoff 1s → 2s → 4s → tối đa 16s, **xin vé mới mỗi lần**; sau khi nối lại gọi NO-02 để đồng bộ số chưa đọc |
- Client không gửi gói tin lên server qua kênh này.

---

## 5. ĐẶC TẢ CHI TIẾT CÁC ENDPOINT NGHIỆP VỤ LÕI

### 5.1 CU-04 — Checkout tạo N đơn (T1 · D-004, D-005)
**Request**
```http
POST /api/customer/orders/
Authorization: Bearer <access>
Idempotency-Key: 5f0c2c1e-8a3b-4b8e-9d7e-2a61c0f4b9a1
Content-Type: application/json
```
```json
{
  "groups": [
    {
      "farmer_id": 12,
      "pickup_slot_id": 40,
      "pickup_date": "2026-09-26",
      "note": "Lấy giúp rau non",
      "items": [
        { "product_id": 101, "quantity": 2 },
        { "product_id": 102, "quantity": 1 }
      ]
    },
    {
      "farmer_id": 15,
      "pickup_slot_id": 55,
      "pickup_date": "2026-09-27",
      "items": [ { "product_id": 230, "quantity": 3 } ]
    }
  ]
}
```
| Trường | Kiểu | Ràng buộc |
| :--- | :--- | :--- |
| `groups` | array | 1 → 5 phần tử; `farmer_id` không trùng giữa các nhóm |
| `groups[].farmer_id` | integer | Farmer `APPROVED` |
| `groups[].pickup_slot_id` | integer | Slot `is_active`, thuộc Farmer, chợ `is_active` |
| `groups[].pickup_date` | `YYYY-MM-DD` | Đúng `day_of_week` của slot; từ hôm nay đến `booking_horizon_days` |
| `groups[].note` | string? | ≤ 300 |
| `groups[].items` | array | 1 → 50 phần tử; `product_id` không trùng trong nhóm |
| `items[].quantity` | integer | 1 → 999 |
- **So với ví dụ D-004**: bọc trong khóa `groups` (thay vì mảng gốc) và thêm `pickup_date` vì `pickup_slot` lặp lại hàng tuần. Không nhận giá từ client.

**Thứ tự xử lý (All-or-Nothing)**
1. Kiểm tra `Idempotency-Key` trong Redis (khóa `idem:<user_id>:<key>`): đang xử lý → 409 `IDEMPOTENCY_IN_PROGRESS`; đã hoàn tất → trả lại **nguyên** phản hồi cũ (201) kèm header `Idempotent-Replayed: true`; cùng khóa nhưng body khác → 422 `IDEMPOTENCY_KEY_REUSED`.
2. Validate cấu trúc (serializer) → 400 `VALIDATION_ERROR`.
3. `transaction.atomic()`:
   1. Khóa `customer_profiles` của khách; đếm đơn mở → vượt giới hạn → 422 `OPEN_ORDER_LIMIT_EXCEEDED`.
   2. Gọi `expire_overdue_orders(farmer_id)` cho từng Farmer trong giỏ.
   3. Tính `pickup_start_at`, `pickup_end_at`, `cutoff_at` cho từng nhóm; `now ≥ cutoff_at` → 422 `CUTOFF_PASSED`; slot / ngày sai → 422 `SLOT_NOT_AVAILABLE`.
   4. Khóa mọi `products` của tất cả nhóm theo `order_by("id")`; sản phẩm không thuộc Farmer của nhóm → 400 `VALIDATION_ERROR`; không còn bán công khai → 422 `PRODUCT_NOT_AVAILABLE`; thiếu hàng → 400 `INSUFFICIENT_STOCK` (liệt kê **mọi** dòng thiếu trong `errors`).
   5. Trừ kho, tạo `orders` + `order_items` (snapshot giá, tên, đơn vị, chợ, sạp, thời gian), ghi `order_status_history` (T1, `actor_role = CUSTOMER`).
   6. `notify()` Farmer `ORDER_PLACED` (in-app) qua `on_commit`.
4. Lưu phản hồi vào Redis 24h.

**Response 201**
```json
{
  "success": true,
  "message": "Đã đặt 2 đơn hàng thành công",
  "request_id": "…",
  "data": { "orders": [ { "id": 1024, "status": "PLACED", "version": 1, "total_amount": 120000, "...": "OrderSummary" } ] },
  "errors": {}
}
```
**Response 400 `INSUFFICIENT_STOCK`** — `errors` dùng đường dẫn theo request:
```json
{ "errors": { "groups.0.items.1.quantity": ["Chỉ còn 3 kg"], "groups.1.items.0.quantity": ["Sản phẩm đã hết hàng"] },
  "data": { "available": { "102": 3, "230": 0 } } }
```

### 5.2 CU-07 — Sửa đơn (D-007)
**Request** (`If-Match: "3"`)
```json
{
  "pickup_slot_id": 41,
  "pickup_date": "2026-09-26",
  "note": "…",
  "items": [ { "product_id": 101, "quantity": 5 }, { "product_id": 105, "quantity": 2 } ]
}
```
| Trường | Quy tắc |
| :--- | :--- |
| `items?` | **Danh sách đầy đủ sau khi sửa** (khai báo, không phải chênh lệch). Tối thiểu 1 phần tử; mọi sản phẩm thuộc cùng Farmer của đơn. Muốn bỏ hết món → dùng CU-08 |
| `pickup_slot_id?`, `pickup_date?` | Đổi khung phải gửi **cả hai**; slot thuộc cùng Farmer; phải còn trước cutoff của **cả** khung cũ lẫn khung mới |
| `note?` | ≤ 300 |
- **Điều kiện**: đơn `PLACED` hoặc `ACCEPTED`, `now < cutoff_at` (cũ).
- **Kho**: tính chênh lệch từng món dưới khóa `products` `order_by("id")`; món giữ nguyên giữ `unit_price` cũ, món mới lấy giá hiện tại.
- **Trạng thái**: `ACCEPTED` → `PLACED` (T7, `actor_role = SYSTEM`, `change_reason` = tóm tắt thay đổi); đơn đang `PLACED` ghi 1 dòng history `PLACED → PLACED`, `transition = null`.
- **Response**: `OrderDetail` với `version` mới. Farmer nhận `ORDER_MODIFIED` (in-app).

### 5.3 Endpoint hành động FSM (D-006 · Triple-Gate)
| Cạnh | Endpoint | Actor | Gate 1 (400) — từ trạng thái | Gate 3 (422) — điều kiện | `If-Match` | Kho | Thông báo (email) |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| T1 | CU-04 | Customer | (tạo) | trước `cutoff_at`; D-005 | — (`Idempotency-Key`) | − | Farmer `ORDER_PLACED` |
| T2 | FA-23 accept | Farmer | `PLACED` | trước `pickup_start_at` → `PICKUP_ALREADY_STARTED` | ✅ | — | Khách `ORDER_ACCEPTED` ✉ |
| T3 | FA-24 decline | Farmer | `PLACED` | trước `pickup_start_at`; `reason` bắt buộc | ✅ | + | Khách `ORDER_DECLINED` ✉ |
| T4 | FA-24 decline | Farmer | `ACCEPTED` | trước `cutoff_at` → `CUTOFF_PASSED`; `reason` bắt buộc | ✅ | + | Khách `ORDER_DECLINED` ✉ |
| T5 | CU-08 cancel | Customer | `PLACED` | trước `cutoff_at` | ✅ | + | Farmer `ORDER_CANCELLED` ✉ |
| T6 | CU-08 cancel | Customer | `ACCEPTED` | trước `cutoff_at` | ✅ | + | Farmer `ORDER_CANCELLED` ✉ |
| T7 | CU-07 (sửa) | System | `ACCEPTED` | trước `cutoff_at` | ✅ | ± | Farmer `ORDER_MODIFIED` |
| T8 | Quét lười (không endpoint) | System | `PLACED` | đã qua `pickup_start_at` | — | + | Khách `ORDER_EXPIRED` ✉ |
| T9 | FA-25 ready | Farmer | `ACCEPTED` | sau `cutoff_at` → `CUTOFF_NOT_REACHED` | ✅ | — | Khách `ORDER_READY` ✉ |
| T10 | FA-26 complete | Farmer | `READY_FOR_PICKUP` | — | ✅ | — | — |
| T11 | FA-27 no-show | Farmer | `READY_FOR_PICKUP` | sau `pickup_end_at` → `PICKUP_NOT_ENDED` | ✅ | — | — |
| T3, T4, T12 | AD-07 suspend | Admin | Mọi đơn mở của Farmer | bỏ qua gate thời gian | — (khóa dòng) | + | Khách `ORDER_DECLINED` ✉ |
| T5, T6, T13 | AD-12 deactivate | Admin | Mọi đơn mở của Khách | bỏ qua gate thời gian | — (khóa dòng) | + | Farmer `ORDER_CANCELLED_CUSTOMER_LOCKED` ✉ |
- **Gate 2 (403 `ACTION_NOT_PERMITTED_FOR_ROLE`)** chủ yếu được thực thi bằng việc tách nhánh URL theo role; đơn ngoài phạm vi sở hữu trả **404** (§6).
- Mọi endpoint hành động trả `OrderDetail` đã cập nhật (có `version` mới và `allowed_actions`).

### 5.4 AD-07 / AD-12 — Hành động Admin kéo theo đơn hàng
| Bước | AD-07 Đình chỉ Farmer | AD-12 Khóa Khách |
| :---: | :--- | :--- |
| 1 | Khóa `farmer_profiles`; `APPROVED → SUSPENDED`, lưu `status_reason` | Khóa `users`; `is_active → false` |
| 2 | Khóa đơn mở của Farmer `order_by("id")` | Khóa đơn mở của Khách `order_by("id")` |
| 3 | `PLACED → DECLINED` (T3), `ACCEPTED → DECLINED` (T4), `READY_FOR_PICKUP → DECLINED` (T12) | `PLACED → CANCELLED` (T5), `ACCEPTED → CANCELLED` (T6), `READY_FOR_PICKUP → CANCELLED` (T13) |
| 4 | Khóa `products` liên quan `order_by("id")`, cộng trả kho | như bên trái |
| 5 | `order_status_history`: `actor_role = ADMIN`, `change_reason = FARMER_SUSPENDED_BY_ADMIN`; tăng `version` | `change_reason = CUSTOMER_LOCKED_BY_ADMIN` |
| 6 | `notify()` từng khách (in-app + email); Farmer nhận `ACCOUNT_STATUS_CHANGED` | `notify()` từng Farmer (in-app + email) |
| 7 | `audit_logs` `FARMER_SUSPENDED` (`details.affected_orders`) | `audit_logs` `CUSTOMER_DEACTIVATED` |
- Toàn bộ bước 1 → 5 trong một `transaction.atomic()`; bước 6 qua `on_commit`; bước 7 ghi ngoài transaction nghiệp vụ.

### 5.5 Cảnh báo có hàng lại (RESTOCK · FR-24)
- Kích hoạt khi `stock_quantity` của sản phẩm công khai đổi từ `0` lên `> 0` qua FA-14 hoặc FA-18, hoặc khi đơn bị hủy / từ chối / hết hạn làm kho từ `0` lên `> 0`.
- Người nhận: khách trong `favorite_products` của sản phẩm đó. Chỉ in-app (D-010). FA-14 / FA-18 trả số người được báo (`restock_notified`).

---

## 6. PHẠM VI QUYỀN CẤP ĐỐI TƯỢNG (OBJECT-LEVEL SCOPE)

### 6.1 Thu hẹp `get_queryset()` theo role
| Role | Tài nguyên | Điều kiện lọc | Ngoài phạm vi |
| :--- | :--- | :--- | :--- |
| Customer | `orders`, `order_items`, review tạo mới | `order.customer_id = me` | **404** |
| Customer | favorites, profile, notifications | `customer_id / recipient_id / user_id = me` | 404 |
| Farmer | `products` | `farmer_id = me` | 404 |
| Farmer | `orders` | `farmer_id = me` | 404 |
| Farmer | `farmer_markets`, `pickup_slots` | `farmer_id = me` / `farmer_market.farmer_id = me` | 404 |
| Farmer | reviews | `order.farmer_id = me` / `order_item.product.farmer_id = me` | 404 |
| Admin | mọi tài nguyên trong `/api/admin/` | không lọc | — |
| Mọi role | Gọi sai nhánh role (Customer gọi `/api/farmer/…`) | Permission class | **403** + `audit_logs` `ACCESS_DENIED` |

### 6.2 Điều kiện hiển thị công khai (`/api/public/`)
| Tài nguyên | Điều kiện |
| :--- | :--- |
| Chợ | `is_active = true` |
| Nông dân | `status = APPROVED` và `user.is_active = true` |
| Sản phẩm | `is_archived = false`, `is_hidden_by_admin = false`, Farmer thỏa điều kiện trên (hết hàng / tạm ngừng vẫn hiện nếu `in_stock=false` hoặc qua `ids`) |
| Khung giờ | `is_active = true`, chợ `is_active = true` |
| Review | `is_hidden_by_admin = false` |
| Thông cáo | `is_active = true`, `starts_at ≤ now`, (`ends_at` null hoặc `> now`), đúng `audience` |

### 6.3 Ma trận PBAC 5 chiều cho `orders`
`Quyền = f(Actor, Action, Resource, Ownership, FSM State)` — được hiện thực bởi: nhánh URL (Actor) → `get_queryset()` (Ownership) → bảng §5.3 (Action × State × thời gian) → `allowed_actions` trong `OrderDetail` để FE hiển thị nút.

---

## 7. KIỂM THỬ HỢP ĐỒNG (CONTRACT & SECURITY TESTS — ĐẦU VÀO PASS 5)
| Mã | Kịch bản | Endpoint | Kỳ vọng |
| :---: | :--- | :--- | :--- |
| CT-01 | Mọi phản hồi có đủ `success`, `message`, `request_id`, `data`, `errors` | Tất cả | Đúng envelope §2.1 |
| CT-02 | Khách A xem đơn của khách B | CU-06 | 404 `NOT_FOUND` |
| CT-03 | Farmer A duyệt đơn của Farmer B | FA-23 | 404 `NOT_FOUND` |
| CT-04 | Customer gọi API Admin | AD-02 | 403 `PERMISSION_DENIED` + 1 dòng `audit_logs` |
| CT-05 | Hai tab cùng hủy / sửa một đơn | CU-08 ×2 | Lần 2: 409 `RESOURCE_MODIFIED` |
| CT-06 | Thiếu `If-Match` | FA-23 | 428 `PRECONDITION_REQUIRED` |
| CT-07 | Hai khách đặt cùng lúc món còn 1 | CU-04 ×2 song song | Một 201, một 400 `INSUFFICIENT_STOCK`; tồn kho = 0, không âm |
| CT-08 | Bấm đặt hàng 2 lần cùng `Idempotency-Key` | CU-04 ×2 | Cùng 1 bộ đơn; lần 2 có `Idempotent-Replayed: true` |
| CT-09 | Đặt đơn thứ 2 cho cùng Farmer khi đơn 1 còn mở | CU-04 | 422 `OPEN_ORDER_LIMIT_EXCEEDED` |
| CT-10 | Hủy sau cutoff | CU-08 | 422 `CUTOFF_PASSED` |
| CT-11 | Sẵn sàng trước cutoff | FA-25 | 422 `CUTOFF_NOT_REACHED` |
| CT-12 | Hoàn tất đơn `PLACED` (nhảy cóc) | FA-26 | 400 `INVALID_STATUS_TRANSITION` |
| CT-13 | Đình chỉ Farmer có đơn `READY_FOR_PICKUP` | AD-07 | Đơn → `DECLINED` (T12), kho cộng trả, khách nhận email |
| CT-14 | 6 lần đăng nhập sai | AU-03 | Lần 6: 429 `THROTTLED` |
| CT-15 | Dùng lại refresh token cũ sau rotation | AU-04 | 401 `TOKEN_INVALID` |
| CT-16 | Dán lại URL WebSocket đã dùng | WS | Đóng mã `4401` |
| CT-17 | Review khi đơn chưa hoàn tất | CU-10 | 422 `REVIEW_NOT_ALLOWED` |
| CT-18 | Upload `.exe` đổi đuôi `.jpg` | FA-12 | 400 `VALIDATION_ERROR` |
| CT-19 | Xuất Excel | AD-26 | File `.xlsx` + 1 dòng `audit_logs` `EXPORT_DATA` |

---

## 8. NHẬT KÝ THAY ĐỔI HỢP ĐỒNG (CHANGE LOG)
| Phiên bản | Ngày | Thay đổi | Người duyệt |
| :---: | :--- | :--- | :--- |
| v1.0 | — | Bản đóng băng đầu tiên | Lead Architect |

---

## 9. ĐIỂM CẦN LEAD ARCHITECT XÁC NHẬN TRƯỚC KHI ĐÓNG BĂNG
| ID | Điểm | Đề xuất |
| :---: | :--- | :--- |
| API-01 | Body checkout bọc trong `groups` và thêm `pickup_date` (khác ví dụ D-004) | Áp dụng — slot lặp hàng tuần nên bắt buộc có ngày |
| API-02 | Access token 15 phút, refresh 7 ngày | Áp dụng |
| API-03 | Thời điểm trả theo ISO 8601 offset `+07:00` (mặc định DRF với `TIME_ZONE` VN) thay vì `Z` | Áp dụng |
| API-04 | Sửa đơn gửi **danh sách món đầy đủ** thay vì chênh lệch | Áp dụng — đơn giản, idempotent theo nội dung |
| API-05 | Tách mã 422 cụ thể (`CUTOFF_PASSED`, `CUTOFF_NOT_REACHED`, …) thay vì chỉ `FAILED_PRECONDITION` | Áp dụng — FE hiển thị đúng ngữ cảnh; `FAILED_PRECONDITION` giữ làm mã dự phòng |
| API-06 | `OrderDetail.allowed_actions` do backend tính | Áp dụng — FE không tự suy luật FSM |
| API-07 | Django Admin chuyển sang `/django-admin/` | Áp dụng |

~~~ Hết Pass 4 ~~~

# ⚙️ MARKETLINK — 4 LƯU Ý KỸ THUẬT BẮT BUỘC KHI THI CÔNG
> **Phạm vi**: Backend Django + Frontend React của MarketLink.
> **Căn cứ**: Pass 4A (CSDL, §5 kiểm soát đồng thời) · Pass 4B (Hợp đồng API §1.2, §5, CT-16) · D-006, D-010.
> **Mục đích**: Bảo đảm code chạy đúng bản vẽ an ninh; mỗi lưu ý kèm lỗi thường gặp và cách kiểm chứng.

---

## 1. Transaction & ghi nhật ký an ninh (`audit_logs`)

### Quy tắc
```python
# config/settings.py
DATABASES = {
    "default": {
        # ...
        "ATOMIC_REQUESTS": False,
    }
}
```

### Vì sao
Khi `ATOMIC_REQUESTS = True`, exception handler mặc định của DRF gọi `set_rollback()`. Mọi phản hồi lỗi 4xx đều rollback cả request, kéo theo dòng `audit_logs` vừa ghi → mất dấu vết truy cập trái phép.

### Chưa đủ nếu chỉ tắt `ATOMIC_REQUESTS`
Nếu `log_security_event()` được gọi **bên trong** một khối `with transaction.atomic():` và khối đó ném lỗi, dòng log vẫn bị rollback.

| Tình huống | Cách ghi đúng |
| :--- | :--- |
| Sự kiện thất bại (403, đăng nhập sai, truy cập sai role) | Ghi **sau** khi khối atomic kết thúc: trong `except` ở tầng view hoặc trong exception handler tùy biến |
| Sự kiện thành công (đình chỉ Farmer, khóa khách, xuất Excel) | Ghi sau khi khối atomic commit, hoặc qua `transaction.on_commit()` |
| Mọi trường hợp | **Không** ghi audit của một thao tác thất bại bên trong khối atomic sắp rollback |

```python
# Ví dụ tầng view
def post(self, request, pk):
    try:
        result = suspend_farmer(actor=request.user, farmer_id=pk, reason=...)  # service có transaction.atomic()
    except DomainError as exc:
        log_security_event(request, action="FARMER_SUSPENDED", status_code=exc.status_code,
                           details={"farmer_id": pk, "error": exc.code})   # ngoài atomic → không bị rollback
        raise
    log_security_event(request, action="FARMER_SUSPENDED", status_code=200,
                       details={"farmer_id": pk, "affected_orders": result.affected_orders})
    return api_response(...)
```

### Kiểm chứng
- Customer gọi `GET /api/admin/farmers/` → 403 **và** bảng `audit_logs` có 1 dòng `ACCESS_DENIED` (CT-04).

---

## 2. Vé WebSocket dùng một lần (`ws_ticket`)

### Quy tắc
- Tra và xóa vé bằng **một lệnh nguyên tử**: `GETDEL` (Redis ≥ 6.2, Upstash có hỗ trợ) hoặc Lua script / pipeline `MULTI`.
- **Không** dùng `get()` rồi `delete()` bằng hai lệnh riêng: hai kết nối đến gần như cùng lúc có thể cùng `GET` thành công trước khi một bên kịp `DELETE`.

### Hai bẫy khi thi công
| Bẫy | Hậu quả | Cách xử lý |
| :--- | :--- | :--- |
| API cache của `django-redis` không có `getdel` | Không gọi được lệnh nguyên tử | Dùng client gốc; trong consumer async dùng `redis.asyncio` để không chặn event loop |
| Gọi `close(code=4401)` **trước** `accept()` | Channels từ chối handshake bằng HTTP 403, trình duyệt chỉ thấy mã `1006` → CT-16 không qua | Vé sai: `accept()` rồi `close(code=4401)`; vé đã bị xóa ở bước `getdel` nên không mở lỗ hổng |

### Code mẫu
```python
# notifications/consumers.py
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
            await self.accept()
            await self.close(code=4401)          # vé sai / hết hạn / đã dùng
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

### Kiểm chứng
- Dán lại URL WebSocket đã kết nối thành công vào tab khác → đóng mã `4401` (CT-16).
- Frontend khi kết nối lại **luôn xin vé mới** qua `POST /api/auth/ws-ticket/`.

---

## 3. Thứ tự khóa dòng & chống deadlock

### Quy tắc trong cùng một bảng
```python
with transaction.atomic():
    products = list(                                   # thực thi ngay để khóa được áp dụng
        Product.objects.filter(id__in=sorted(set(product_ids)))
        .order_by("id")
        .select_for_update(of=("self",))
    )
```

| Chi tiết | Lý do |
| :--- | :--- |
| `order_by("id")` | Mọi giao dịch khóa các dòng theo cùng một thứ tự |
| `of=("self",)` | Nếu có `select_related`, MySQL sẽ khóa luôn các dòng của bảng được join |
| `list(...)` trong khối atomic | Queryset lazy chưa chạy thì chưa khóa gì |

### Quy tắc giữa các bảng (Pass 4A §5.2)
Thứ tự khóa bắt buộc cho mọi service:

```text
customer_profiles / farmer_profiles / users  →  orders (order_by id)  →  products (order_by id)
```

Không service nào được khóa `products` trước `orders`.

### Không có cam kết "0% deadlock"
Khóa theo thứ tự nhất quán giảm mạnh nhưng không loại bỏ hoàn toàn deadlock trên InnoDB (gap lock, khóa do kiểm tra khóa ngoại khi insert…). Vẫn giữ cơ chế đã chốt:

```python
from django.db import OperationalError

MYSQL_DEADLOCK = 1213

def run_with_deadlock_retry(fn, *args, **kwargs):
    for attempt in range(2):
        try:
            return fn(*args, **kwargs)                 # fn tự mở transaction.atomic()
        except OperationalError as exc:
            if exc.args and exc.args[0] == MYSQL_DEADLOCK and attempt == 0:
                continue
            if exc.args and exc.args[0] == MYSQL_DEADLOCK:
                raise ConflictRetryError()             # → 409 CONFLICT_RETRY
            raise
```

### Kiểm chứng
- Hai khách đặt cùng lúc món còn 1 → một 201, một 400 `INSUFFICIENT_STOCK`, tồn kho không âm (CT-07).

---

## 4. CORS cho header tùy biến

### Cấu hình
```python
# config/settings.py
import os
from corsheaders.defaults import default_headers

CORS_ALLOWED_ORIGINS = [o for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o]

CORS_ALLOW_HEADERS = list(default_headers) + [
    "if-match",
    "idempotency-key",
    "x-request-id",
]

CORS_EXPOSE_HEADERS = [
    "x-request-id",          # hiển thị "Mã sự cố" khi lỗi
    "content-disposition",   # lấy tên file Excel khi xuất báo cáo
    "idempotent-replayed",   # biết checkout đã được xử lý từ lần gửi trước
]
```

### Vì sao
- Thiếu `CORS_ALLOW_HEADERS` → trình duyệt chặn preflight `OPTIONS` khi React gửi `If-Match` hoặc `Idempotency-Key`.
- Thiếu `CORS_EXPOSE_HEADERS` → Axios không đọc được các header phản hồi trên dù server có trả.

### Định dạng `If-Match`
- Frontend gửi giá trị trong dấu nháy kép: `If-Match: "3"` (Hợp đồng API §1.2).
- Backend chấp nhận cả khi thiếu dấu nháy (`3`) để tránh lỗi vặt; thiếu header hoàn toàn → 428 `PRECONDITION_REQUIRED` (CT-06).

```python
def parse_if_match(request) -> int:
    raw = request.headers.get("If-Match")
    if raw is None:
        raise PreconditionRequiredError()              # 428
    try:
        return int(raw.strip().strip('"').removeprefix('W/').strip('"'))
    except ValueError:
        raise ValidationError({"if_match": ["Giá trị If-Match không hợp lệ"]})
```

### Kiểm chứng
- DevTools → Network: request `OPTIONS` trước `POST /api/customer/orders/` trả 200 và có `access-control-allow-headers` chứa `idempotency-key`.

---

## Bảng tổng hợp
| # | Lưu ý | Sai lầm thường gặp | Test chứng minh |
| :---: | :--- | :--- | :--- |
| 1 | `ATOMIC_REQUESTS = False` + ghi audit ngoài khối atomic | Ghi audit bên trong service sắp rollback | CT-04 |
| 2 | `GETDEL` nguyên tử; `accept()` rồi `close(4401)` | `get()` + `delete()` riêng; `close()` trước `accept()` | CT-16 |
| 3 | Khóa theo `id`, `of=("self",)`, thứ tự bảng cố định, retry 1213 | Tin rằng sắp xếp ID là hết deadlock | CT-07 |
| 4 | Allow + Expose đủ header | Quên `CORS_EXPOSE_HEADERS` | Preflight trong DevTools, CT-06 |

