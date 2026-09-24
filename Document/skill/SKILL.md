---
name: techwiz-django-backend
description: Quy chuẩn kiến trúc, nguyên lý lập trình, hợp đồng dữ liệu, chữ ký giao diện và bảng tra cứu kỹ thuật cho phân hệ Backend Django REST Framework với CSDL MySQL 8.x (InnoDB).
---

# Django REST Framework — Implementation Standard (MySQL Stack)

Tài liệu quy định **Nguyên Lý Kiến Trúc, Quy Tắc Bất Biến (Invariants), Chữ Ký Giao Diện (Interfaces) và Bảng Tra Cứu Kỹ Thuật** cho tầng Backend trên nền tảng **Django 5.x + MySQL 8.x (InnoDB Engine)**. 

> 💡 **Triết lý tài liệu**: Tài liệu này định nghĩa phương pháp luận, công thức xử lý, chữ ký hàm khung và các chốt chặn an toàn; **tuyệt đối không đưa ra các đoạn mã cứng cho một thực thể cụ thể**. Khi thực hiện bất kỳ đề tài nào (Y tế, Thuê xe, Việc làm, Bán hàng...), lập trình viên và AI Assistant phải vận dụng các nguyên lý này trên đúng danh mục thực thể của đề thi.

---

## 1. Tiêu Chuẩn Hệ Thống, Cấu Trúc Tuyến Đường & Hợp Đồng Phản Hồi (API Invariants)

* **Quy tắc cấu trúc URL Endpoint**:
  * **Định tuyến theo Role (BFF Pattern)**: Phân vùng quyền truy cập ngay trên URL: `/api/[role]/[resource]/` (ví dụ: `/api/customer/bookings/`, `/api/staff/tasks/`, `/api/admin/users/`).
  * **Định tuyến công khai (Public Access)**: Phân vùng dành riêng cho khách vãng lai chưa đăng nhập: `/api/public/[resource]/` (ví dụ: `/api/public/markets/`, `/api/public/products/`, `/api/public/categories/`) áp dụng quyền `AllowAny`.
  * **Định tuyến dùng chung / Xác thực**: `/api/auth/` (Login, Token, Refresh, Logout), `/api/notifications/`, `/api/chat/`.
  * **Tên tài nguyên (`resource`)**: Bắt buộc là danh từ số nhiều ở dạng `kebab-case` (ví dụ: `booking-requests`, `service-categories`).
  * **Dấu gạch chéo kết thúc**: 100% URL bắt buộc có dấu `/` ở cuối (`APPEND_SLASH = True`).
  * **Hành động đặc thù (Action)**: Đặt động từ sau ID thực thể: `/api/[role]/[resource]/<int:id>/[action]/` (ví dụ: `/api/staff/orders/<int:id>/approve/`).
  * **Lịch sử phả hệ vòng đời (Audit Trail Timeline)**: `/api/[role]/[resource]/<int:id>/histories/` phục vụ hiển thị Timeline cho User/Staff.
* **Định danh Khóa chính & Tham chiếu (Integer ID Invariant)**:
  * **Thống nhất 100% sử dụng Integer ID (`<int:id>`)**: Toàn bộ URL, router, lookup field trong view và khóa ngoại trong JSON API đều dùng Integer ID (`id: 101`).
  * **Không dùng Public UUID**: Để triệt tiêu nguy cơ lệch cấu hình view (`lookup_field`) và serializer giữa 5 thành viên, toàn đội thống nhất chỉ dùng `id` chuẩn, không tự ý khai báo thêm trường `public_id = UUIDField`.
