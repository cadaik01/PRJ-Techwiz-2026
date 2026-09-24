# MarketLink — Phân công công việc theo 3 nhánh

> Căn cứ: tài liệu thiết kế v1.1 (D-001 → D-026, 24 bảng, API gồm FA-31 → FA-33, AD-31 → AD-33) và bảng khối lượng theo role.
> Đơn vị: **giờ công ước lượng** (dev có AI hỗ trợ), dùng để cân tải giữa các nhánh.
> Guest (trang công khai) thuộc nhánh **Admin**. Các phần **Nền tảng dùng chung** được chia hết cho 3 nhánh, không có phần nào "để chung".

---

## 0. Nguyên tắc chia

1. **Mỗi nhánh làm trọn chiều dọc (BE + FE)** của role mình, để một người hiểu hết luồng từ API đến màn hình.
2. **Phần dùng chung giao cho nhánh dùng nó nhiều nhất hoặc gần nó nhất về nghiệp vụ**, và nhánh đó chịu trách nhiệm cung cấp đúng hạn cho các nhánh còn lại (mục 5).
3. **Cân tải**: mỗi nhánh khoảng 117–119 giờ.
---

## 1. Tổng quan

| Nhánh | Người phụ trách | Phần role | Phần dùng chung được giao | BE | FE | Tổng |
|---|---|---|---|:---:|:---:|:---:|
| **Customer** | *(Tuan_Tu)* | C1 → C8 | P2 Xác thực · P3 Khung frontend · P4-FE Thông báo · P5 Chatbot AI (Bonus) | 54 | 63 | **117** |
| **Farmer** | **Longnguyen** | F1 → F9 | P1 Khung backend · P4-BE Thông báo · P6 Dữ liệu và migration | 74 | 45 | **119** |
| **Admin (gộp Guest)** | *(Minh_Anh)* | G1 → G4, A1 → A9 | P7 Deploy | 57 | 60 | **117** |
| **Tổng** | | | | **185** | **168** | **353** |


---

## 2. Nhánh CUSTOMER

### 2.1 Tính năng của role

| # | Module | Backend | Frontend | Độ khó | BE | FE |
|---|---|---|---|---|:---:|:---:|
| C1 | Giỏ hàng nhiều Farmer | PU-08 pickup-options (loại ngày chợ đóng cửa / Farmer nghỉ, không trả khung đã qua `cutoff_at`) | C-01 (Zustand persist, nhóm theo Farmer) | TB | 3 | 6 |
| C2 | **Checkout tạo N đơn** | CU-04 (idempotency, khóa kho, **giới hạn 10 đơn chưa duyệt — D-005 v1.5**, quét lười, snapshot giá, snapshot `stall_label`, notify) | C-02, C-03 | **Rất cao** | 12 | 6 |
| C3 | Đơn của tôi, chi tiết, hủy | CU-05, 06, 08 (OCC) | C-04, C-05 (SĐT Farmer + nút Gọi, D-026) | TB | 4 | 6 |
| C4 | **Sửa đơn** | CU-07 (OCC, chênh lệch kho, T7, kiểm tra lại ngày nhận) | C-06 | **Cao** | 8 | 5 |
| C5 | Đặt lại đơn cũ | CU-09 | Nút ở C-04, C-05 | Thấp | 2 | 2 |
| C6 | Đánh giá sau khi hoàn tất | CU-10, 11 | C-07 | TB | 4 | 3 |
| C7 | Yêu thích 3 loại + danh sách người nhận restock | CU-12 → 17; selector `get_restock_subscribers()` | C-08 | TB | 4 | 4 |
| C8 | Dashboard + hồ sơ | CU-01, 02, 03 | C-00, C-10 | Thấp | 3 | 4 |
| | **Cộng phần role** | | | | **40** | **36** |

### 2.2 Phần dùng chung được giao

