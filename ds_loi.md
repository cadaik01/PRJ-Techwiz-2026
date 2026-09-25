# DANH SÁCH LỖI VÀ ĐIỂM CẦN ĐIỀU CHỈNH HỆ THỐNG MARKETLINK (BACKEND)
> Ngày cập nhật: 25/09/2026  
> Căn cứ: Tài liệu thiết kế `MarketLink_requirement_analysis_ok (5).md`, `MarketLink_Implementation_Notes.md` & `MarketLink_phan_cong(new).md`  
> Nhánh phụ trách: Farmer (Longnguyen - kiêm Lead Backend)

---

## 📌 BẢNG THEO DÕI TIẾN ĐỘ SỬA LỖI & TRIỂN KHAI

- [x] **Mục 1: [FSM & Kho] Đổi mô hình trừ kho: Khách đặt (PLACED) KHÔNG trừ kho, chỉ trừ khi Farmer duyệt (ACCEPTED)**
  - `T2`: Khóa `Product` và trừ kho vật lý (`apply_stock_delta`)
  - `T3, T5, T8`: Đặt `restores_stock = False` (không hoàn kho vì lúc đặt chưa trừ)
  - `T4, T6, T12, T13`: Giữ `restores_stock = True` (hoàn kho)
- [x] **Mục 2: [Cờ At Risk D-028] Đã cập nhật tài liệu (5).md chỉ đếm đơn NO_SHOW (áp dụng khi viết AD-09)**
- [x] **Mục 3: [Hạn mức đơn mở D-005 v1.5] Đã cập nhật tài liệu (5).md và settings.py (MAX_PLACED_ORDERS_PER_CUSTOMER = 10)**
- [x] **Mục 4: [Bảo mật & Email FSM] Sửa lỗi Admin Reason trong fsm.py dòng 195-199 (dùng hằng số ChangeReason, tránh lộ ghi chú nội bộ)**
- [ ] **Mục 5: [Màn hình & Sắp xếp] Sắp xếp đơn theo tab cho FA-19 (F-02: Placed `created_at ASC`; Accepted/Ready `pickup_start_at ASC`; History `-created_at`)**
- [ ] **Mục 6: [Phòng bị hết hàng FA-16] Thêm checkbox đánh dấu hết hàng trong action từ chối đơn FA-24**
- [x] **Mục 7: [Sửa đơn CU-07] Khắc phục toàn bộ 7 lỗi trong backend/orders/services/modify.py**
  - [x] 7.1: Sửa `prod.is_active` -> `prod.is_available and not prod.is_archived` (tránh lỗi 500)
  - [x] 7.2: Đổi mã lỗi `SLOT_NOT_AVAILABLE` và `PRODUCT_NOT_AVAILABLE` sang HTTP 422 (`UnprocessableEntityError`)
  - [x] 7.3: Bảo toàn giá snapshot cho món cũ (không ghi đè `old_item.unit_price`)
  - [x] 7.4: Xóa quyền `is_staff` sửa đơn qua API khách hàng (chỉ chính chủ khách hàng được sửa)
  - [x] 7.5: Đổi `actor_role` của Transition T7 sang `ActorRole.SYSTEM`
  - [x] 7.6: Thêm kiểm tra `MarketOperatingDay` và `BOOKING_HORIZON_DAYS = 7` ngày
  - [x] 7.7: Phân biệt trừ kho: `ACCEPTED` bù trừ kho vật lý; `PLACED` chỉ kiểm tra kho khả dụng, không đụng kho vật lý
- [x] **Mục 8: [Tài liệu dự án] Đã đồng bộ tài liệu MarketLink_requirement_analysis_ok (5).md**
- [x] **Mục 9: [Tồn kho khả dụng SRS §1.1, §1.4, §1.6] Tách bạch Tồn kho thực tế (stock_quantity) và Tồn kho khả dụng (available_stock)**
- [x] **Mục 10: [Hợp đồng dùng chung F3 / C1 / C2] Xây dựng service `validate_pickup_date()` tại `markets/services/validation.py`**
- [ ] **Mục 11: [WebSocket P4-BE] Hoàn thiện ws_ticket.py, notifications/consumers.py, routing.py và asgi.py**
- [ ] **Mục 12: [API Role Farmer] Xây dựng bộ 33 endpoints FA-01 -> FA-33 cho Farmer**

