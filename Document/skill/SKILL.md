---
name: techwiz-django-backend
description: Quy chuẩn lập trình Model, Serializer, Service và View cho phân hệ Backend Django REST Framework, kèm quy ước đặt tên URL/JSON, audit log, ngôn ngữ mã nguồn (English-only) và quyền tác giả commit. Dùng khi viết hoặc review code backend Django/DRF, thiết kế endpoint, hoặc khi commit và mở pull request.
---

# Django REST Framework — Implementation Standard

Tài liệu quy định phong cách lập trình bắt buộc cho Model, Serializer, Service và View.

---

## 1. Tiêu Chuẩn Hệ Thống & Cấu Trúc API (Invariants)
* **Quy tắc đặt tên URL Endpoint**:
  * Định tuyến theo Role (BFF Pattern): Bắt buộc dạng `/api/[role]/[resource]/` (ví dụ: `/api/customer/orders/`, `/api/manager/tasks/`).
  * Định tuyến dùng chung / Xác thực: `/api/auth/` (Login, Token), `/api/notifications/`, `/api/chat/`.
  * Tên tài nguyên (`resource`): Bắt buộc là danh từ số nhiều dạng `kebab-case` (ví dụ: `booking-requests`, `audit-logs`).
  * Dấu gạch chéo kết thúc: 100% URL bắt buộc có dấu `/` ở cuối (chuẩn `APPEND_SLASH = True` của Django).
  * Hành động đặc thù (Actions): Dùng động từ đặt sau ID (ví dụ: `/api/manager/orders/<int:id>/approve/`, `/api/customer/orders/<int:id>/cancel/`).
* **JSON Format**: 100% key ở dạng `snake_case`.
* **Response Envelope**:
  * Thành công: `{"success": true, "message": "...", "data": {...}, "errors": {}}`
  * Thất bại: `{"success": false, "message": "...", "data": {}, "errors": {"field": ["English error message"]}}`

---

## 2. Chuẩn Tầng Model (`models/`)
Quy định thiết kế CSDL và thực thể dữ liệu do Lead Architect phụ trách.
* **Kế thừa**: Mọi model nghiệp vụ kế thừa abstract `BaseModel` (chỉ chứa `created_at`, `updated_at`; để Django tự quản lý `id` hoặc model con tự định nghĩa khóa chính riêng).
* **Tên bảng CSDL (`db_table`)**: Bắt buộc là danh từ số nhiều ở dạng `snake_case` (ví dụ: `db_table = "orders"`).
* **Khóa ngoại (`ForeignKey`)**:
  * `related_name`: Bắt buộc là danh từ số nhiều của thực thể con (ví dụ: `related_name="items"`), tuyệt đối không dùng `_set`.
  * `on_delete`: Ưu tiên `models.RESTRICT` hoặc `PROTECT` cho các thực thể chính để chống xóa nhầm; hạn chế `CASCADE`.
* **Trạng thái & Lựa chọn**: Sử dụng `models.TextChoices` với giá trị là chữ thường `snake_case` (ví dụ: `PENDING = "pending", "Pending"`).
* **Quan hệ Nhiều - Nhiều (M2M)**: Luôn khai báo bảng trung gian tường minh qua `through='...'` để lưu snapshot dữ liệu thời điểm.
* **Đánh chỉ mục (`db_index=True`)**: Đánh index trên các cột thường xuyên lọc (`status`) hoặc sắp xếp (`created_at`, `deadline`).
* **Ranh giới logic**: Chỉ viết phương thức kiểm tra trạng thái thuộc về chính thực thể đó (như `can_cancel()`); tuyệt đối không nhét logic giao dịch liên bảng hay gửi mail vào `save()`.

---

## 3. Chuẩn Tầng Service (`services/`)
Nơi xử lý toàn bộ logic nghiệp vụ, tính toán và giao dịch cơ sở dữ liệu.
* Viết dạng hàm độc lập, bắt buộc dùng tham số keyword-only (`*`).
* Không nhận đối tượng `request`, không trả về `Response`.
* Bắt buộc bọc `with transaction.atomic():` khi thao tác ghi dữ liệu từ 2 bảng trở lên.
* Khóa dòng chống tranh chấp tài nguyên (tồn kho, slot, số dư): Dùng `select_for_update()`.
* Báo lỗi vi phạm nghiệp vụ: `raise ValidationError({"field_name": ["English error message"]})`.

---

## 4. Chuẩn Tầng Serializer (`serializers/`)
Chỉ làm nhiệm vụ kiểm tra hình thức dữ liệu và định dạng JSON.
* Bắt buộc tách biệt `ReadSerializer` (dùng cho GET) và `WriteSerializer` (dùng cho POST, PUT, PATCH).
* Tuyệt đối không dùng `fields = "__all__"` cho WriteSerializer; phải khai báo rõ ràng các trường cho phép nhập.
* Kiểm tra tính hợp lệ 1 trường dùng `validate_<field_name>()`; kiểm tra logic nhiều trường dùng `validate()`.