| # | Module | Nội dung | BE | FE |
|---|---|---|:---:|:---:|
| P2 | Xác thực | CustomUser manager, roles seed dùng chung với P6; AU-01 (đăng ký Customer; **chuẩn hóa + kiểm tra trùng số điện thoại — D-028**), AU-03 → 07 (đăng nhập, refresh, logout, me, đổi mật khẩu); **AU-09 đăng nhập Admin (cổng riêng, D-027)**; `ACCOUNT_LOCKED` kèm lý do khi đúng mật khẩu (D-024); blacklist Redis; throttle; permission class theo role. Màn hình G-09, G-10, **A-00 `/admin/login`** (`AdminAuthLayout`), trang đổi mật khẩu cho 3 role | 8 | 6 |
| P3 | Khung frontend | Router, 3 layout, ProtectedRoute, axios interceptor (refresh token, If-Match, Idempotency-Key), react-query, map mã lỗi → UI (§1.7 Pass 3), component chung: DataTable, StatusBadge, ConfirmDialog, EmptyState, **MapView / MapPicker gốc** (Leaflet: import CSS, sửa icon marker) | — | 12 |
| P4-FE | Thông báo (phía giao diện) | Chuông thông báo + đếm chưa đọc, client WebSocket (`react-use-websocket`, gọi lại `unread-count` khi kết nối lại), trang N-01, C-09, F-10, banner thông báo toàn sàn N-04 | — | 6 |
| P5 | Chatbot AI (Bonus) | CH-01, 4 công cụ chỉ đọc (dùng selector public của nhánh Admin), Gemini, công tắc `AI_CHAT_ENABLED`; widget N-03 | 6 | 3 |
| | **Cộng phần dùng chung** | | **14** | **27** |


---

## 3. Nhánh FARMER — Longnguyen (kiêm Lead backend)

### 3.1 Tính năng của role

| # | Module | Backend | Frontend | Độ khó | BE | FE |
|---|---|---|---|---|:---:|:---:|
| F1 | Đăng ký Farmer + banner trạng thái duyệt | AU-02 | G-11, banner PENDING / SUSPENDED | Thấp | 3 | 3 |
| F2 | Hồ sơ sạp + ghim vị trí | FA-02, 03 (upload ảnh, cutoff 1–72) | F-08 (dùng MapPicker của P3) | TB | 3 | 5 |
| F3 | Chợ tham gia + khung pickup + cutoff + **lịch nghỉ bán** | FA-04 → 10; **FA-31 → 33** (D-023); `stall_label` bắt buộc (D-026); service `validate_pickup_date()` (5 điều kiện ngày nhận hợp lệ) | F-07 (khối Lịch nghỉ bán, nhãn "Đã tắt do chợ đổi lịch") | TB–Cao | 8 | 8 |
| F4 | Sản phẩm: CRUD, ảnh, hết hàng, lưu trữ | FA-11 → 16 (bảo mật upload, xóa mềm); FA-14 gọi restock (D-025) | F-04, F-05 | TB | 7 | 7 |
| F5 | **Mẫu tồn kho tuần** | FA-17, 18 (công thức giữ hàng, khóa dòng, quét lười, gọi restock) | F-06 (hộp thoại xem trước) | **Cao** | 6 | 5 |
| F6 | Danh sách đơn, đếm theo tab, danh sách soạn hàng, **nhóm đơn cùng khách + ngày nhận (D-005 v1.5)** | FA-19 → 22 (quét lười) | F-02, F-03 | TB | 6 | 6 |
| F7 | **5 hành động FSM + lõi FSM + dịch vụ kho** | FA-23 → 27; ma trận `TRANSITIONS`, Triple-Gate, OCC, ghi `order_status_history`; `lock_products()`, `apply_stock_delta()`, `expire_overdue_orders()` | Nút theo trạng thái trên F-02, F-03 | **Rất cao** | 10 | 4 |
| F8 | Dashboard thống kê | FA-01 (tổng đơn, đơn chờ, doanh thu, bán chạy) | F-01 | TB | 5 | 4 |
| F9 | Xem và trả lời đánh giá | FA-28 → 30 | F-09 | Thấp | 3 | 3 |
| | **Cộng phần role** | | | | **51** | **45** |

### 3.2 Phần dùng chung được giao

| # | Module | Nội dung | BE | FE |
|---|---|---|:---:|:---:|
| P1 | Khung backend | `marketlink_core/`: `BaseModel`, `CreatedAtModel`, `HistoryRequestMeta`, `UUIDUploadTo`, `api_response`, exception handler + Error Catalog, phân trang, middleware `request_id`, `BasePolicy`, `log_security_event()`; settings (MySQL, CORS headers, TIME_ZONE, throttle rates, Redis cache) | 8 | — |
| P4-BE | Thông báo (phía máy chủ) | Model `notifications`, `announcements`; hàm `notify()` (ghi DB + WebSocket + email qua `on_commit`); Channels + daphne, vé WebSocket AU-08, consumer; email Gmail SMTP qua thread pool + template; NO-01 → 04 | 10 | — |
| P6 | Dữ liệu | 24 model, **chạy migration (chỉ Lead)**, data migration 3 role, seed demo (chợ, Farmer, sản phẩm, đơn, review, 3 kỳ nghỉ), xuất `.sql`, SY-01 health; **UNIQUE `phone` + hàm chuẩn hóa số điện thoại + migration (D-028)** | 5 | — |
| | **Cộng phần dùng chung** | | **23** | — |