---

## 📝 CHI TIẾT TỪNG MỤC LỖI & PHƯƠNG ÁN XỬ LÝ

---

### MỤC 1: [FSM & Kho] Khách đặt (PLACED) KHÔNG trừ kho, chỉ trừ khi Farmer duyệt (ACCEPTED)

* **Hiện trạng lỗi trong code:**
  - Trong `backend/orders/services/fsm.py` (dòng 44–58):
    + `T3`, `T5`, `T8` đang cấu hình `restores_stock = True`.
    + `T2` (`PLACED -> ACCEPTED`) không có bước trừ kho (`restores_stock = False`, không gọi `apply_stock_delta`).
  - Trong `backend/orders/tests_fsm.py` (dòng 99–102): Hàm `_create_order` đang tự gọi trừ kho ngay khi đặt đơn.
* **Quy chuẩn tài liệu thiết kế (5):**
  - Khách đặt (`PLACED` - T1): Chỉ kiểm tra tồn kho khả dụng (`available_stock`), không trừ kho vật lý `Product.stock_quantity`.
  - Farmer duyệt (`ACCEPTED` - T2): Khóa các `Product` liên quan bằng `lock_products()`, kiểm tra kho lần cuối và gọi `apply_stock_delta(deltas={pid: -qty})` để trừ kho chính thức. Nếu thiếu hàng thì báo lỗi `INSUFFICIENT_STOCK`.
  - Từ chối (`T3`), Hủy (`T5`), hoặc Quét hết hạn (`T8`) từ `PLACED`: Thiết lập `restores_stock = False` (vì lúc đặt chưa trừ kho, nên khi hủy/hết hạn không được cộng hoàn trả).
  - Từ chối (`T4`) hoặc Hủy (`T6`) từ `ACCEPTED`, hoặc Admin can thiệp (`T12`, `T13`): Thiết lập `restores_stock = True` (vì lúc duyệt đã trừ kho nên lúc này phải hoàn kho lại).
* **Files cần sửa:**
  - `backend/orders/services/fsm.py`
  - `backend/orders/tests_fsm.py`

---

### MỤC 2: [Cờ At Risk D-028] Bỏ EXPIRED khỏi cờ At risk của Khách hàng, chỉ đếm NO_SHOW

* **Hiện trạng:**
  - Đã cập nhật xong trong tài liệu `MarketLink_requirement_analysis_ok (5).md` (Mục D-028 dòng 40 & A-04 dòng 1304).
  - `settings.py` đã có cấu hình `AT_RISK_THRESHOLD = 3`, `AT_RISK_WINDOW_DAYS = 30`.
* **Kế hoạch áp dụng vào code:**
  - Khi lập trình selector/view `AD-09` (danh sách khách hàng Admin), query tính cờ `at_risk` bằng cách lọc:
    `no_show_count = Order.objects.filter(customer=user, status=OrderStatus.NO_SHOW, created_at__gte=now - timedelta(days=settings.AT_RISK_WINDOW_DAYS)).count() >= settings.AT_RISK_THRESHOLD`
  - Tuyệt đối không đếm đơn `EXPIRED`.

---

### MỤC 3: [Hạn mức đơn mở D-005 v1.5] Cập nhật 10 đơn PLACED toàn sàn, mốc loại trừ `pickup_start_at <= now`

* **Hiện trạng:**
  - Đã cập nhật xong trong tài liệu `(5).md` (A-001b dòng 149, D-005 dòng 227).
  - `backend/marketlink_core/settings.py` đã có: `MAX_PLACED_ORDERS_PER_CUSTOMER = 10`.