---

## 5. Chuẩn Tầng View (`views/`)
Nhiệm vụ: Nhận request -> Thẩm định qua Serializer -> Gọi Service -> Trả response.
* View mỏng (Thin View $\le 15$ dòng), không chứa logic tính toán nghiệp vụ hay giao dịch CSDL.
* Bắt buộc lọc dữ liệu theo quyền sở hữu của Actor ngay trong `get_queryset()` để phòng ngừa lỗ hổng IDOR.
* Luôn đóng gói kết quả trả về thông qua helper `api_response()`.

---

## 6. Quy Ước Đặt Tên File & Mã Nguồn (Naming Conventions)
* **File gốc dùng chung của App**: Giữ nguyên tên chuẩn Django (`models.py`, `admin.py`, `permissions.py`, `urls.py`).
* **File theo Role con (`[role]/`)**: Bắt buộc thêm hậu tố `_[role]` để chống nhầm tab IDE và phân định rõ không gian code của từng thành viên (ví dụ: `views_customer.py`, `serializers_customer.py`, `urls_customer.py`).
* **File Service nghiệp vụ (`services/`)**: Đặt theo tên thực thể hoặc nghiệp vụ (ví dụ: `order_service.py`, `audit_manager_service.py`).
* **Biến, trường dữ liệu, hàm**: `snake_case` (ví dụ: `customer_id`, `calculate_total()`).
* **Class**: `PascalCase` (ví dụ: `OrderCreateSerializer`, `OrderAPIView`).
* **Hằng số, Choices**: `UPPER_SNAKE_CASE` (ví dụ: `STATUS_PENDING = "pending"`).
* **Thông báo lỗi**: 100% viết bằng tiếng Anh chuẩn.

---

## 7. Chuẩn Kiểm Toán & Giám Sát (Audit Log — Mô Hình WorkTracker)
Áp dụng khi đề bài yêu cầu ghi vết hành động nhạy cảm hoặc màn hình lịch sử hoạt động cho Quản trị viên (Observability).
* **Kiến trúc**: Đặt tập trung trong app `system/`, gồm model `AuditLog` (bảng `audit_logs`) và helper `log_action()` tại `system/services/audit_manager_service.py`.
* **Cấu trúc Model `AuditLog` (Append-Only)**:
  * `user`: Khóa ngoại trỏ về User với `on_delete=models.SET_NULL` (giữ nguyên vết log ngay cả khi tài khoản bị xóa).
  * `action`: Định danh hành động viết hoa (ví dụ: `CREATE_JOB`, `LOCK_TIMESHEET`, `CHANGE_PASSWORD`).
  * `severity`: Dùng `TextChoices` (`CRITICAL`, `WARNING`, `NORMAL`) để gắn badge màu cảnh báo trên giao diện Admin.
  * `table_name` & `record_id`: Tên bảng vật lý và ID bản ghi bị tác động (đánh Index kép `["table_name", "record_id"]`).
  * `old_values` & `new_values`: Lưu dạng `JSONField` snapshot dữ liệu trước và sau khi thay đổi để đối soát chi tiết.
  * `ip_address`: Lưu địa chỉ IP của client (bóc tách qua `HTTP_X_FORWARDED_FOR` hoặc `REMOTE_ADDR`).
* **Quy tắc Ghi Vết**:
  * Gọi hàm `log_action(...)` trực tiếp bên trong `services/` của hành động chính.
  * Phải nằm chung bên trong `with transaction.atomic():` của thao tác chính (không tự mở transaction riêng để nếu nghiệp vụ chính lỗi thì log không bị ghi rác).
  * Tuyệt đối không tạo API `UPDATE` hoặc `DELETE` cho bảng `audit_logs`.

---

## 8. Chuẩn Ngôn Ngữ Mã Nguồn (English-Only Codebase)

Toàn bộ **mã nguồn** viết bằng tiếng Anh, không ngoại lệ. Mục 6 đã quy định thông báo lỗi; mục này mở rộng ra mọi thứ lập trình viên gõ vào repo.

* **Bắt buộc tiếng Anh**:
  * Tên biến, hàm, class, module, thư mục, tên file.
  * Docstring và comment (kể cả comment giải thích dài).
  * Thông báo lỗi trả về client, message trong `ValidationError`, `assert`.
  * Log message, tên `action` trong `AuditLog`, giá trị của `TextChoices`.
  * Commit message, tên branch, tiêu đề và mô tả Pull Request.
  * `verbose_name`, `help_text`, `related_name`, `db_table`.
  * Tên migration (`--name` khi chạy `makemigrations`).