**Tổng nhánh Farmer: BE 74 + FE 45 = 119 giờ.** Nhánh nặng backend nhất; các nhánh khác phụ thuộc vào P1, P6 ngay ngày 1.

---

## 4. Nhánh ADMIN (gộp Guest)

### 4.1 Trang công khai (Guest)

| # | Module | Backend | Frontend | Độ khó | BE | FE |
|---|---|---|---|---|:---:|:---:|
| G1 | Duyệt chợ + bản đồ + chợ gần tôi | PU-03, 04, 05 (Haversine, `upcoming_closures`) | G-02, G-03 (Leaflet, marker, chỉ đường, badge Đóng cửa) | TB | 4 | 9 |
| G2 | Danh mục và chi tiết sản phẩm, bộ lọc | PU-02, 10, 11, 12 (django-filter, **selector hiển thị công khai dùng chung**) | G-04, G-05 | TB | 5 | 7 |
| G3 | Hồ sơ Farmer công khai + danh bạ | PU-06, 07, 09 (`upcoming_closures`) | G-06 (badge Nghỉ bán, giờ chốt cụ thể), G-13 | Thấp | 3 | 6 |
| G4 | Trang chủ, About, Contact, 403/404 | PU-01, PU-13 (đọc announcements) | G-01, 07, 08, 12 | Thấp | 1 | 4 |
| | **Cộng Guest** | | | | **13** | **26** |

### 4.2 Quản trị

| # | Module | Backend | Frontend | Độ khó | BE | FE |
|---|---|---|---|---|:---:|:---:|
| A1 | Dashboard | AD-01 | A-01 | Thấp | 2 | 3 |
| A2 | **Quản lý Farmer** | AD-02 → 08 (xem trước ảnh hưởng, đình chỉ → T12 qua lõi FSM, hoàn kho, thông báo) | A-02, A-03 | **Cao** | 8 | 5 |
| A3 | Quản lý khách hàng | AD-09 → 13 (khóa → T13; lưu / xóa `deactivation_reason`, D-024); **cờ `at_risk` + bộ lọc (D-028)** | A-04 (cột Lý do khóa, badge At risk) | TB | 6 | 3 |
| A4 | **Chợ: CRUD, ngày mở cửa, giờ mở cửa, tọa độ, lịch đóng cửa** | AD-14 → 17 (AD-16 tự tắt khung + `MARKET_SCHEDULE_CHANGED`; AD-17 chặn khi còn đơn mở — D-022); **AD-31 → 33** (D-023) | A-05, A-06 (dùng MapPicker; khối Lịch đóng cửa tạm thời) | **Cao** | 8 | 7 |
| A5 | Danh mục sản phẩm | AD-18, 19 | A-07 | Thấp | 2 | 2 |
| A6 | Kiểm duyệt sản phẩm và review | AD-20 → 24 | A-08 | Thấp–TB | 3 | 4 |
| A7 | Báo cáo + xuất Excel | AD-25, 26 (openpyxl, ghi `EXPORT_DATA`) | A-09 | TB | 5 | 4 |
| A8 | Thông báo toàn sàn | AD-27, 28 | A-10 | Thấp | 2 | 3 |
| A9 | Nhật ký hệ thống | AD-29, 30 | A-11 | Thấp | 2 | 3 |
| | **Cộng Quản trị** | | | | **38** | **34** |

### 4.3 Phần dùng chung được giao

| # | Module | Nội dung | BE | FE |
|---|---|---|:---:|:---:|
| P7 | Deploy | Render (daphne: HTTP + WebSocket), Upstash Redis, MySQL cloud, biến môi trường, HTTPS; **dựng bản deploy thử từ ngày 2** | 6 | — |

**Tổng nhánh Admin: BE 57 + FE 60 = 117 giờ.**

---

## 5. Hợp đồng giữa các nhánh (ai cung cấp gì cho ai, hạn chót)

Đây là các điểm nối. Nhánh cung cấp phải xong **đúng hạn và đúng chữ ký hàm**; nhánh sử dụng không tự viết lại.