* **Kế hoạch áp dụng vào code:**
  - Khi lập trình checkout service `CU-04`, khóa `CustomerProfile` bằng `select_for_update()` và đếm đơn:
    ```python
    active_placed_count = Order.objects.filter(
        customer=customer,
        status=OrderStatus.PLACED,
        pickup_start_at__gt=timezone.now(),
    ).count()
    if active_placed_count >= settings.MAX_PLACED_ORDERS_PER_CUSTOMER:
        raise UnprocessableEntityError(code=ErrorCode.OPEN_ORDER_LIMIT_EXCEEDED)
    ```

---

### MỤC 4: [Bảo mật & Email FSM] Sửa lỗi Admin Reason trong `fsm.py` lộ ghi chú nội bộ ra email khách

* **Hiện trạng lỗi trong code:**
  - Trong `backend/orders/services/fsm.py` (dòng 195–196):
    ```python
    if actor_role == _R.ADMIN:
        if reason:
            return reason  # Gán đè chuỗi tự do của Admin vào change_reason
    ```
  - Khi gửi mail, chuỗi này không map được vào `SYSTEM_REASON_TEXT` nên bị gửi nguyên văn cho Khách/Farmer, làm lộ ghi chú điều tra nội bộ của Admin.
* **Phương án xử lý:**
  - Xóa bỏ dòng `if reason: return reason` trong nhánh `actor_role == _R.ADMIN`.
  - Đảm bảo `change_reason` trong `order_status_history` luôn là hằng số hệ thống:
    - Đình chỉ Farmer (`T3, T4, T12`): `ChangeReason.FARMER_SUSPENDED_BY_ADMIN`
    - Khóa tài khoản Khách (`T5, T6, T13`): `ChangeReason.CUSTOMER_LOCKED_BY_ADMIN`
  - Lý do nội bộ do Admin nhập sẽ chỉ lưu vào `farmer_profiles.status_reason` / `customer_profiles.deactivation_reason` hoặc bảng `audit_logs`.
* **Files cần sửa:**
  - `backend/orders/services/fsm.py`

---

### MỤC 5: [Màn hình & Sắp xếp] Chuẩn hóa FA-19 (F-02) và chốt quy tắc sắp xếp danh sách đơn theo tab

* **Quy chuẩn chốt theo tài liệu (5).md (dòng 1165–1176 & 2538):**
  - Màn hình danh sách đơn của Farmer là **`FA-19` (Giao diện F-02)**.
  - Quy tắc sắp xếp:
    - **Tab "Chờ duyệt" (`PLACED`)**: Sắp xếp `created_at ASC` (đơn đặt trước thì duyệt trước — FIFO).
    - **Tab "Đã xác nhận" & "Sẵn sàng" (`ACCEPTED`, `READY_FOR_PICKUP`)**: Sắp xếp `pickup_start_at ASC` (đơn nào khách đến lấy trước thì chuẩn bị hàng trước).
    - **Tab "Lịch sử" (`COMPLETED`, `CANCELLED`, `DECLINED`, `NO_SHOW`, `EXPIRED`)**: Sắp xếp `-created_at` (đơn mới nhất lên đầu).
* **Files cần sửa / tạo mới:**
  - `backend/orders/farmer/views_farmer.py` (khi viết API `FA-19`).

---

### MỤC 6: [Phòng bị hết hàng FA-16] Thêm cơ chế đánh dấu hết hàng ngay trong popup Từ chối đơn

* **Quy chuẩn tài liệu (5).md (dòng 1181):**
  - Tại popup Từ chối đơn của Farmer (`FA-24` / T3, T4), bổ sung tiện ích cho phép Farmer chọn danh sách sản phẩm thiếu hàng để đồng thời set `stock_quantity = 0`.
* **Phương án xử lý:**
  - API `POST /api/farmer/orders/<id>/decline/` nhận thêm `mark_sold_out_product_ids: list[int] = None`.
  - Trong cùng transaction, ngoài việc chuyển trạng thái đơn hàng sang `DECLINED`, hệ thống cập nhật `stock_quantity = 0` cho các sản phẩm được chỉ định.