* **Quy ước Chữ HOA / Chữ Thường Bất Biến (Value Case Invariants)**:
  * **Roles / Phân quyền**: 100% VIẾT HOA `UPPER_SNAKE_CASE` (ví dụ: `ADMIN`, `CUSTOMER`, `STAFF`).
  * **Trạng thái thực thể nghiệp vụ (Entity Status - FSM)**: 100% VIẾT HOA `UPPER_SNAKE_CASE` (ví dụ: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  * **Mã lỗi nghiệp vụ (Error Code)**: 100% VIẾT HOA (ví dụ: `INVALID_STATUS_TRANSITION`, `RESOURCE_CONFLICT`).
  * **Hành động & Mức độ nghiêm trọng (Audit Log)**: 100% VIẾT HOA (ví dụ: `LOGIN`, `LOGOUT`, `CHANGE_PASSWORD`, `EXPORT_DATA`, `UNAUTHORIZED_ACCESS`).
  * **Khóa trong JSON (Request / Response)**: 100% chữ thường dạng `snake_case` (ví dụ: `created_at`, `total_amount`).
* **Quy ước Ngôn ngữ Trong Phản Hồi (Language Convention)**:
  * Trường `message`: 100% viết bằng **tiếng Việt thân thiện** hiển thị trực tiếp cho người dùng cuối (ví dụ: *"Đặt lịch thành công"*, *"Bạn không có quyền thực hiện thao tác này"*).
  * Trường `code` và `errors`: 100% viết bằng **tiếng Anh chuẩn** dành cho máy và lập trình viên kiểm soát logic (ví dụ: `code: "INVALID_STATUS_TRANSITION"`, `errors: {"email": ["This field is required."]}`).
* **Khung Bao Đóng Phản Hồi Chuẩn (Response Envelope)**:
  * **Thành công**:
    ```json
    {
      "success": true,
      "message": "Thao tác thành công",
      "request_id": "550e8400-e29b-41d4-a716-446655440000",
      "data": {},
      "errors": {}
    }
    ```
  * **Thất bại**:
    ```json
    {
      "success": false,
      "message": "Thông báo lỗi tiếng Việt hiển thị cho người dùng",
      "code": "ERROR_CODE_TIENG_ANH",
      "request_id": "550e8400-e29b-41d4-a716-446655440000",
      "data": {},
      "errors": {
        "field_name": ["English validation error message"]
      }
    }
    ```
* **Cấu Trúc Phân Trang Thống Nhất (Pagination Envelope)**:
  * Phân trang chuẩn sử dụng `PageNumberPagination` với `page_size = 20`. Toàn bộ thông tin phân trang bắt buộc nằm trọn vẹn bên trong trường `data`:
    ```json
    {
      "success": true,
      "message": "Lấy danh sách thành công",
      "request_id": "550e8400-e29b-41d4-a716-446655440000",
      "data": {
        "count": 100,
        "next": "http://api.domain.com/api/customer/orders/?page=2",
        "previous": null,
        "results": [...]
      },
      "errors": {}
    }
    ```

### Chữ Ký Giao Diện Hàm Bao Đóng Chuẩn (`core/utils.py`):
```python
def api_response(
    *,
    message: str,
    data: Any = None,
    status_code: int = 200,
    request: Any = None,
    code: str | None = None,
    errors: dict[str, list[str]] | None = None,
) -> Response:
    """
    Đóng gói phản hồi HTTP Response theo đúng Envelope bất biến.
    Tự động trích xuất request_id từ request.id hoặc core.context.get_request_id().
    Trường 'data' mặc định là {} nếu data is None.
    Nếu status_code >= 400:
        - Trường 'success' tự động là False.
        - Nếu 'code' không được truyền vào, tự động suy luận mã lỗi chuẩn theo status_code:
            400 -> "VALIDATION_ERROR"
            401 -> "AUTHENTICATION_FAILED"
            403 -> "ACTION_NOT_PERMITTED_FOR_ROLE"
            404 -> "NOT_FOUND"
            409 -> "RESOURCE_CONFLICT"
            422 -> "FAILED_PRECONDITION"
            428 -> "PRECONDITION_REQUIRED"
            429 -> "RATE_LIMIT_EXCEEDED"
            >= 500 -> "INTERNAL_SERVER_ERROR"
    """
```

---

## 2. Cấu Trúc Thư Mục, Phân Vai Tệp Mã Nguồn & Quy Chuẩn Lập Trình

### Cấu Trúc Phân Tầng:
* **`config/` (Thư mục cấu hình gốc)**: Chứa `settings.py`, root `urls.py`, `wsgi.py`, `asgi.py`, `routing.py`. Tuyệt đối không nhét mã nguồn nghiệp vụ vào đây.
* **`core/` (Tầng dùng chung toàn hệ thống)**:
  * `core/models.py`: Khai báo abstract `BaseModel` (`created_at`, `updated_at`) và `HistoryRequestMeta`.
  * `core/apps.py`: Khai báo `CoreConfig` (phương thức `ready()` nạp `signals.py`).
  * `core/signals.py`: Signal `pre_create_historical_record` tự động gắn `request_id` cho các bảng lịch sử `[entity]_histories`.
  * `core/context.py`: Lưu trữ `request_id` qua Python `ContextVar` để model, audit trail và signal đọc được mà không cần truyền biến `request`.
  * `core/exceptions.py`: Định nghĩa các Exception phân tầng nghiệp vụ (`BusinessValidationError`, `ForbiddenActionError`, `ConflictError`, `UnprocessableEntityError`).
  * `core/middleware.py`: `RequestIDMiddleware` đọc/sinh `X-Request-ID`, gán vào `request.id`, response header và `core/context.py`.
  * `core/pagination.py`: `StandardPagination` tùy biến đóng gói kết quả vào `data: { count, next, previous, results }`.
  * `core/policies/`: Lớp thẩm định phân quyền tập trung (`RoleCode` trong `roles.py`, `BasePolicy` trong `base.py`).
  * `core/services/`: Dịch vụ hạ tầng dùng chung toàn hệ thống:
    * `core/services/ws_ticket.py`: Sinh và xác thực vé WebSocket 1 lần (`create_ws_ticket`, `verify_and_consume_ws_ticket`).
    * `core/services/outbox.py`: Hàm `enqueue_outbox_event()` bọc sự kiện ngoại vi trong cùng transaction.
  * `core/utils.py`: Helper đóng gói phản hồi chuẩn `api_response()` và `custom_exception_handler`.
* **`system/` (Phân hệ Quản trị An ninh)**:
  * Quản lý model `AuditLog` và dịch vụ ghi vết an ninh hệ thống (`system/services.py: log_security_event`) dành riêng cho Super Admin.
* **`accounts/` (Phân hệ Tài khoản & Xác thực)**:
  * Quản lý `CustomUser`, bảng `roles`, cơ chế xác thực JWT; endpoint `/api/auth/ws-ticket/` gọi service từ `core/services/ws_ticket.py` để cấp vé WebSocket an toàn.
* **`[app_nghiep_vu]/` (Các phân hệ chức năng theo đề thi)**:
  * `models.py`: Khai báo thực thể CSDL (kèm `history = HistoricalRecords(table_name="[entity]_histories", bases=[HistoryRequestMeta])`).
  * `admin.py`: Đăng ký hiển thị trên Django Admin (kế thừa `SimpleHistoryAdmin`).
  * `policies.py`: Chính sách phân quyền nghiệp vụ (`[Entity]Policy(BasePolicy)`).
  * `services/`: Toàn bộ logic tính toán, chuyển trạng thái FSM, Concurrency lock.
  * `[role]/`: Thư mục con phân vùng theo vai trò:
    * `views_[role].py`: View mỏng điều phối HTTP.
    * `serializers_[role].py`: Tách biệt ReadSerializer và WriteSerializer.
    * `urls_[role].py`: Định tuyến con theo vai trò.
  * `urls.py`: Gom các file `urls_[role].py` xuất ra ngoài cho `config/urls.py`.

### Quy Chuẩn Viết Code Bắt Buộc:
1. **Quy Chuẩn View Mỏng ($\le 15$ Dòng Mỗi Method)**:
   * View chỉ đóng vai trò Gateway tiếp nhận request: kiểm tra Serializer hợp lệ, gọi Policy hoặc Service tương ứng, và trả về dữ liệu qua `api_response()`.
   * **Nghiêm cấm** viết logic tính toán, FSM transitions, gọi transaction hoặc truy vấn ORM phức tạp trực tiếp trong View.
   * **Chống BOLA/IDOR Tại `get_queryset()`**: Mọi View/ViewSet bắt buộc phải thu hẹp `queryset` theo Actor ngay tại phương thức `get_queryset()`. Không bao giờ dựa vào việc client gửi đúng ID. Bản ghi nằm ngoài phạm vi phân quyền đối tượng của Actor sẽ tự động trả về **`404 Not Found`** (theo D3) nhằm bảo vệ quyền riêng tư và chống rò rỉ sự tồn tại của tài nguyên.
2. **Quy Chuẩn Tách Biệt Serializer**:
   * Mỗi tài nguyên bắt buộc tách biệt thành:
     * `[Resource]ReadSerializer`: Phục vụ truy vấn, chứa toàn bộ các trường cần hiển thị và quan hệ lồng nhau (`nested data`). **Đối với thực thể có áp dụng OCC, `ReadSerializer` BẮT BUỘC phải bao gồm trường `version`** để Frontend nhận biết số phiên bản hiện tại và truyền vào header `If-Match` khi cập nhật.
     * `[Resource]WriteSerializer`: Phục vụ tạo mới/cập nhật, chỉ mở các trường mà client được phép can thiệp.
   * **Tuyệt Đối CẤM `fields = "__all__"`**: Mọi Serializer phải khai báo danh sách trường tường minh `fields = [...]` để chống tấn công Mass Assignment và tránh làm lộ thông tin nhạy cảm.
3. **Quy Ước Đặt Tên Bất Biến (Naming Convention)**:
   * **Tệp mã nguồn**: 100% chữ thường dạng `snake_case` (ví dụ: `views_customer.py`, `serializers_staff.py`, `policies.py`).
   * **Tên Class**: 100% `PascalCase` (ví dụ: `OrderItem`, `OrderStaffViewSet`, `OrderReadSerializer`, `OrderPolicy`).
   * **Tên Hàm / Phương Thức / Biến**: 100% `snake_case` (ví dụ: `process_payment`, `can_transition`, `total_amount`).
   * **Enum TextChoices**: Tên Class viết `PascalCase`, các thành viên viết `UPPER_SNAKE_CASE` (ví dụ: `class BookingStatus(models.TextChoices): PENDING = "PENDING", "Pending"`).

### 🎯 Nguyên Tắc Bất Biến Dùng Chung (Core Invariants):
1. **Kỷ luật Zero-Noise Commenting & 100% English Code**:
   * Tuyệt đối không viết comment mô tả cú pháp hiển nhiên (*WHAT*) hoặc mang giọng điệu chatbot AI. Chỉ comment giải thích lý do nghiệp vụ đặc thù (*WHY/HOW*) ngắn gọn.
   * 100% mã nguồn, chú thích (comments), tài liệu hàm/lớp (docstrings), nhãn hiển thị enum (`TextChoices` / `IntegerChoices` labels), tiêu đề cấu hình Django Admin (`fieldsets`, `verbose_name`), và dữ liệu fixtures/seed khởi tạo hệ thống (như tên Roles) **BẮT BUỘC viết bằng TIẾNG ANH**.
   * *Ngoại lệ duy nhất của tiếng Việt*: Chỉ dùng cho trường `message` trong phản hồi JSON trả về Client (`api_response`) phục vụ hiển thị trực tiếp cho người dùng cuối trên giao diện.
2. **Bảo mật Biến Môi Trường**: 100% Secret Keys, Database URI, Token được lưu trong file `.env`, không bao giờ hardcode trong mã nguồn.
3. **Đối Chiếu Chéo Thực Tế (Zero Speculation)**: Khi viết code ghép nối giữa 2 tầng, AI và Lập trình viên **bắt buộc phải đọc trực tiếp file mã nguồn đối ứng** (Frontend đọc Serializer Backend; Backend đọc Form/API Service Frontend) để lấy chính xác tên trường. **Tuyệt đối cấm suy đoán**.
4. **Chống Che Giấu Lỗi (Anti-Masking Data)**: Tuyệt đối không dùng fallback dữ liệu giả tạo kiểu `{ data.field || "Dữ liệu mẫu" }` che giấu lỗi API. Khi mất kết nối hoặc dữ liệu rỗng, phải hiển thị rõ trạng thái Loading (Skeleton), Empty State hoặc báo lỗi đỏ để phát hiện bug ngay lập tức.

---

## 3. Bảng Danh Mục Mã Lỗi Toàn Cầu & Chữ Ký Exception (Error Catalog)

Hệ thống phân định chính xác mã lỗi HTTP tương ứng với từng tình huống thực tế:

| Mã Lỗi (`code`) | HTTP Status | Exception Class | Ngữ Cảnh Kích Hoạt Trong Hệ Thống |
| :--- | :---: | :--- | :--- |
| `VALIDATION_ERROR` | `400` | `BusinessValidationError` / `ValidationError` | Dữ liệu đầu vào sai định dạng hoặc vi phạm ràng buộc Serializer |
| `INSUFFICIENT_STOCK` | `400` | `BusinessValidationError` | Số lượng tồn kho không đủ để đáp ứng đơn hàng / đặt trước |
| `INVALID_STATUS_TRANSITION` | `400` | `BusinessValidationError` | FSM Gate 1: Chuyển trạng thái không có trong đồ thị hợp lệ |
| `FILE_TOO_LARGE` | `400` | `BusinessValidationError` | Dung lượng tệp tải lên vượt quá ngưỡng cho phép (mặc định 5MB) |
| `INVALID_FILE_TYPE` | `400` | `BusinessValidationError` | Đuôi mở rộng của tệp không nằm trong danh sách whitelist |
| `INVALID_FILE_CONTENT` | `400` | `BusinessValidationError` | Magic bytes hoặc MIME type thực tế không khớp với định dạng tệp |
| `CORRUPTED_IMAGE` | `400` | `BusinessValidationError` | Tệp hình ảnh bị hỏng cấu trúc nhị phân (Pillow verify thất bại) |
| `AUTHENTICATION_FAILED` | `401` | `NotAuthenticated` / SimpleJWT | Thiếu token, token sai chữ ký hoặc token đã hết hạn |
| `TOKEN_BLACKLISTED` | `401` | `TokenBlacklistedError` | Refresh Token đã bị thu hồi trong Redis Blacklist |
| `ACTION_NOT_PERMITTED_FOR_ROLE` | `403` | `ForbiddenActionError` / `PermissionDenied` | FSM Gate 2 hoặc PBAC: Actor không đủ thẩm quyền trên tài nguyên |
| `NOT_FOUND` | `404` | `NotFound` / `Http404` | Không tìm thấy bản ghi theo ID |
| `RESOURCE_MODIFIED` | `409` | `ConflictError` | OCC: Phiên bản dữ liệu (`version`) bị lệch (Header If-Match không khớp) |
| `RESOURCE_CONFLICT` | `409` | `ConflictError` | Xung đột toàn vẹn dữ liệu (Bắt lỗi MySQL IntegrityError 1062, 1451, 1452) |
| `IDEMPOTENCY_IN_PROGRESS` | `409` | `ConflictError` | Thao tác cùng `Idempotency-Key` đang được xử lý trong Redis |
| `CONCURRENCY_DEADLOCK` | `409` | `ConflictError` | Xảy ra Deadlock (MySQL Error 1213) sau khi đã retry tối đa |
| `FAILED_PRECONDITION` | `422` | `UnprocessableEntityError` | FSM Gate 3: Thiếu điều kiện tiên quyết (ví dụ: chưa nhập lý do, chưa thanh toán) |
| `PRECONDITION_REQUIRED` | `428` | `PreconditionRequiredError` | Thiếu header điều kiện bắt buộc (ví dụ: thiếu header `If-Match` khi sửa dữ liệu OCC) |
| `RATE_LIMIT_EXCEEDED` | `429` | `Throttled` | Vượt quá tần suất gọi API cho phép của DRF Scoped Throttle |
| `INTERNAL_SERVER_ERROR` | `500` | Unhandled Exception | Lỗi máy chủ chưa được kiểm soát (giấu stack trace, ghi log hệ thống) |

### Chữ Ký Giao Diện Custom Exceptions (`core/exceptions.py`):
```python
from rest_framework.exceptions import APIException, AuthenticationFailed

class TokenBlacklistedError(AuthenticationFailed):
    status_code = 401
    default_code = "TOKEN_BLACKLISTED"
    def __init__(self, message: str = "Token đã bị thu hồi hoặc đăng xuất", code: str = "TOKEN_BLACKLISTED", errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}

class BusinessValidationError(APIException):
    status_code = 400
    default_code = "VALIDATION_ERROR"
    def __init__(self, message: str, code: str = "VALIDATION_ERROR", errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}

class ForbiddenActionError(APIException):
    status_code = 403
    default_code = "ACTION_NOT_PERMITTED_FOR_ROLE"
    def __init__(self, message: str, code: str = "ACTION_NOT_PERMITTED_FOR_ROLE", errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}

class ConflictError(APIException):
    status_code = 409
    default_code = "RESOURCE_CONFLICT"
    def __init__(self, message: str, code: str = "RESOURCE_CONFLICT", errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}

class UnprocessableEntityError(APIException):
    status_code = 422
    default_code = "FAILED_PRECONDITION"
    def __init__(self, message: str, code: str = "FAILED_PRECONDITION", errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}

class PreconditionRequiredError(APIException):
    status_code = 428
    default_code = "PRECONDITION_REQUIRED"
    def __init__(self, message: str = "Yêu cầu cung cấp header điều kiện", code: str = "PRECONDITION_REQUIRED", errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}
```

### Nguyên Lý Vận Hành Của `custom_exception_handler` (`core/utils.py`):
1. **Nguồn `request_id` duy nhất**: Đọc trực tiếp từ `getattr(request, 'id', None)` hoặc `core.context.get_request_id()`.
2. **Bắt lỗi CSDL MySQL & Django Core Exceptions**:
   * `django.db.models.ProtectedError`, `django.db.models.RestrictedError`: Chuyển đổi thành mã `RESOURCE_CONFLICT` (HTTP 409) kèm thông báo dữ liệu đang bị ràng buộc không thể xóa/sửa.
   * `django.db.utils.IntegrityError`:
     - Nếu mã lỗi MySQL là `1062` (Duplicate entry) hoặc `1451`/`1452` (Cannot delete/update parent row: foreign key constraint fails) $\rightarrow$ chuyển đổi thành mã `RESOURCE_CONFLICT` (HTTP 409).
   * `django.db.utils.DataError`: Nếu mã lỗi MySQL là `1406` (Data too long) $\rightarrow$ chuyển đổi thành mã `VALIDATION_ERROR` (HTTP 400).
   * `django.db.utils.OperationalError`: Nếu mã lỗi MySQL là `1213` (Deadlock) $\rightarrow$ chuyển đổi thành mã `CONCURRENCY_DEADLOCK` (HTTP 409).
   * `django.core.exceptions.ValidationError`: Chuyển đổi thành `VALIDATION_ERROR` (HTTP 400), bóc tách `message_dict` hoặc `messages` đưa vào trường `errors`.
   * `django.core.exceptions.PermissionDenied`: Chuyển đổi thành `ACTION_NOT_PERMITTED_FOR_ROLE` (HTTP 403).
3. **Trích Xuất Mã Lỗi Chuẩn (Mapping Chặt Chẽ Sang Catalog)**:
   * **Kiểm tra Custom Exception trước**: Kiểm tra `isinstance(exc, (TokenBlacklistedError, BusinessValidationError, ForbiddenActionError, ConflictError, UnprocessableEntityError, PreconditionRequiredError))` trước các class built-in để lấy chính xác `getattr(exc, 'code', exc.default_code)` (ngăn việc `TokenBlacklistedError` bị bắt nhầm thành `AUTHENTICATION_FAILED`).
   * **Mapping các class built-in còn lại**:
     * `rest_framework.exceptions.ValidationError` $\rightarrow$ `code = "VALIDATION_ERROR"`, chi tiết đưa vào trường `errors`.
     * `NotAuthenticated`, `AuthenticationFailed` $\rightarrow$ `code = "AUTHENTICATION_FAILED"`.
     * `PermissionDenied` $\rightarrow$ `code = "ACTION_NOT_PERMITTED_FOR_ROLE"`.
     * `NotFound`, `Http404` $\rightarrow$ `code = "NOT_FOUND"`.
     * `Throttled` $\rightarrow$ `code = "RATE_LIMIT_EXCEEDED"`.
     * Mọi ngoại lệ chưa kiểm soát khác $\rightarrow$ gán `code = "INTERNAL_SERVER_ERROR"`.
4. **An Toàn Khi Lỗi 500 (Tránh Lỗi Kép Khi Rollback)**:
   * Bắt buộc ghi nhận `logger.exception(exc)` để lưu đầy đủ traceback vào log hệ thống.
   * Để rollback an toàn, sử dụng `from rest_framework.views import set_rollback` và gọi **`set_rollback()`** (hàm không nhận tham số). **Tuyệt đối KHÔNG gọi `connection.set_rollback(True)`** vì khi handler chạy, service đã thoát khỏi atomic block nên không còn transaction nào mở, gọi trực tiếp sẽ ném `TransactionManagementError` làm che mất lỗi 500 gốc.
   * Trả về Envelope chuẩn với `code: "INTERNAL_SERVER_ERROR"` và ẩn toàn bộ thông tin nhạy cảm.
5. **Ghi Log An Ninh Độc Lập**: Khi bắt gặp lỗi 403 Forbidden hoặc vi phạm truy cập trái phép, handler tự động kích hoạt `log_security_event()` ngoài transaction nghiệp vụ để lưu vết kẻ tấn công.

---

## 4. Chuẩn Tầng Model & Cơ Sở Dữ Liệu MySQL (`models.py`)

Quy định thiết kế CSDL và thực thể dữ liệu trên nền tảng **MySQL 8.0+ (InnoDB Engine)**:

* **MUST (Ràng buộc kỹ thuật bắt buộc)**:
  * **Storage Engine**: BẮT BUỘC sử dụng `InnoDB` hỗ trợ ACID transactions, khóa ngoại và row-level locking. Tuyệt đối không dùng `MyISAM`.
  * **Character Set & Collation Duy Nhất**: BẮT BUỘC cấu hình CSDL với `utf8mb4` và collation duy nhất `utf8mb4_0900_ai_ci`. Bỏ hoàn toàn `utf8mb4_unicode_ci` để tránh lỗi MySQL *"Illegal mix of collations"* khi JOIN các bảng.
  * **Quy tắc Collation tiếng Việt**: `utf8mb4_0900_ai_ci` không phân biệt dấu và hoa/thường ("Bàn" = "Ban"). Cột unique cần phân biệt dấu (ví dụ: mã code sản phẩm, tên phân loại đặc thù) bắt buộc khai báo `db_collation="utf8mb4_0900_as_ci"`.
  * **Khóa chính nội bộ (Primary Key)**: Khai báo cấu hình chung `DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"` trong `settings.py`. Các model tuyệt đối **KHÔNG** tự khai báo trường `id`.
  * **Tiền tệ & Tài chính**: Bắt buộc sử dụng `models.DecimalField` (ví dụ: `max_digits=15, decimal_places=0` cho VND, hoặc `decimal_places=2` cho USD). Tuyệt đối cấm dùng `FloatField` để tránh sai số dấu phẩy động.
  * **Độ dài `CharField`**: Mọi `CharField` bắt buộc phải có tham số `max_length` rõ ràng (tránh lỗi `fields.E120` trên MySQL).
  * **Tên bảng CSDL (`db_table`)**: Bắt buộc là danh từ số nhiều chữ thường ở dạng `snake_case` (ví dụ: `db_table = "orders"`).
  * **Khóa ngoại (`ForeignKey`)**:
    * `related_name`: Bắt buộc là danh từ số nhiều của thực thể con (ví dụ: `related_name="items"`), tuyệt đối không dùng hậu tố `_set`.
    * `on_delete`:
      - **Mặc định**: Bắt buộc sử dụng `models.RESTRICT` hoặc `models.PROTECT` cho các thực thể chính (User, Role, Category, Product, Order) để chặn tuyệt đối nguy cơ xóa nhầm một bản ghi làm mất sạch dữ liệu liên quan.
      - **Dùng `models.SET_NULL`**: Chỉ dùng khi bản ghi con có thể tồn tại độc lập mà không cần thực thể cha (ví dụ: `assigned_to` khi nhân sự bị xóa thì task vẫn còn; yêu cầu `null=True, blank=True`).
      - **Dùng `models.CASCADE`**: CHỈ cho phép trong 2 trường hợp duy nhất: (1) Bảng mở rộng quan hệ 1-1 (như `Profile` gắn với `CustomUser`); (2) Dòng con phụ thuộc thuần túy theo cha (như `OrderItem` gắn với `Order`, xóa Order nháp thì xóa sạch các item của đơn đó).
  * **Kế thừa `BaseModel` & `HistoryRequestMeta` (`core/models.py`)**:
    * Mọi model nghiệp vụ kế thừa abstract `BaseModel`:
      ```python
      class BaseModel(models.Model):
          created_at = models.DateTimeField(auto_now_add=True)
          updated_at = models.DateTimeField(auto_now=True)
          class Meta:
              abstract = True
      ```
    * Định nghĩa abstract `HistoryRequestMeta` dùng làm `bases` cho `HistoricalRecords` để lưu vết `request_id`:
      ```python
      class HistoryRequestMeta(models.Model):
          """Abstract model bổ sung request_id cho bảng lịch sử của django-simple-history."""
          request_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
          class Meta:
              abstract = True
      ```
    * Gắn giá trị `request_id` cho bản ghi lịch sử thông qua Django Signal (đặt trong `core/signals.py`):
      ```python
      # core/signals.py
      from django.dispatch import receiver
      from simple_history.signals import pre_create_historical_record
      from core.context import get_request_id

      @receiver(pre_create_historical_record)
      def attach_history_request_id(sender, **kwargs):
          history_instance = kwargs.get("history_instance")
          if history_instance:
              history_instance.request_id = get_request_id()
      ```
    * **BẮT BUỘC Đăng Ký Signal Trong `core/apps.py`**:
      Django không tự động nạp file `signals.py`. Bắt buộc phải import trong phương thức `ready()` của `CoreConfig` để kích hoạt receiver. Nếu quên, `request_id` trong toàn bộ bảng lịch sử sẽ luôn bị `NULL` trong im lặng mà không báo lỗi:
      ```python
      # core/apps.py
      from django.apps import AppConfig

      class CoreConfig(AppConfig):
          default_auto_field = "django.db.models.BigAutoField"
          name = "core"

          def ready(self):
              import core.signals  # Bắt buộc: Đăng ký signal gắn request_id vào lịch sử
      ```
  * **Bất biến Transaction (`ATOMIC_REQUESTS = False`)**:
    * BẮT BUỘC cấu hình `'ATOMIC_REQUESTS': False` trong `settings.DATABASES['default']`.
    * *Lý do kỹ thuật sống còn*: Nếu bật `ATOMIC_REQUESTS = True`, toàn bộ request HTTP bị bọc trong một transaction lớn; khi có lỗi nghiệp vụ hoặc ngoại lệ văng ra, Django sẽ rollback toàn bộ, kéo theo việc hàm `log_security_event()` ghi vào bảng `audit_logs` bị xóa sạch, làm mất hoàn toàn dấu vết tấn công. Mọi ranh giới giao dịch phải được mở tường minh ở tầng Service bằng `with transaction.atomic():`.
  * **Cấu hình `django-simple-history` trước khi migrate**:
    * Trong `settings.py`, bắt buộc cấu hình `SIMPLE_HISTORY_HISTORY_CHANGE_REASON_USE_TEXT_FIELD = True` **trước lần chạy migrate đầu tiên** để trường `history_change_reason` sử dụng kiểu `TEXT` thay vì `VARCHAR(100)`, tránh lỗi MySQL Error 1406 (Data too long) khi lý do FSM dài.
* **RECOMMENDED (Khuyến nghị thực chiến TechWiz 5 ngày)**:
  * **Trạng thái & Lựa chọn (TextChoices)**: Sử dụng `models.TextChoices` với giá trị viết hoa `UPPER_SNAKE_CASE` (ví dụ: `PENDING = "PENDING", "Pending"`).
    * *Quy tắc so sánh*: Luôn so sánh giá trị bằng enum (`Status.PENDING`), tuyệt đối không dùng chuỗi cứng (`"PENDING"` / `"pending"`). Do collation `_ci`, truy vấn DB coi `"PENDING" == "pending"`, nhưng so sánh trong Python (`==`) phân biệt hoa thường. Dùng chuỗi cứng sẽ gây bug logic lệch pha giữa DB và code Python.
  * **Khóa Lạc Quan (Optimistic Concurrency Control - OCC)**: Các thực thể có nhiều người cùng chỉnh sửa (Orders, Tasks, Bookings) khai báo trường `version = models.PositiveIntegerField(default=1)`.
  * **Đánh chỉ mục (Indexing Rules)**:
    * Tuyệt đối không đặt `db_index=True` hay `unique=True` trên `TextField`.
    * Index ghép nhiều `CharField` không vượt quá 3072 byte (với `utf8mb4`, tính tối đa 4 byte mỗi ký tự).
    * Khai báo tập trung trong `class Meta: indexes = [...]`.
  * **Quan hệ Nhiều - Nhiều (M2M)**: Luôn khai báo bảng trung gian tường minh qua `through='TenBangTrungGian'` để lưu snapshot dữ liệu thời điểm (số lượng, đơn giá mua tại thời điểm đặt).
  * **Chuẩn hóa Email**: Email đăng nhập luôn được chuẩn hóa `email = email.strip().lower()` trước khi lưu hoặc xác thực.
* **CONDITIONAL (Áp dụng theo đề bài)**:
  * **JSONField**:
    * Bắt buộc khai báo `default=dict` (tuyệt đối không dùng `default={}` vì mutable object bị chia sẻ giữa các instance).
    * Luôn khai báo `encoder=DjangoJSONEncoder` (từ `django.core.serializers.json`) để tránh crash khi serialize `Decimal`, `datetime`, `UUID`.
  * **Theo dõi lịch sử với `django-simple-history`**:
    * Khai báo `history = HistoricalRecords(table_name="[entity]_histories", bases=[HistoryRequestMeta])` trên các thực thể có vòng đời FSM. Tên bảng lịch sử tuân theo chuẩn danh từ số nhiều `snake_case` hoặc áp dụng quy tắc ngoại lệ đồng bộ.

---

## 5. Chuẩn Tầng Service, FSM & Kiểm Soát Tranh Chấp (Concurrency)

Nơi xử lý toàn bộ logic nghiệp vụ, tính toán, chuyển trạng thái FSM và giao dịch cơ sở dữ liệu:
* Viết dạng hàm độc lập (pure Python functions), bắt buộc dùng tham số keyword-only (`*`).
* Không nhận đối tượng `request`, không trả về đối tượng `Response`.
* **Tham số nhận diện thực thể**: Hàm Service chuyển trạng thái FSM/OCC **bắt buộc nhận `id: int`** (không nhận đối tượng `instance` truyền từ View) để triệt tiêu hoàn toàn nguy cơ Stale Memory Snapshot khi nhiều request cùng tranh chấp.
* **Ranh giới Giao dịch (Transaction Boundary)**: Bắt buộc bọc trong `with transaction.atomic():`.
* **Kiểm Soát Tranh Chấp (Concurrency Locking)**:
  * **Phân bổ tài nguyên / Cập nhật thực thể FSM**: Bắt buộc dùng `select_for_update(of=("self",))` lọc theo Primary Key.
  * **Khóa nhiều dòng**: Bắt buộc dùng `.filter(id__in=ids).order_by("id").select_for_update(of=("self",))` để khóa theo thứ tự ID cố định, triệt tiêu Deadlock.
  * **Xử lý Deadlock (MySQL Error 1213)**: Vòng lặp thử lại (retry 1–2 lần) bắt buộc phải đặt **BÊN NGOÀI** khối `with transaction.atomic():`. Nếu retry thất bại $\rightarrow$ ném lỗi `CONCURRENCY_DEADLOCK` (HTTP 409).
  * **Luật Đồng Thời: `F()` Expression vs `HistoricalRecords` (Theo Quyết Định D5)**:
    - **Thực thể có khai báo `HistoricalRecords` (ví dụ: `Order`, hoặc `Product` nếu Pass 4 chốt gắn history)**: Tuyệt đối **CẤM** dùng câu lệnh `.update(stock=F("stock") - n)`. Câu lệnh `.update()` thực thi trực tiếp trong SQL và **bỏ qua hoàn toàn tín hiệu `post_save`**, khiến `django-simple-history` không thể tạo bản ghi lịch sử, làm thủng lỗ Audit Trail. Bắt buộc phải khóa dòng bằng `select_for_update(of=("self",))` và gọi `instance.save()`.
    - **Thực thể KHÔNG gắn `HistoricalRecords` (hoặc các trường chỉ số phụ)**: Được phép sử dụng Atomic Update `F()` có điều kiện (ví dụ: `filter(id=..., stock__gte=n).update(stock=F("stock") - n)` hoặc tăng view counter `update(views=F("views") + 1)`).
    - **Khóa nhiều dòng khi tạo đơn hàng (Anti-Deadlock Rule)**: Khi một thao tác cần cập nhật/trừ kho nhiều sản phẩm trong một giỏ hàng/đơn hàng, **BẮT BUỘC phải sắp xếp theo ID cố định** trước khi khóa dòng:
      ```python
      products = Product.objects.filter(id__in=product_ids).order_by("id").select_for_update(of=("self",))
      ```
      Nếu duyệt khóa ngẫu nhiên, hai khách hàng cùng đặt [A, B] và [B, A] tại cùng mili-giây sẽ kích hoạt MySQL Deadlock Error 1213 ngay lập tức.

### Quy Trình 6 Bước Dịch Chuyển Trạng Thái FSM + OCC + History Chuẩn Mực:
Khi thực hiện chuyển đổi trạng thái thực thể:
1. **Bước 1: Khóa dòng độc quyền trong Transaction (Row Locking)**:
   * View gọi `get_object()` để kiểm tra phạm vi (Object-Level / BOLA); nếu không thấy bản ghi trả về `404 Not Found`. Sau đó View chuyển `instance.id` và `expected_version` sang Service.
   * Service mở transaction: `with transaction.atomic():`.
   * Khóa độc quyền bản ghi theo ID bằng `instance = Model.objects.select_for_update(of=("self",)).get(id=id)`. Việc đọc lại instance ngay dưới khóa bảo đảm giá trị `instance.version` luôn là dữ liệu mới nhất.
2. **Bước 2: OCC (Kiểm soát phiên bản fail-fast ngay sau khi khóa dòng)**:
   * **Xử lý an toàn header `If-Match` tại View**:
     ```python
     if_match_raw = request.headers.get("if-match")
     if not if_match_raw:
         raise PreconditionRequiredError("Yêu cầu cung cấp header If-Match", code="PRECONDITION_REQUIRED")

     # Chuẩn hóa: loại bỏ tiền tố weak etag W/ và dấu ngoặc kép
     clean_version = if_match_raw.strip().removeprefix("W/").strip('"\'')
     try:
         expected_version = int(clean_version)
         if expected_version < 1:
             raise ValueError
     except (ValueError, TypeError):
         raise BusinessValidationError("Header If-Match không đúng định dạng số nguyên dương hợp lệ", code="VALIDATION_ERROR")
     ```
   * Service so khớp: `if instance.version != expected_version:` $\rightarrow$ ném `ConflictError("Bản ghi đã bị thay đổi bởi người khác, vui lòng tải lại", code="RESOURCE_MODIFIED")` (HTTP 409).
   * Cập nhật phiên bản: **`instance.version += 1`**.
   * *Cảnh báo kỹ thuật*: Tuyệt đối **KHÔNG dùng `instance.version = F("version") + 1`** vì khi gọi `save()`, `django-simple-history` sẽ tạo bản ghi lịch sử bằng câu lệnh `INSERT`, và Django ORM sẽ crash với `ValueError` do không hỗ trợ biểu thức `F()` trong `INSERT`. Gán `+= 1` hoàn toàn an toàn vì dòng dữ liệu đã được khóa độc quyền ở Bước 1.
3. **Bước 3: Gate 1 (Kiểm tra đường đi hợp lệ)**:
   * Đối chiếu trạng thái hiện tại và trạng thái đích với ma trận `TRANSITIONS` của thực thể. Nếu không hợp lệ $\rightarrow$ ném `BusinessValidationError(code="INVALID_STATUS_TRANSITION")` (HTTP 400).
4. **Bước 4: Gate 2 (Kiểm tra thẩm quyền Actor)**:
   * Gọi Policy phân quyền: `policy.can_transition(actor, instance, to_status)`. Nếu không đủ thẩm quyền $\rightarrow$ ném `ForbiddenActionError(code="ACTION_NOT_PERMITTED_FOR_ROLE")` (HTTP 403).
5. **Bước 5: Gate 3 (Kiểm tra tiền đề nghiệp vụ)**:
   * Kiểm tra các điều kiện phụ thuộc (ví dụ: đã nhập lý do chưa, đã thanh toán đủ tiền chưa). Nếu thiếu $\rightarrow$ ném `UnprocessableEntityError(code="FAILED_PRECONDITION")` (HTTP 422).
6. **Bước 6: Ghi vết Audit Trail & Lưu dữ liệu**:
   * Cập nhật trạng thái: `instance.status = new_status`.
   * Gán lý do: `instance._change_reason = reason`.
   * Gán người thực hiện: **`instance._history_user = actor`** (bảo đảm an toàn cho cả Celery Task, Management Command, Seed Data khi không có HTTP request).
   * Gọi `instance.save()` để `django-simple-history` tự động sinh bản ghi lịch sử kèm `request_id` (qua context/signal).

---

## 6. Phân Quyền Theo Chính Sách Tập Trung (PBAC & Policy Layer)

* **Class Hằng Số Vai Trò (`core/policies/roles.py`)**:
  > ⚠️ **Lưu ý cốt tử**: Các hằng số `ADMIN`, `STAFF`, `CUSTOMER` dưới đây là **placeholder mẫu**. AI và lập trình viên **bắt buộc trích xuất đúng danh sách Actor thực tế từ đề thi SRS ở Pass 1** (ví dụ: đề MarketLink chỉ có 3 Roles là `ADMIN`, `FARMER`, `CUSTOMER`; tuyệt đối không được sinh code có role `STAFF` nếu đề bài không yêu cầu).
  ```python
  class RoleCode:
      ADMIN = "ADMIN"
      STAFF = "STAFF"       # Thay bằng Actor đề bài (ví dụ: FARMER)
      CUSTOMER = "CUSTOMER"
  ```
* **Vị Trí Tệp Phân Quyền Trong Dự Án**:
  * `core/policies/base.py`: Chứa `BasePolicy` trừu tượng dùng chung toàn hệ thống.
  * `[app]/policies.py`: Chứa các class Policy cụ thể cho từng thực thể nghiệp vụ của app đó (ví dụ: `OrderPolicy(BasePolicy)`).
* **Chữ Ký Giao Diện `BasePolicy` (`core/policies/base.py`)**:
  ```python
  from abc import ABC, abstractmethod
  from typing import Any

  class BasePolicy(ABC):
      """Lớp cơ sở trừu tượng thẩm định quyền hạn 5 chiều: f(Actor, Action, Resource, Ownership, FSM State)."""
      
      @abstractmethod
      def can_view(self, actor: Any, resource: Any) -> bool:
          """Kiểm tra quyền đọc thông tin tài nguyên."""
          ...

      @abstractmethod
      def can_update(self, actor: Any, resource: Any) -> bool:
          """Kiểm tra quyền chỉnh sửa thông tin tài nguyên."""
          ...

      @abstractmethod
      def can_delete(self, actor: Any, resource: Any) -> bool:
          """Kiểm tra quyền xóa tài nguyên."""
          ...

      @abstractmethod
      def can_transition(self, actor: Any, resource: Any, to_status: str) -> bool:
          """Kiểm tra quyền kích hoạt bước chuyển trạng thái FSM cụ thể."""
          ...
  ```

---

## 7. Chuẩn Phân Định Hai Tầng Lịch Sử (Audit Log vs. Audit Trail)

Hệ thống phân định rạch ròi 2 tầng lưu vết:

### Tầng 1: Lịch Sử Nghiệp Vụ Thực Thể (Audit Trail FSM — `django-simple-history`):
* **Mục đích**: Theo dõi tiến độ nghiệp vụ của từng thực thể cụ thể (Đơn hàng, Lịch hẹn, Hồ sơ) phục vụ trực tiếp cho User/Staff xem Timeline tiến độ và giải trình khiếu nại.
* **Cách triển khai**: Khai báo `history = HistoricalRecords(table_name="[entity]_histories", bases=[HistoryRequestMeta])` trên model.
* **Tích hợp `request_id` qua `core/context.py`**:
  `RequestIDMiddleware` lưu `request_id` (UUIDv4) vào `ContextVar`. Signal `pre_create_historical_record` tự động trích xuất `request_id` gắn vào bản ghi lịch sử.
* **Quy Chuẩn Viết API Lịch Sử Cho Frontend (`GET /api/[role]/[resource]/<int:id>/histories/`)**:
  * Kiểm tra quyền truy cập qua Policy của thực thể cha (`policy.can_view(actor, resource)`).
  * **Tối ưu truy vấn**: Lấy toàn bộ lịch sử trong 1 câu truy vấn duy nhất: `resource.history.order_by("history_date")`.
  * **Diff trong bộ nhớ Python**: So sánh 2 bản ghi lịch sử liền kề để bóc tách bước chuyển `from_status` $\rightarrow$ `to_status` và các trường thay đổi.
  * **Cảnh báo**: **TUYỆT ĐỐI KHÔNG gọi thuộc tính `.prev_record`** trên từng bản ghi vì Django ORM sẽ bắn thêm một câu query CSDL cho mỗi dòng, gây lỗi $N+1$ query nghiêm trọng làm chậm hệ thống.

### Tầng 2: Nhật Ký An Ninh Toàn Hệ Thống (System Security Log — `audit_logs`):
* **Mục đích**: Giám sát an toàn thông tin toàn sàn dành riêng cho Super Admin: `LOGIN`, `LOGOUT`, `CHANGE_PASSWORD`, `EXPORT_DATA`, hoặc truy cập trái phép (`UNAUTHORIZED_ACCESS` / HTTP 403 khi sai role).
* **Cấu trúc trường chuẩn (9 trường phẳng)**: `user`, `action`, `endpoint`, `ip_address`, `user_agent`, `status_code`, `request_id`, `details` (`JSONField`), `created_at`.
* **Ranh giới Transaction**: Sự kiện an ninh **BẮT BUỘC ghi NGOÀI transaction nghiệp vụ** để khi thao tác nghiệp vụ bị rollback, log an ninh vẫn được lưu trữ vĩnh viễn trong bảng `audit_logs`.
* **Chữ Ký Hàm Ghi Log An Ninh (`system/services.py`)**:
  ```python
  def log_security_event(
      *,
      user: Any | None,
      action: str,
      endpoint: str,
      ip_address: str,
      user_agent: str,
      status_code: int,
      request_id: str,
      details: dict | None = None,
  ) -> Any:
      """
      Ghi bản ghi an ninh vào bảng audit_logs độc lập với transaction nghiệp vụ.
      Tự động loại bỏ password, token và credentials trước khi lưu vào details.
      """
  ```

---

## 8. Cấm / Lưu Ý Khi Sinh Code Cho MySQL (Anti-PostgreSQL Habits)

Ngăn ngừa triệt để các thói quen sinh code riêng của PostgreSQL:

1. **Tuyệt Đối CẤM Các Tính Năng Riêng Của PostgreSQL**:
   * CẤM `.distinct("field")`: MySQL chỉ hỗ trợ `.distinct()` trên toàn bộ hàng, không hỗ trợ lọc distinct trên từng cột cụ thể.
   * CẤM `ArrayField`, `HStoreField`: Thay thế bằng bảng quan hệ 1-N truyền thống hoặc `JSONField`.
   * CẤM thư viện `django.contrib.postgres` (`SearchVector`, `GinIndex`, `ArrayAgg`, `StringAgg`...).
   * CẤM `select_for_update(no_key=True)` (cú pháp riêng của Postgres).
   * CẤM `deferrable` constraints (MySQL không hỗ trợ hoãn kiểm tra ràng buộc).
2. **`UniqueConstraint(condition=...)` Chỉ Phát Cảnh Báo `models.W036`**:
   * MySQL không hỗ trợ partial index. Django chỉ phát cảnh báo hệ thống `models.W036` và không chặn `migrate`, nhưng điều kiện lọc `condition` sẽ hoàn toàn bị bỏ qua trong CSDL MySQL.
   * *Giải pháp*: Các bất biến dữ liệu có điều kiện bắt buộc phải được bảo vệ bằng kiểm tra trong tầng Service kết hợp `select_for_update()`.
3. **`bulk_create()` Không Trả Về ID**:
   * Trên backend MySQL của Django, `bulk_create()` không điền lại trường `id` vào các instance. Khi cần ID ngay lập tức để xử lý bảng con, dùng vòng lặp `create()` nằm trong `with transaction.atomic():`.
4. **Lỗi 1235 Khi Subquery Kèm Limit**:
   * `filter(x__in=qs[:n])` sẽ kích hoạt lỗi MySQL `OperationalError 1235: This version of MySQL doesn't yet support 'LIMIT & IN/ALL/ANY/SOME subquery'`.
   * *Giải pháp*: Bắt buộc đánh giá ra danh sách Python trước: `list(qs.values_list("id", flat=True)[:n])`.
5. **Sắp Xếp Giá Trị NULL (NULL Ordering)**:
   * MySQL xếp giá trị `NULL` lên ĐẦU TIÊN khi sắp xếp tăng dần (`ASC`), ngược hoàn toàn với PostgreSQL.
   * Khi sắp xếp các cột có thể NULL (như `deadline`), nếu muốn ưu tiên hạn chót gần nhất trước rồi mới đến công việc không có deadline, bắt buộc dùng: `F("deadline").asc(nulls_last=True)`.
6. **Tìm Kiếm Chuỗi (Search)**:
   * Sử dụng `icontains` cho tìm kiếm tiếng Việt không phân biệt dấu và hoa/thường nhờ collation `utf8mb4_0900_ai_ci`.
   * Cảnh báo: `contains` trên MySQL phân biệt cả hoa/thường và dấu.
7. **Thống Kê Múi Giờ Việt Nam**:
   * Các hàm trích xuất ngày tháng theo múi giờ (`TruncDate`, `__date` có tzinfo) đòi hỏi máy chủ MySQL đã được nạp dữ liệu múi giờ qua lệnh `mysql_tzinfo_to_sql`. Nếu chưa nạp, MySQL sẽ trả về `NULL`.

---

## 9. Quy Tắc Migration & User Model

* **Khai báo `AUTH_USER_MODEL`**:
  * BẮT BUỘC khai báo `AUTH_USER_MODEL = "accounts.CustomUser"` trong `settings.py` trước lần chạy lệnh `makemigrations` và `migrate` đầu tiên của dự án. Nếu chạy migrate với User mặc định rồi đổi sau, CSDL sẽ bị gãy toàn bộ quan hệ khóa ngoại và làm hỏng dự án.
* **Xây Dựng `CustomUser` Chuẩn Hóa**:
  * Khi kế thừa `AbstractUser` và đăng nhập 100% bằng email, bắt buộc:
    * `username = None`
    * `first_name = None` (loại bỏ trường thừa)
    * `last_name = None` (loại bỏ trường thừa; họ tên đầy đủ lưu tại bảng `Profile`)
    * `email = models.EmailField(unique=True)`
    * `role = models.ForeignKey("accounts.Role", on_delete=models.RESTRICT, related_name="users")` (khóa ngoại trỏ về `roles` bắt buộc dùng `on_delete=models.RESTRICT` theo D6)
    * `must_change_password = models.BooleanField(default=False)` (theo D7: mặc định là `False` để người dùng tự đăng ký không bị ép đổi pass; chỉ set `True` khi tài khoản do Admin tạo thủ công)
    * `USERNAME_FIELD = "email"`
    * `REQUIRED_FIELDS = []`
  * BẮT BUỘC phải viết `CustomUserManager` kế thừa `BaseUserManager` (override cả 2 phương thức `create_user` và `create_superuser`). Trong `create_superuser`, tự động gán vai trò `ADMIN` cho tài khoản.
  * **Kỷ Luật Django Admin Bắt Buộc (`CustomUserAdmin` trong `accounts/admin.py`)**:
    * Lớp `UserAdmin` mặc định của Django gắn cứng các trường `username`, `first_name`, `last_name` trong `list_display`, `search_fields` và `fieldsets`. Nếu đăng ký trực tiếp `admin.site.register(CustomUser, UserAdmin)`, lệnh `python manage.py check` sẽ ném lỗi **`admin.E108` / `admin.E116`** và làm sập server (`runserver` không khởi động được).
    * **Bắt buộc** khai báo `CustomUserAdmin` riêng:
      ```python
      from django.contrib import admin
      from accounts.models import CustomUser

      @admin.register(CustomUser)
      class CustomUserAdmin(admin.ModelAdmin):
          list_display = ("email", "role", "is_active", "is_staff", "must_change_password", "created_at")
          list_filter = ("role", "is_active", "is_staff")
          search_fields = ("email",)
          ordering = ("email",)
          fieldsets = (
              (None, {"fields": ("email", "password")}),
              ("Phân quyền & Vai trò", {"fields": ("role", "is_active", "is_staff", "is_superuser", "must_change_password")}),
              ("Thời gian", {"fields": ("created_at", "updated_at")}),
          )
          readonly_fields = ("created_at", "updated_at")
      ```
  * **Data Migration Khởi Tạo Vai Trò**: Tạo data migration để khởi tạo sẵn các vai trò thực tế của đề thi SRS (ví dụ: MarketLink là `ADMIN`, `FARMER`, `CUSTOMER`) vào bảng `roles` ngay từ ngày đầu tiên.
* **Kỷ Luật DDL Phi Giao Dịch Trên MySQL**:
  * MySQL không hỗ trợ rollback DDL. Nếu một file migration bị lỗi cú pháp hoặc đụng độ index giữa chừng, CSDL sẽ rơi vào trạng thái dở dang và không thể `migrate` tiếp.
  * Chỉ Lead Architect mới được quyền chạy `makemigrations` và merge migration vào Git. Các thành viên dev trực tiếp trên MySQL cục bộ, tuyệt đối không dùng SQLite rồi chuyển sang MySQL.
  * Tài khoản MySQL dùng cho kiểm thử (`pytest-django`) phải được cấp quyền `CREATE` và `DROP` database.

---

## 10. Chốt Chặn Bổ Sung Có Điều Kiện (Conditional Invariants)

* **Idempotency-Key Với Redis**:
  * Áp dụng cho các thao tác thanh toán tài chính hoặc khởi tạo tài nguyên quan trọng (ví dụ: tạo đơn hàng `POST /api/customer/orders/`).
  * Client gửi header `Idempotency-Key` (UUIDv4).
  * **Namespace Key**: Bắt buộc tạo khóa theo định dạng `idem:<user_id>:<endpoint>:<key>` để ngăn ngừa nguy cơ hai người dùng vô tình trùng key đè lên nhau.
  * **Nguyên Lý Vận Hành Hai Pha (Two-Phase TTL) & Giải Phóng Key Khi Thất Bại**:
    * **Pha 1 (In-Progress với TTL ngắn)**: Backend kiểm tra và khóa tạm trong Redis: `SET key "PROCESSING" NX EX 60` (TTL 60 giây).
      * Nếu key đã tồn tại và có giá trị `"PROCESSING"` $\rightarrow$ trả ngay HTTP 409 với mã `IDEMPOTENCY_IN_PROGRESS`.
      * Nếu key đã tồn tại và chứa dữ liệu phản hồi JSON (đã xử lý xong) $\rightarrow$ trả lại response cũ từ Redis cache trong 2ms mà không chạy lại tầng Service/DB.
    * **Pha 2 (Completed với TTL 24h)**: Khi Service thực thi thành công, lưu đè dữ liệu Response kèm TTL 24 giờ: `SET key response_json EX 86400`.
    * **Chốt chặn giải phóng key khi lỗi**: Toàn bộ luồng xử lý Service bắt buộc bọc trong `try ... except/finally`. **Nếu Service ném ngoại lệ hoặc thất bại, bắt buộc gọi `redis.delete(key)`** trong khối `except` để giải phóng khóa ngay lập tức, cho phép client có thể retry ngay mà không bị treo 409. (Nếu server crash đột ngột, TTL 60s của Pha 1 sẽ tự giải phóng sau 1 phút, không bị treo 24 giờ).
* **Vòng Đời Token Blacklist Với Redis**:
  * Khi người dùng đăng xuất hoặc khi kích hoạt xoay vòng token (`Rotate Refresh Token`), lưu `jti` của Refresh Token vào Redis với thời gian sống (TTL) bằng thời hạn của token: `SET blacklist:<jti> "1" EX <token_lifetime>`.
  * Tuyệt đối không cài đặt app `token_blacklist` của SimpleJWT vào `INSTALLED_APPS` để tránh sinh bảng rác làm phình to CSDL quan hệ.
* **Kiểm Soát Quyền Trên Khóa Ngoại Serializer**:
  * Khi nhận khóa ngoại trong `WriteSerializer` (ví dụ `category_id`, `assigned_to_id`), bắt buộc giới hạn `queryset` theo Actor trong phương thức `__init__()` của Serializer để chống gian lận gán trộm ID tài nguyên của người khác.

---

## 11. Cấu Hình Settings Bắt Buộc Toàn Hệ Thống (`settings.py`)

Các cấu hình cốt lõi để đảm bảo Frontend React Vite kết nối thông suốt và tính toán múi giờ chính xác:

1. **CORS Headers Bắt Buộc Cho Frontend**:
   * Để Frontend gửi được các custom header và đọc được `x-request-id`, bắt buộc cấu hình:
     ```python
     from corsheaders.defaults import default_headers

     CORS_ALLOW_HEADERS = list(default_headers) + [
         "if-match",
         "idempotency-key",
         "x-request-id",
     ]
     CORS_EXPOSE_HEADERS = ["x-request-id"]
     ```
2. **Cấu Hình Múi Giờ & Quy Tắc So Sánh `TimeField`**:
   * Cấu hình chuẩn trong `settings.py`:
     ```python
     TIME_ZONE = "Asia/Ho_Chi_Minh"
     USE_TZ = True
     ```
   * *Quy tắc so sánh `TimeField`*:
     * Trong MySQL, các trường `TimeField` (ví dụ `cutoff_time`, `opening_time`) lưu giờ naive (không có tzinfo).
     * Khi so sánh với thời gian hiện tại trong Python, bắt buộc chuyển đổi thời gian hiện tại về giờ địa phương Việt Nam trước khi trích xuất `.time()`:
       ```python
       from django.utils import timezone
       now_local_time = timezone.localtime(timezone.now()).time()
       if now_local_time > farmer.cutoff_time:
           raise BusinessValidationError("Đã quá thời gian nhận đặt trước trong ngày")
       ```
     * Tuyệt đối không so sánh trực tiếp `datetime.utcnow().time()` hoặc `timezone.now().time()` (giờ UTC) với `TimeField` trong DB vì sẽ bị lệch 7 tiếng!

---

## 12. Chuẩn Triển Khai WebSocket One-Time Ticket (`core/services/ws_ticket.py`)

Cung cấp cơ chế xác thực kết nối WebSocket an toàn 1 lần (Single-Use Ticket) với Redis, tuyệt đối không để lộ JWT trên query URL:

```python
import json
import uuid
from typing import Any
from django_redis import get_redis_connection

TICKET_TTL_SECONDS = 30  # Vé hết hạn sau 30 giây nếu client không kết nối

def create_ws_ticket(*, user_id: int, role: str) -> str:
    """
    Sinh vé bắt tay WebSocket dùng 1 lần và lưu trữ vào Redis.
    Key: ws_ticket:<uuid>
    TTL: 30 giây
    """
    ticket = uuid.uuid4().hex
    redis_client = get_redis_connection("default")
    payload = json.dumps({"user_id": user_id, "role": role.upper()})
    redis_client.set(f"ws_ticket:{ticket}", payload, ex=TICKET_TTL_SECONDS)
    return ticket

def verify_and_consume_ws_ticket(ticket: str) -> dict[str, Any] | None:
    """
    Xác thực và thu hồi vé ngay lập tức (Atomic Single-Use).
    Sử dụng lệnh GETDEL của Redis để đảm bảo 1 vé không thể tái sử dụng.
    """
    if not ticket or not isinstance(ticket, str):
        return None

    redis_client = get_redis_connection("default")
    key = f"ws_ticket:{ticket}"
    
    # Sử dụng getdel nguyên tử (hoặc pipeline get + delete)
    try:
        raw_payload = redis_client.getdel(key)
    except AttributeError:
        # Fallback cho Redis client phiên bản cũ không có getdel
        pipe = redis_client.pipeline()
        pipe.get(key)
        pipe.delete(key)
        raw_payload, _ = pipe.execute()

    if not raw_payload:
        return None

    if isinstance(raw_payload, bytes):
        raw_payload = raw_payload.decode("utf-8")

    try:
        return json.loads(raw_payload)
    except (json.JSONDecodeError, TypeError):
        return None
```

---

## 13. Chuẩn Triển Khai Transactional Outbox Pattern (`core/models.py` & `services`)

Ngăn chặn triệt để lỗi mất dữ liệu hoặc mất sự kiện (Dual-Write Problem) khi giao dịch CSDL cần kích hoạt dịch vụ bên thứ ba (gửi Email, gửi SMS OTP, phát tin WebSocket, đẩy việc sang Worker):

### 1. Khai Báo Model `OutboxEvent` (`core/models.py`):
```python
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

class OutboxEvent(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSED = "PROCESSED", "Processed"
        FAILED = "FAILED", "Failed"

    event_type = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField(
        default=dict,
        encoder=DjangoJSONEncoder,
        help_text="Dữ liệu chi tiết của sự kiện (hỗ trợ Decimal, UUID, datetime)",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    retry_count = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "outbox_events"
        ordering = ["created_at"]
```

### 2. Hàm Bọc Sự Kiện Trong Cùng Giao Dịch Nghiệp Vụ (`core/services/outbox.py`):
```python
from typing import Any
from core.models import OutboxEvent

def enqueue_outbox_event(*, event_type: str, payload: dict[str, Any]) -> OutboxEvent:
    """
    Tạo bản ghi sự kiện Outbox trong cùng transaction.atomic() của nghiệp vụ.
    Cam kết All-or-Nothing: Nếu nghiệp vụ rollback, event tự hủy; nếu commit, event chắc chắn được lưu.
    """
    return OutboxEvent.objects.create(
        event_type=event_type,
        payload=payload,
    )
```

---

## 14. Chuẩn An Toàn Tệp Tin Tải Lên (File Upload Security)

Bảo vệ hệ thống chống mã độc, webshell và khai thác tràn bộ nhớ khi xử lý file upload qua 4 chốt chặn kỹ thuật:

```python
import os
import uuid
import magic
from PIL import Image
from django.core.files.uploadedfile import UploadedFile
from core.exceptions import BusinessValidationError

MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

def validate_and_sanitize_image(uploaded_file: UploadedFile) -> str:
    """
    Thẩm định tệp ảnh qua 4 lớp kiểm tra:
    1. Kích thước file (size <= 5MB)
    2. Đuôi tệp (Extension Whitelist)
    3. Magic bytes / MIME Type thực tế (qua python-magic)
    4. Thẩm định cấu trúc ảnh thực tế (qua Pillow)
    Trả về tên file ngẫu nhiên an toàn (UUIDv4).
    """
    # 1. Kiểm tra dung lượng
    if uploaded_file.size > MAX_UPLOAD_SIZE:
        raise BusinessValidationError("Kích thước tệp không được vượt quá 5MB", code="FILE_TOO_LARGE")

    # 2. Kiểm tra phần mở rộng
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise BusinessValidationError("Định dạng tệp không được hỗ trợ", code="INVALID_FILE_TYPE")

    # 3. Kiểm tra Magic Bytes / MIME Type
    uploaded_file.seek(0)
    initial_bytes = uploaded_file.read(2048)
    mime_type = magic.from_buffer(initial_bytes, mime=True)
    uploaded_file.seek(0)
    
    if mime_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise BusinessValidationError("Nội dung tệp không hợp lệ", code="INVALID_FILE_CONTENT")

    # 4. Kiểm tra toàn vẹn ảnh qua Pillow
    try:
        with Image.open(uploaded_file) as img:
            img.verify()
    except Exception:
        raise BusinessValidationError("Tệp hình ảnh bị lỗi hoặc không thể đọc", code="CORRUPTED_IMAGE")
    finally:
        uploaded_file.seek(0)

    # 5. Sinh tên file ngẫu nhiên an toàn tuyệt đối
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    return safe_filename
```

---

## 15. Cấu Hình Giới Hạn Tần Suất (Throttling Configuration & Scopes)

Thiết lập chốt chặn phòng chống tấn công dò quét mật khẩu (Brute-force) và bảo vệ hạ tầng máy chủ trong `settings.py`:

```python
REST_FRAMEWORK = {
    # ...
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "2000/hour",        # Giới hạn khách vãng lai (đảm bảo Ban Giám Khảo & máy chấm thi cùng IP không bị chặn khi test SPA/react-query)
        "user": "5000/hour",        # Giới hạn người dùng đã đăng nhập
        "auth": "5/minute",         # Chống brute-force: Login, Register, Forgot Password
        "export": "10/hour",        # Giới hạn tác vụ nặng: Xuất Excel, PDF
    },
}
```

> ⚠️ **Lưu ý sống còn về Cache Backend khi chạy Throttling**:
> * DRF Throttling mặc định sử dụng cache `default`. Khi ứng dụng chạy trên production với nhiều worker (Gunicorn, Daphne), **bắt buộc phải cấu hình Redis Cache backend (`django-redis`)** trong `CACHES`.
> * Nếu dùng bộ nhớ RAM mặc định (`LocMemCache`), mỗi worker sẽ lưu một biến đếm riêng biệt, gây hiện tượng đếm sai lệch và không thể kiểm soát tần suất chính xác trên cụm server.

* **Áp dụng Scoped Throttle cho Auth Views (`accounts/auth/views_auth.py`)**:
```python
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle

class LoginView(APIView):
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"
    # ...
```