| Hạng mục | Nhánh cung cấp | Nhánh sử dụng | Hạn |
|---|---|---|---|
| `marketlink_core/` (envelope, exception, phân trang, policy, middleware, audit) | Farmer | Tất cả | **Cuối ngày 1** |
| 24 model + migration + seed tối thiểu (3 role, 1 Admin, 2 chợ, 2 Farmer, vài sản phẩm) | Farmer | Tất cả | **Cuối ngày 1** |
| Đăng nhập (2 cổng: `/login` Customer + Farmer, `/admin/login` Admin — D-027), refresh, `me`, permission class theo role | Customer | Tất cả | **Cuối ngày 1** |
| Khung FE: router, 3 layout, ProtectedRoute, interceptor, map lỗi, DataTable, StatusBadge, ConfirmDialog | Customer | Tất cả | **Cuối ngày 1** |
| MapView / MapPicker gốc | Customer | Admin (G1, A-06), Farmer (F-08) | Sáng ngày 2 |
| `notify(*, recipient, event_type, context)` | Farmer | Tất cả | Giữa ngày 2 |
| Lõi FSM `transition_order(...)` + ma trận `TRANSITIONS` | Farmer | Customer (hủy, sửa), Admin (T12, T13) | Giữa ngày 2 |
| Dịch vụ kho `lock_products()`, `apply_stock_delta()` | Farmer | Customer (checkout, sửa), Admin (hoàn kho khi đình chỉ / khóa) | Giữa ngày 2 |
| `expire_overdue_orders(*, farmer_id)` | Farmer | Customer (checkout) | Giữa ngày 2 |
| `validate_pickup_date()` (ngày chợ mở, chợ không đóng cửa, Farmer không nghỉ, khung đang bật, trong horizon và trước cutoff) | Farmer | Customer (PU-08, CU-04, CU-07) | Cuối ngày 2 |
| Selector hiển thị công khai (Farmer đã duyệt, sản phẩm không ẩn / không lưu trữ, chợ đang hoạt động) | Admin | Customer (chatbot, danh sách yêu thích) | Cuối ngày 2 |
| Môi trường deploy thử | Admin | Tất cả | Cuối ngày 2 |
| `get_restock_subscribers(product_id)` | Customer | Farmer (FA-14, FA-18) | Ngày 3 |


---

## 6. Quy tắc tránh xung đột code

| Quy tắc | Chi tiết |
|---|---|
| Sở hữu view theo role | Mỗi nhánh chỉ sửa `[app]/[role]/views_[role].py`, serializer và URL của role mình. Guest thuộc nhánh Admin (`views_public.py`) |
| Sở hữu service theo miền | Service dùng chung (FSM, kho, `notify`, `validate_pickup_date`) chỉ nhánh cung cấp được sửa. Nhánh khác cần thay đổi thì nhắn yêu cầu |
| Model và migration | **Chỉ nhánh Farmer (Lead) sửa `models.py` và chạy `makemigrations`**. Nhánh khác cần thêm cột thì gửi yêu cầu kèm lý do |
| Frontend | Mỗi nhánh sở hữu `pages/[role]/` của mình; `components/common/` và `lib/` thuộc nhánh Customer (P3) |
| Merge | Merge vào nhánh chính ít nhất 1 lần mỗi ngày; nhánh Farmer merge `marketlink_core` và model trước để các nhánh khác kéo về |

---

## 7. Lịch theo ngày

| Ngày | Customer | Farmer (Longnguyen) | Admin |
|---|---|---|---|
| **1** | P2 đăng nhập / đăng ký, P3 khung FE | **P1 `marketlink_core/`, P6 model + migration + seed tối thiểu** | P7 chuẩn bị tài khoản deploy; G2 selector công khai + API sản phẩm |
| **2** | MapView gốc; C1 giỏ hàng, bắt đầu C2 | **F7 lõi FSM + kho, P4-BE `notify()`**, F3 + `validate_pickup_date()` | Deploy thử; G1, G3, G4 |
| **3** | C2 checkout (xong), C3, C4 | F4, F5, F6 | A2, A3, A4 |
| **4** | C5 → C8, P4-FE thông báo; P5 chatbot (nếu kịp) | F1, F2, F8, F9, P4 WebSocket + email | A1, A5 → A9 |
| **5** | Sửa lỗi sau khi ghép · test luồng đầu cuối · seed demo đầy đủ · quay video · viết báo cáo · xuất `.sql` · ReadMe.doc | ← cả nhóm | ← cả nhóm |

**Ba luồng test đầu cuối bắt buộc ngày 5** (mỗi nhánh chủ trì một luồng):
1. **Customer chủ trì**: khách đặt hàng ở 2 Farmer → Farmer duyệt → sẵn sàng → hoàn tất → khách đánh giá.
2. **Farmer chủ trì**: Farmer báo nghỉ tuần → khách không chọn được ngày đó; áp dụng mẫu tuần → khách yêu thích nhận thông báo có hàng lại.
3. **Admin chủ trì**: Admin đình chỉ Farmer → đơn mở tự từ chối, hoàn kho, khách nhận thông báo; Admin đổi lịch chợ → khung của Farmer tự tắt.