* **Files cần sửa / tạo mới:**
  - `backend/orders/farmer/views_farmer.py` / `services`

---

### MỤC 7: [Sửa đơn CU-07] Khắc phục toàn bộ 7 lỗi trong `backend/orders/services/modify.py`

* **Chi tiết 7 lỗi trong `modify.py`:**
  1. `prod.is_active` (dòng 197) $\rightarrow$ Đổi thành `prod.is_available and not prod.is_archived` (tránh lỗi 500 runtime).
  2. Mã HTTP $\rightarrow$ Đổi các exception `SLOT_NOT_AVAILABLE` và `PRODUCT_NOT_AVAILABLE` (dòng 100, 106, 112, 120, 128, 193, 198) từ `BusinessValidationError` sang HTTP 422 (`UnprocessableEntityError`).
  3. Snapshot giá $\rightarrow$ Giữ nguyên đơn giá cũ `old_item.unit_price` cho các món không thay đổi số lượng; chỉ cập nhật giá mới cho món mới thêm.
  4. Phân quyền $\rightarrow$ Bỏ điều kiện `or getattr(actor, "is_staff", False)` (dòng 56). Chỉ khách hàng sở hữu đơn mới được sửa đơn.
  5. Cạnh FSM T7 $\rightarrow$ Sửa `actor_role = ActorRole.SYSTEM` cho Transition T7 theo đúng ma trận FSM (dòng 290).
  6. Kiểm tra ngày họp chợ & khung đặt trước $\rightarrow$ Bổ sung kiểm tra `MarketOperatingDay` và `pickup_date <= (now + timedelta(days=7)).date()`.
  7. Xử lý tồn kho theo trạng thái:
     - Nếu đơn đang `ACCEPTED`: Bù trừ kho vật lý (`apply_stock_delta`).
     - Nếu đơn đang `PLACED`: **Không trừ/cộng kho vật lý**, chỉ đối soát tồn kho khả dụng (`available_stock`).
* **Files cần sửa:**
  - `backend/orders/services/modify.py`
  - `backend/orders/tests_fsm.py`

---

### MỤC 8: [Tài liệu dự án] Cập nhật và đồng bộ toàn bộ tài liệu đặc tả

* **Hiện trạng:** Đã hoàn thành trong `MarketLink_requirement_analysis_ok (5).md` và `MarketLink_phan_cong(new).md`.
* **Lưu ý kỹ thuật:** Bảng ma trận 13 cạnh Pass 2 Mục 3 (dòng 265–280) là nguồn chuẩn duy nhất về FSM và kho. Đoạn văn sót ở Pass 4A §5.3 (dòng 1990) được thay thế hoàn toàn bởi bảng Pass 2.

---

### MỤC 9: [Tồn kho khả dụng SRS §1.1, §1.4, §1.6] Tách bạch Tồn kho thực tế (stock_quantity) và Tồn kho khả dụng (available_stock)

* **Hiện trạng & Rủi ro phát hiện:**
  - Hàm `get_held_quantities` trong `catalog/services/stock.py` đang lọc theo `OPEN_STATUSES = (PLACED, ACCEPTED, READY_FOR_PICKUP)`.
  - Trong mô hình mới, đơn `ACCEPTED` đã trừ trực tiếp vào `Product.stock_quantity`. Nếu tiếp tục trừ cả đơn `ACCEPTED` thì tồn kho khả dụng sẽ bị trừ đúp 2 lần.
* **Phương án xử lý:**
  1. Trong Database: `Product.stock_quantity` là **Tồn kho thực tế/đã phân bổ của Nông dân**. Nó CHỈ thực sự bị trừ cứng khi Farmer bấm duyệt đơn (`ACCEPTED`).
  2. Tồn kho khả dụng (`available_stock`) hiển thị cho khách:
     $$\text{available\_stock} = \max(\text{stock\_quantity} - \text{held\_by\_placed},\; 0)$$
     *(Trong đó `held_by_placed` CHỈ tính tổng số lượng của các đơn có trạng thái `PLACED` và còn hạn `pickup_start_at > now`)*.