* **Được phép tiếng Việt** (dữ liệu, không phải mã nguồn):
  * Nội dung hiển thị cho người dùng cuối nếu đề bài yêu cầu giao diện tiếng Việt — nhưng phải nằm trong seed data, file template email, hoặc file i18n, **không** hardcode giữa logic.
  * Dữ liệu mẫu (`seed_data.py`): tên người, địa chỉ, tên sản phẩm.
  * Tài liệu bàn giao cho Aptech (SWD Forms), README dành cho giám khảo.

**Lý do**: đề bài chấm bởi giám khảo quốc tế, và một codebase trộn hai ngôn ngữ làm hỏng tìm kiếm — `grep "đơn hàng"` không ra `order`. Chọn một, giữ nhất quán.

**Cách kiểm tra trước khi commit** — quét ký tự có dấu tiếng Việt trong mã nguồn:

```bash
grep -rlP '[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]' \
  backend/ frontend/src/ \
  --exclude-dir=node_modules --exclude-dir=__pycache__ --exclude-dir=migrations
```

Lệnh này không bắt được tiếng Việt không dấu (`don hang`, `nguoi dung`) — loại đó phải tự soát khi review. Nếu có file seed/template cố ý để tiếng Việt, thêm `--exclude` cho đúng file đó thay vì bỏ luôn cả lệnh.

---

## 9. Quy Ước Git & Quyền Tác Giả Commit (Contributor Hygiene)

Bài nộp phải thể hiện đúng công sức của 5 thành viên. Không một công cụ AI nào được xuất hiện trong danh sách contributors của repo.

### 9.1. GitHub tính contributor từ đâu

Đúng ba nguồn, tất cả nằm trong chính commit — **không** phải từ tài khoản chạy lệnh `git push`:

1. Trường `author` (tên + email).
2. Trường `committer` (tên + email).
3. Trailer `Co-Authored-By:` trong commit message.

### 9.2. Quy tắc bắt buộc

* **Tuyệt đối không** thêm trailer `Co-Authored-By:` trỏ tới bất kỳ AI nào (`Claude`, `noreply@anthropic.com`, `Copilot`, `Cursor`, ...).
* **Tuyệt đối không** thêm dòng quảng bá công cụ vào commit message hay mô tả Pull Request (`Generated with ...`, link session, emoji robot).
* **Tuyệt đối không** ghi tên model AI vào comment mã nguồn, docstring, hay bất kỳ file nào được commit.
* Mỗi thành viên cấu hình đúng danh tính của mình trước commit đầu tiên:

```bash
git config user.name  "Nguyen Van A"
git config user.email "email-dang-ky-github@example.com"
```

Email phải trùng với email đã xác minh trên tài khoản GitHub, nếu không commit sẽ không được gắn vào profile và biểu đồ đóng góp của thành viên đó trống.

### 9.3. Kiểm tra trước khi push

```bash
# Không có dòng attribution nào lọt vào lịch sử.
# Neo vào đầu dòng: nếu chỉ grep chữ "claude" sẽ báo nhầm mọi commit
# có nhắc đường dẫn .claude/ trong repo.
git log --format='%B' \
  | grep -inE '^co-authored-by:|^generated with|noreply@anthropic|@users\.noreply\.github\.com.*copilot' \
  && echo "CÓ VẤN ĐỀ" || echo "sạch"

# Toàn bộ commit đúng người trong nhóm
git log --format='%an <%ae>' | sort -u

# Kiểm tra cả trường committer, không chỉ author
git log --format='%cn <%ce>' | sort -u
```

### 9.4. Chặn tự động bằng git hook (khuyến nghị)

Tạo `.git/hooks/commit-msg`, `chmod +x`, mỗi máy chạy một lần:

```bash
#!/bin/sh
# Reject any AI attribution trailer before it enters history.
if grep -qiE 'co-authored-by:.*(claude|anthropic|copilot|cursor)|generated with' "$1"; then
  echo "commit-msg hook: remove the AI attribution line before committing." >&2
  exit 1
fi
```

Hook nằm trong `.git/` nên không theo repo được — mỗi thành viên tự tạo, hoặc để một file `scripts/install-hooks.sh` copy vào.

### 9.5. Nếu lỡ commit rồi

Commit **chưa push**:

```bash
git commit --amend            # xóa dòng trailer trong editor
```

Commit **đã push**, phải viết lại lịch sử:

```bash
pip install git-filter-repo
git filter-repo --message-callback '
return b"\n".join(l for l in message.split(b"\n")
                  if b"Co-Authored-By: Claude" not in l)
'
git push --force-with-lease origin main
```

Lệnh này đổi SHA của commit dính lỗi **và mọi commit sau nó**. Báo cả nhóm trước khi chạy — ai đang có branch dở phải `rebase` lại, hoặc clone mới. Với dự án 5 ngày, làm sớm rẻ hơn nhiều so với làm vào đêm trước hạn nộp.
