# ⚙️ MARKETLINK — 4 LƯU Ý KỸ THUẬT BẮT BUỘC KHI THI CÔNG
> **Phạm vi**: Backend Django + Frontend React của MarketLink.
> **Căn cứ**: Pass 4A (CSDL, §5 kiểm soát đồng thời) · Pass 4B (Hợp đồng API §1.2, §5, CT-16) · D-006, D-010.
> **Mục đích**: Bảo đảm code chạy đúng bản vẽ an ninh; mỗi lưu ý kèm lỗi thường gặp và cách kiểm chứng.

---

## 1. Transaction & ghi nhật ký an ninh (`audit_logs`)

### Quy tắc
```python
# marketlink_core/settings.py
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
- Hai khách đặt cùng lúc món còn 1 → cả hai 201, tồn kho vẫn 1 (tạo đơn không trừ kho — D-029). Farmer duyệt đơn thứ nhất → tồn kho 0; duyệt đơn thứ hai → 400 `INSUFFICIENT_STOCK`, đơn vẫn `PLACED`; tồn kho không âm (CT-07). Hai tab cùng duyệt các đơn chung một món → khóa `products` theo `id`, chỉ đơn đủ hàng được trừ.

---

## 4. CORS cho header tùy biến

### Cấu hình
```python
# marketlink_core/settings.py
import os
from corsheaders.defaults import default_headers

CORS_ALLOWED_ORIGINS = [o for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o]

CORS_ALLOW_HEADERS = list(default_headers) + [
    "if-match",
    "idempotency-key",
    "x-request-id",
]

CORS_EXPOSE_HEADERS = [
    "x-request-id",          # hiển thị "Incident ID" khi lỗi
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
        raise ValidationError({"if_match": ["Invalid If-Match value"]})
```

### Kiểm chứng
- DevTools → Network: request `OPTIONS` trước `POST /api/customer/orders/` trả 200 và có `access-control-allow-headers` chứa `idempotency-key`.

---

## 5. Chạy quét lười định kỳ khi deploy (`expire_orders`)

### Quy tắc
- D-009 không dùng Celery Beat; quét lười chỉ chạy khi có sự kiện (checkout, áp dụng mẫu tuần, Farmer mở danh sách đơn / dashboard). Nếu Farmer không mở app, đơn `PLACED` quá giờ nhận không chuyển `EXPIRED` và khách không nhận thông báo hết hạn.
- Khi deploy **bắt buộc** cài lịch chạy lệnh có sẵn `python manage.py expire_orders` mỗi **10 phút** bằng cron hoặc scheduler của nơi host (không thêm thư viện mới).
- Lỗi của một đơn trong lượt quét chỉ được ghi log (`logger "marketlink"`), các đơn khác vẫn được xử lý, request kích hoạt quét (danh sách đơn, checkout…) không bị lỗi theo. Ngoại lệ: khi quét chạy bên trong transaction của bên gọi thì lỗi vẫn được ném ra, vì transaction đã hỏng.

### Ví dụ
```text
# crontab (Linux) — chạy mỗi 10 phút, ghi log ra file
*/10 * * * * cd /srv/marketlink/backend && /srv/marketlink/venv/bin/python manage.py expire_orders >> /var/log/marketlink/expire_orders.log 2>&1
```
Nền tảng host có "Scheduled job / Cron job" thì khai báo cùng lệnh `python manage.py expire_orders`, chu kỳ 10 phút.

### Kiểm chứng
- Tạo đơn `PLACED` có `pickup_start_at` đã qua, không mở app Farmer; sau tối đa 10 phút đơn thành `EXPIRED` và khách nhận `ORDER_EXPIRED` (CT-23).

---

## Bảng tổng hợp
| # | Lưu ý | Sai lầm thường gặp | Test chứng minh |
| :---: | :--- | :--- | :--- |
| 1 | `ATOMIC_REQUESTS = False` + ghi audit ngoài khối atomic | Ghi audit bên trong service sắp rollback | CT-04 |
| 2 | `GETDEL` nguyên tử; `accept()` rồi `close(4401)` | `get()` + `delete()` riêng; `close()` trước `accept()` | CT-16 |
| 3 | Khóa theo `id`, `of=("self",)`, thứ tự bảng cố định, retry 1213 | Tin rằng sắp xếp ID là hết deadlock | CT-07 |
| 4 | Allow + Expose đủ header | Quên `CORS_EXPOSE_HEADERS` | Preflight trong DevTools, CT-06 |
| 5 | Lịch chạy `expire_orders` mỗi 10 phút; lỗi từng đơn chỉ ghi log | Chỉ dựa vào quét lười khi có người mở app | CT-23 |