* **Files cần sửa:**
  - `backend/catalog/services/stock.py`

---

### MỤC 10: [Hợp đồng dùng chung F3 / C1 / C2] Xây dựng service `validate_pickup_date()`

* **Nhiệm vụ:**
  - Theo bảng phân công `MarketLink_phan_cong(new).md` (Mục 3 và Mục 5), nhánh Farmer chịu trách nhiệm cung cấp hàm dùng chung `validate_pickup_date()` cho cả Customer (`PU-08`, `CU-04`, `CU-07`) và Farmer.
* **Phương án xử lý:**
  - Tạo service tại `backend/markets/services/validation.py` với chữ ký keyword-only:
    ```python
    def validate_pickup_date(
        *,
        farmer_id: int,
        market_id: int,
        pickup_date: date,
        pickup_slot_id: int,
    ) -> PickupSlot:
    ```
  - Kiểm tra đủ 5 điều kiện hợp lệ:
    1. Ngày pickup nằm trong các ngày họp chợ (`MarketOperatingDay`).
    2. Chợ không đóng cửa trong ngày đó (`MarketClosure`).
    3. Farmer không nghỉ bán trong ngày đó (`FarmerClosure`).
    4. Khung pickup tồn tại, thuộc cặp Farmer - Chợ, và `is_active = True`.
    5. Nằm trong giới hạn đặt trước 7 ngày (`BOOKING_HORIZON_DAYS = 7`) và trước giờ chốt (`now < cutoff_at`).
* **Files cần tạo mới:**
  - `backend/markets/services/validation.py`
  - `backend/markets/services/__init__.py`

---

### MỤC 11: [WebSocket P4-BE] Hoàn thiện kết nối Realtime Notifications

* **Nhiệm vụ:**
  - Nhánh Farmer phụ trách P4-BE (Thông báo phía máy chủ, Channels, consumer, vé một lần).
* **Phương án xử lý:**
  1. `backend/marketlink_core/services/ws_ticket.py`: Hàm `create_ws_ticket(*, user_id, role)` lưu Redis key `ws_ticket:<uuid>` với TTL 30s.
  2. `backend/notifications/consumers.py`: `NotificationConsumer` bất đồng bộ tra và xóa vé bằng một lệnh nguyên tử `GETDEL` (qua `redis.asyncio`). Nếu vé sai: `await self.accept()` rồi mới `await self.close(code=4401)` (chống handshake HTTP 403 / mã 1006 theo lưu ý kỹ thuật số 2).
  3. `backend/marketlink_core/routing.py` & `backend/marketlink_core/asgi.py`: Khai báo URL pattern `/ws/notifications/`.
* **Files cần tạo mới / cập nhật:**
  - `backend/marketlink_core/services/ws_ticket.py`
  - `backend/notifications/consumers.py`
  - `backend/marketlink_core/routing.py`
  - `backend/marketlink_core/asgi.py`

---

### MỤC 12: [API Role Farmer] Xây dựng bộ 33 endpoints FA-01 -> FA-33 cho Farmer

* **Nhiệm vụ:**
  - Xây dựng trọn vẹn tầng API cho Farmer theo đúng chuẩn cấu trúc DRF:
    - `backend/orders/farmer/` (`views_farmer.py`, `serializers_farmer.py`, `urls_farmer.py` cho `FA-19 → FA-27`).
    - `backend/catalog/farmer/` (`views_farmer.py`, `serializers_farmer.py`, `urls_farmer.py` cho `FA-11 → FA-18`).
    - `backend/markets/farmer/` (`views_farmer.py`, `serializers_farmer.py`, `urls_farmer.py` cho `FA-04 → FA-10`, `FA-31 → FA-33`).
    - `backend/reviews/farmer/` (`views_farmer.py`, `serializers_farmer.py`, `urls_farmer.py` cho `FA-28 → FA-30`).
    - `backend/accounts/farmer/` (`views_farmer.py`, `serializers_farmer.py`, `urls_farmer.py` cho `FA-01 → FA-03`).
