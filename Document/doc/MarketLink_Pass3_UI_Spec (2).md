# 🎨 PASS 3: THIẾT KẾ MÀN HÌNH & LUỒNG GIAO DIỆN (FRONTEND UI/UX FLOW & DATA SPEC)
## DỰ ÁN MARKETLINK — TECHWIZ 7
> **Đầu vào**: Use Case UC-01 → UC-27 (Pass 1) và Decision Log D-001 → D-021 (Pass 2, bản sửa: FSM 13 cạnh T1–T13).
> **Tác nhân & định tuyến**: 3 role đăng nhập `CUSTOMER`, `FARMER`, `ADMIN` + tác nhân `Guest` (chưa đăng nhập, không phải role trong CSDL). Route và thư mục `pages/` đặt tên đúng theo 4 tác nhân này.
> **Phạm vi**: 100% tính năng được thi công, không loại bỏ phân hệ nào.
> **Stack giao diện (D-001)**: React 19 + Vite, CSS3 thuần (CSS Modules + design tokens CSS Custom Properties), Radix UI primitives (headless), TanStack Query/Table, React Hook Form + Zod, Zustand, React-Leaflet (D-012), Recharts.
> **Ngôn ngữ/Tiền tệ (D-020)**: Giao diện tiếng Việt, VND, giờ hiển thị GMT+7.
> **Trạng thái**: ❓ Chờ Lead Architect duyệt trước khi sang Pass 4.

---

## 0. ÁNH XẠ YÊU CẦU CHỨC NĂNG → MÀN HÌNH (FR → SCREEN MAP)
*(Nguồn chuẩn của FR, UC và nguồn SRS là `MarketLink_requirement_analysis.md` Pass 2 §4. Bảng dưới lặp lại mã FR để ánh xạ sang màn hình; khi sửa nội dung FR phải sửa ở file phân tích trước.)*

### 0.1 Công khai & Xác thực
| Mã FR | Yêu cầu (SRS §1.6) | UC | Quyết định | Màn hình |
| :---: | :--- | :---: | :---: | :--- |
| FR-01 | Customer đăng ký: họ tên, SĐT, email, địa chỉ | UC-01 | — | G-10 |
| FR-02 | Farmer đăng ký: tên sạp, người liên hệ, SĐT, email, địa chỉ | UC-01 | D-015 | G-11 |
| FR-03 | Đăng nhập an toàn, đăng xuất, chuyển tới dashboard riêng theo role | UC-02 | — | G-09, C-00, F-01, A-01 |
| FR-04 | Phân quyền: mỗi role `CUSTOMER` / `FARMER` / `ADMIN` chỉ truy cập nhánh route của mình; Guest chỉ truy cập trang công khai | UC-02 | D-002 | `RoleRoute`, `GuestOnlyRoute` |
| FR-05 | Trang About Us (đội ngũ + nền tảng, FAQ dùng chung tài khoản) | UC-03 | D-021 | G-07 |
| FR-06 | Trang Contact Us: thông tin tĩnh + Google Maps | UC-03 | D-012 | G-08 |

### 0.2 Customer
| Mã FR | Yêu cầu | UC | Quyết định | Màn hình |
| :---: | :--- | :---: | :---: | :--- |
| FR-10 | Duyệt chợ gần theo vị trí và ngày họp | UC-04 | D-012 | G-02 |
| FR-11 | Xem danh sách Farmer có mặt tại từng chợ | UC-04 | — | G-03 |
| FR-12 | Hồ sơ Farmer: tên sạp, vị trí, ngày hoạt động, hàng trong tuần | UC-06 | — | G-06 |
| FR-13 | Bản đồ chợ/sạp có marker và chỉ đường tới điểm nhận | UC-04 | D-012 | G-02, G-03, G-06, C-05 |
| FR-14 | Duyệt danh mục sản phẩm, lọc giá / danh mục / chợ / ngày | UC-05 | — | G-04 |
| FR-15 | Chi tiết sản phẩm: giá, đơn vị, số lượng còn, Farmer | UC-05 | D-014 | G-05 |
| FR-16 | Tìm kiếm, **sắp xếp**, lọc chợ / **Farmer** / sản phẩm theo vị trí, danh mục, giá, ngày họp; kết quả trên bản đồ khi cần định vị | UC-04, 05, 29 | D-012 | G-01, G-02, G-04, G-13 |
| FR-17 | Giỏ hàng nhiều Farmer | UC-07 | D-004 | C-01 |
| FR-18 | Chọn ngày + khung pickup trong khung của Farmer | UC-07 | D-013 | C-02 |
| FR-19 | Đặt đơn đặt trước theo tồn kho khả dụng (N đơn độc lập) | UC-07 | D-004, D-005 | C-02, C-03 |
| FR-20 | Xem trạng thái đơn (placed → completed) | UC-08 | D-006 | C-04, C-05 |
| FR-21 | Sửa đơn trước cutoff | UC-08 | D-007 | C-06 |
| FR-22 | Hủy đơn trước cutoff | UC-08 | D-006 | C-05 |
| FR-23 | Lịch sử đơn + đặt lại nhanh | UC-09 | D-019 | C-04, C-05 |
| FR-24 | Yêu thích Farmer / sản phẩm + cảnh báo có hàng lại | UC-09 | D-019, D-010 | C-08, N-01 |
| FR-25 | Lưu chợ ưa thích + thông tin pickup kèm chỉ đường | UC-09 | D-019, D-012 | C-08, C-05 |
| FR-26 | Đánh giá Farmer và sản phẩm sau khi COMPLETED | UC-10 | D-016 | C-07 |
| FR-27 | Xem đánh giá của người khác trước khi đặt | UC-10 | — | G-05, G-06 |
| FR-28 | Thông báo email/in-app cho Customer: xác nhận đơn, sẵn sàng lấy (+ từ chối, hết hạn, hủy do Admin) | UC-12 | D-010, D-006 | N-01, C-09 |
| FR-29 | Trợ lý AI tìm hàng, giải đáp giờ chợ, khung pickup | UC-11 | D-011 | N-03 |
| FR-30 | Chia sẻ tài khoản gia đình | — | D-021 | G-07 (FAQ) |
| FR-31 | Quản lý hồ sơ cá nhân, đổi mật khẩu | UC-32 | — | C-10, C-11, F-08, F-11, A-12 |
| FR-32 | Dashboard Customer: đơn đang mở, lần nhận hàng sắp tới, lối tắt yêu thích | UC-28 | — | C-00 |

### 0.3 Farmer
| Mã FR | Yêu cầu | UC | Quyết định | Màn hình |
| :---: | :--- | :---: | :---: | :--- |
| FR-40 | Hồ sơ sạp: chợ tham gia, ngày hoạt động, vị trí (ghim, lat/lng) | UC-13 | D-012 | F-08 |
| FR-41 | Thêm/sửa/xem/xóa sản phẩm (tên, danh mục, giá, đơn vị, số lượng, mô tả, ảnh) | UC-15 | D-014, D-017 | F-04, F-05 |
| FR-42 | Mẫu tồn kho hàng tuần + điều chỉnh | UC-14 | D-008 | F-06 |
| FR-43 | Đánh dấu hết hàng / tạm ngừng bán | UC-15 | — | F-04 |
| FR-44 | Xem đơn đến, duyệt / từ chối, đánh dấu sẵn sàng (+ hoàn tất, không đến) | UC-17 | D-006 | F-02, F-03 |
| FR-45 | Thiết lập cutoff + quản lý khung pickup | UC-16 | D-007, D-013 | F-07 |
| FR-46 | Lịch sử bán, sản phẩm bán chạy, Tổng đơn, Đơn chờ, Doanh thu | UC-18 | D-006 | F-01, F-02 |
| FR-47 | Xem và phản hồi đánh giá | UC-19 | D-016 | F-09 |
| FR-48 | Farmer nhận thông báo: đơn mới, khách sửa (in-app); khách hủy đơn, đơn bị hủy do khách bị khóa (in-app + email, T5, T6, T13) | UC-31 | D-010, D-006 | N-01, F-10 |
| FR-49 | Xác nhận đơn hoàn tất / đánh dấu khách không đến (T10, T11) | UC-30 | D-006 | F-02, F-03 |

### 0.4 Admin
| Mã FR | Yêu cầu | UC | Quyết định | Màn hình |
| :---: | :--- | :---: | :---: | :--- |
| FR-50 | Dashboard riêng: tổng Farmer, Customer, chợ, đơn | UC-20 | — | A-01 |
| FR-51 | Xem / duyệt / từ chối / đình chỉ / khôi phục Farmer; đình chỉ kéo theo đơn mở → `DECLINED` (T3, T4, T12) | UC-21 | D-015, D-006 | A-02, A-03 |
| FR-52 | Xem / kích hoạt / khóa Customer; khóa kéo theo đơn mở → `CANCELLED` (T5, T6, T13) | UC-22 | D-015, D-006 | A-04 |
| FR-53 | Thêm / sửa / gỡ chợ kèm tọa độ bản đồ | UC-23 | D-012, D-017 | A-05, A-06 |
| FR-54 | Gỡ sản phẩm / đánh giá vi phạm | UC-25 | D-016, D-017 | A-08 |
| FR-55 | Báo cáo: tổng đơn, doanh thu theo chợ, Farmer tích cực | UC-26 | D-018 | A-09 |
| FR-56 | Quản lý danh mục sản phẩm gốc | UC-24 | — | A-07 |
| FR-57 | Đăng thông báo toàn sàn | UC-27 | D-010 | A-10, N-04 |
| FR-58 | Giám sát hệ thống (sơ đồ luồng trang 7: "Monitor System") | UC-33 | D-018 | A-11 |

### 0.4b Hệ thống
| Mã FR | Yêu cầu | UC | Quyết định | Màn hình |
| :---: | :--- | :---: | :---: | :--- |
| FR-59 | Đơn `PLACED` quá `pickup_start_at` tự chuyển `EXPIRED`, hoàn kho, báo khách | UC-34 | D-009 | Nhãn "Đã hết hạn" ở C-04, C-05; chỉ số F-01 |

### 0.5 Yêu cầu phi chức năng
Nguồn chuẩn: `MarketLink_requirement_analysis.md` Pass 2 §5 (NFR-01 → NFR-12). Các NFR tác động trực tiếp lên giao diện được hiện thực hóa tại: §1.5 (validate), §1.6 (3 trạng thái — NFR-04), §1.7 (mã lỗi — NFR-04, NFR-07), §1.8 (chống bấm đúp), CSS3 mobile-first 640 / 768 / 1024px (NFR-09, NFR-10), Accessibility (NFR-02).

---

## 1. QUY ƯỚC GIAO DIỆN DÙNG CHUNG

### 1.1 Layouts
| Layout | Dùng cho | Thành phần |
| :--- | :--- | :--- |
| `GuestLayout` | Trang công khai (`pages/guest/`) — Guest và mọi role đều xem được | Header: logo, ô tìm kiếm, menu (Chợ, Nông dân, Sản phẩm, Giới thiệu, Liên hệ); Guest thấy nút Đăng nhập / Đăng ký; Customer thấy thêm icon giỏ hàng, chuông, avatar menu. Banner thông báo toàn sàn. Footer. Nút chat AI nổi góc phải |
| `CustomerLayout` | Nhánh `/customer/*` | Cùng Header với `GuestLayout` + thanh điều hướng tài khoản: Tổng quan, Đơn hàng, Yêu thích, Thông báo, Hồ sơ |
| `AuthLayout` | Đăng nhập, đăng ký | Card giữa màn hình |
| `FarmerLayout` | Farmer | Sidebar: Tổng quan, Đơn hàng, Sản phẩm, Mẫu tồn kho tuần, Chợ & khung nhận hàng, Hồ sơ sạp, Đánh giá. Header: chuông, avatar. Banner "Tài khoản đang chờ duyệt" nếu `PENDING` |
| `AdminLayout` | Admin | Sidebar: Tổng quan, Nông dân, Khách hàng, Chợ, Danh mục, Kiểm duyệt, Báo cáo, Thông báo toàn sàn, Nhật ký hệ thống |

### 1.2 Huy hiệu trạng thái đơn hàng (8 trạng thái — D-006)
| Giá trị API | Nhãn hiển thị | Màu Badge |
| :--- | :--- | :---: |
| `PLACED` | Chờ duyệt | Vàng (warning) |
| `ACCEPTED` | Đã xác nhận | Xanh dương (info) |
| `READY_FOR_PICKUP` | Sẵn sàng nhận | Tím (primary) |
| `COMPLETED` | Hoàn tất | Xanh lá (success) |
| `CANCELLED` | Đã hủy | Xám (neutral) |
| `DECLINED` | Bị từ chối | Đỏ (danger) |
| `NO_SHOW` | Khách không đến | Cam |
| `EXPIRED` | Đã hết hạn | Xám nhạt |

Nhãn phụ phía Customer (D-009): đơn `PLACED` đã qua `pickup_start_at` nhưng chưa bị quét lười → hiển thị "Đã hết hạn" dựa trên trường `is_overdue` do serializer trả về.

### 1.3 Huy hiệu trạng thái khác
| Thực thể | Giá trị → Nhãn |
| :--- | :--- |
| Farmer (D-015) | `PENDING` Chờ duyệt · `APPROVED` Đã duyệt · `SUSPENDED` Đình chỉ · `REJECTED` Từ chối |
| Customer | `is_active=true` Hoạt động · `false` Đã khóa |
| Sản phẩm | Còn hàng · Hết hàng (`stock_quantity = 0`) · Tạm ngừng (`is_available=false`) · Bị Admin gỡ (`is_hidden_by_admin`) · Đã lưu trữ (`is_archived`) |
| Chợ | Hoạt động · Ngừng hoạt động (`is_active=false`) |
| Đánh giá | Hiển thị · Bị ẩn (`is_hidden_by_admin`) |

### 1.4 Định dạng dữ liệu
| Loại | Quy tắc | Ví dụ |
| :--- | :--- | :--- |
| Tiền | `formatCurrency` VND, không thập phân | `45.000 ₫` |
| Ngày | `dd/MM/yyyy` GMT+7 | `26/09/2026` |
| Ngày giờ | `HH:mm dd/MM/yyyy` | `07:30 26/09/2026` |
| Khung pickup | `Thứ 7, 26/09 · 07:00–10:00` | — |
| Đơn vị (D-014) | `KG` kg · `BUNCH` bó · `PIECE` quả/cái · `PACK` gói/hộp | `45.000 ₫ / kg` |
| Khoảng cách | 1 chữ số thập phân | `2,4 km` |
| Mã đơn | `#` + id | `#1024` |
| Đếm ngược cutoff | Còn < 24h thì hiện "Còn 5 giờ 12 phút để sửa/hủy" | — |

### 1.5 Quy tắc validate dùng chung (Zod phía FE, lặp lại ở Serializer phía BE)
| Trường | Quy tắc | Thông báo lỗi inline |
| :--- | :--- | :--- |
| Email | Định dạng email, ≤ 100 ký tự, chuẩn hóa `trim().toLowerCase()` | "Email không hợp lệ" |
| Số điện thoại VN | `^(0|\+84)(3|5|7|8|9)\d{8}$` | "Số điện thoại không hợp lệ" |
| Mật khẩu | ≥ 8 ký tự, có chữ và số | "Mật khẩu tối thiểu 8 ký tự, gồm chữ và số" |
| Xác nhận mật khẩu | Trùng mật khẩu | "Mật khẩu xác nhận không khớp" |
| Họ tên / Tên sạp | 2–100 ký tự | "Vui lòng nhập 2–100 ký tự" |
| Địa chỉ | 5–255 ký tự | "Vui lòng nhập địa chỉ đầy đủ" |
| Giá | Số nguyên ≥ 1.000, ≤ 100.000.000 | "Giá từ 1.000 ₫ trở lên" |
| Số lượng | Số nguyên ≥ 0 (tồn kho) / ≥ 1 (đặt hàng) | "Số lượng phải là số nguyên" |
| Ảnh | jpg/png/webp, ≤ 2MB | "Ảnh phải là JPG/PNG/WEBP, tối đa 2MB" |
| Vĩ độ / Kinh độ | −90..90 / −180..180, 6 chữ số thập phân | "Tọa độ không hợp lệ" |
| Giờ | `HH:mm`, giờ kết thúc > giờ bắt đầu | "Giờ kết thúc phải sau giờ bắt đầu" |
| Nhận xét / Lý do | Nhận xét ≤ 1.000 ký tự; lý do từ chối/đình chỉ 5–500 ký tự, bắt buộc | "Vui lòng nhập lý do" |

### 1.6 Ba trạng thái bắt buộc cho mọi danh sách
- **Loading**: `PageSkeleton` đúng hình dạng bảng/card.
- **Empty**: icon + câu hướng dẫn + nút hành động (ví dụ: "Chưa có sản phẩm nào" + nút "Thêm sản phẩm").
- **Error**: thông báo + nút "Thử lại" + "Mã sự cố: `<request_id>`".

### 1.7 Ánh xạ mã lỗi API → phản hồi UI
| HTTP / `code` | Cách hiển thị |
| :--- | :--- |
| 400 validation (`errors` theo field) | Lỗi đỏ dưới từng ô input |
| 400 `INSUFFICIENT_STOCK` | Tô đỏ các dòng sản phẩm thiếu trong giỏ/đơn, hiện "Chỉ còn X" |
| 400 `INVALID_STATUS_TRANSITION` | Toast lỗi + tự refetch đơn |
| 401 | Interceptor refresh token; hết hạn thì về `/login?next=...` |
| 403 | Trang `/403` nếu điều hướng; toast nếu là thao tác |
| 404 | Trang `/404` |
| 409 `RESOURCE_MODIFIED` | Dialog "Đơn hàng vừa được cập nhật bởi người khác" + nút "Tải lại" (refetch lấy `version` mới) |
| 422 `OPEN_ORDER_LIMIT_EXCEEDED` | Dialog giải thích giới hạn (D-005) + link "Xem đơn đang mở" |
| 422 `FAILED_PRECONDITION` | Toast với `message` từ server (ví dụ: đã quá giờ cutoff) |
| 428 | Lỗi lập trình: log console dev, toast chung |
| 429 | Toast "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" |
| 5xx | Toast chung + mã sự cố |

### 1.8 Quy tắc tương tác
- Nút submit: `disabled` + spinner khi đang gửi (chống bấm đúp).
- Mọi hành động không hoàn tác được hoặc đổi trạng thái đơn đều qua `ConfirmDialog` (tiêu đề, hệ quả, nút xác nhận màu theo mức độ).
- Mọi thao tác đổi trạng thái / sửa đơn gửi header `If-Match: <version>` lấy từ dữ liệu đang hiển thị (D-006).
- Checkout gửi header `Idempotency-Key` (UUIDv4 sinh một lần khi mở màn hình Checkout).
- Thành công: toast xanh; riêng checkout có màn hình Success riêng.
- Bảng dữ liệu: dưới 768px chuyển thành danh sách card (media query trong `Table.module.css`).

---

## 2. SƠ ĐỒ TRANG & ĐỊNH TUYẾN (SITEMAP & ROUTES)

### 2.0 Quy ước đặt tên định tuyến theo tác nhân
| Tác nhân | Tiền tố route FE | Thư mục `src/pages/` | Layout | Guard | Tiền tố API tương ứng (Pass 4) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Guest (chưa đăng nhập) | Không tiền tố (`/`, `/markets`...) | `guest/` | `GuestLayout` / `AuthLayout` | Không (trang xác thực dùng `GuestOnlyRoute`) | `/api/public/` |
| Customer | `/customer/...` | `customer/` | `CustomerLayout` | `RoleRoute role="CUSTOMER"` | `/api/customer/` |
| Farmer | `/farmer/...` | `farmer/` | `FarmerLayout` | `RoleRoute role="FARMER"` | `/api/farmer/` |
| Admin | `/admin/...` | `admin/` | `AdminLayout` | `RoleRoute role="ADMIN"` | `/api/admin/` |

- **Mã màn hình** dùng chữ cái đầu tác nhân: `G-` Guest, `C-` Customer, `F-` Farmer, `A-` Admin. `N-` chỉ dành cho component nhúng không có route (chuông, chat, banner).
- **Trang công khai không mang tiền tố `/guest/`**: Customer, Farmer, Admin đã đăng nhập vẫn xem cùng các trang này; URL công khai ngắn gọn để chia sẻ. "Guest" là tên tác nhân và tên thư mục, không phải tên route.
- **Không có thư mục `shared/`**: trang hồ sơ, đổi mật khẩu, thông báo nằm trong nhánh của từng role; phần giao diện dùng chung đặt ở `src/features/` (ví dụ `features/auth/ChangePasswordForm.jsx`, `features/notifications/NotificationList.jsx`).
- **API công khai giữ tên `/api/public/`** (theo playbook): endpoint `AllowAny` được cả Guest lẫn các role đã đăng nhập gọi, nên đặt theo quyền truy cập thay vì theo tác nhân.

### 2.1 Bảng định tuyến toàn hệ thống

#### Guest — `pages/guest/`
| Mã | Route | File | Guard | FR |
| :---: | :--- | :--- | :--- | :--- |
| G-01 | `/` | `guest/HomePage.jsx` | — | FR-16 |
| G-02 | `/markets` | `guest/MarketsPage.jsx` | — | FR-10, 13, 16 |
| G-03 | `/markets/:id` | `guest/MarketDetailPage.jsx` | — | FR-11, 13 |
| G-04 | `/products` | `guest/ProductCatalogPage.jsx` | — | FR-14, 16 |
| G-05 | `/products/:id` | `guest/ProductDetailPage.jsx` | — | FR-15, 27 |
| G-06 | `/farmers/:id` | `guest/FarmerProfilePage.jsx` | — | FR-12, 13, 27 |
| G-13 | `/farmers` | `guest/FarmersPage.jsx` | — | FR-12, 16 |
| G-07 | `/about` | `guest/AboutPage.jsx` | — | FR-05, 30 |
| G-08 | `/contact` | `guest/ContactPage.jsx` | — | FR-06 |
| G-09 | `/login` | `guest/LoginPage.jsx` | `GuestOnlyRoute` | FR-03 |
| G-10 | `/register` | `guest/RegisterCustomerPage.jsx` | `GuestOnlyRoute` | FR-01 |
| G-11 | `/register/farmer` | `guest/RegisterFarmerPage.jsx` | `GuestOnlyRoute` | FR-02 |
| G-12 | `/403`, `*` | `guest/ForbiddenPage.jsx`, `guest/NotFoundPage.jsx` | — | FR-04 |

#### Customer — `pages/customer/`
| Mã | Route | File | Guard | FR |
| :---: | :--- | :--- | :--- | :--- |
| C-00 | `/customer` | `customer/CustomerDashboard.jsx` | `CUSTOMER` | FR-03, 32 |
| C-01 | `/customer/cart` | `customer/CartPage.jsx` | `CUSTOMER` | FR-17 |
| C-02 | `/customer/checkout` | `customer/CheckoutPage.jsx` | `CUSTOMER` | FR-18, 19 |
| C-03 | `/customer/checkout/success` | `customer/CheckoutSuccessPage.jsx` | `CUSTOMER` | FR-19 |
| C-04 | `/customer/orders` | `customer/OrdersPage.jsx` | `CUSTOMER` | FR-20, 23 |
| C-05 | `/customer/orders/:id` | `customer/OrderDetailPage.jsx` | `CUSTOMER` (chính chủ) | FR-20, 22, 23, 25 |
| C-06 | `/customer/orders/:id/edit` | `customer/EditOrderPage.jsx` | `CUSTOMER` (chính chủ) | FR-21 |
| C-07 | `/customer/orders/:id/review` | `customer/ReviewOrderPage.jsx` | `CUSTOMER` (chính chủ) | FR-26 |
| C-08 | `/customer/favorites` | `customer/FavoritesPage.jsx` | `CUSTOMER` | FR-24, 25 |
| C-09 | `/customer/notifications` | `customer/NotificationsPage.jsx` | `CUSTOMER` | FR-24, 28 |
| C-10 | `/customer/profile` | `customer/ProfilePage.jsx` | `CUSTOMER` | FR-31 |
| C-11 | `/customer/password` | `customer/ChangePasswordPage.jsx` | `CUSTOMER` | FR-31 |

#### Farmer — `pages/farmer/`
| Mã | Route | File | Guard | FR |
| :---: | :--- | :--- | :--- | :--- |
| F-01 | `/farmer` | `farmer/FarmerDashboard.jsx` | `FARMER` | FR-03, 46 |
| F-02 | `/farmer/orders` | `farmer/OrdersPage.jsx` | `FARMER` | FR-44, 46 |
| F-03 | `/farmer/orders/:id` | `farmer/OrderDetailPage.jsx` | `FARMER` (chủ đơn) | FR-44 |
| F-04 | `/farmer/products` | `farmer/ProductListPage.jsx` | `FARMER` | FR-41, 43 |
| F-05 | `/farmer/products/new`, `/farmer/products/:id/edit` | `farmer/ProductFormPage.jsx` | `FARMER` + `APPROVED` | FR-41 |
| F-06 | `/farmer/weekly-stock` | `farmer/WeeklyStockPage.jsx` | `FARMER` + `APPROVED` | FR-42 |
| F-07 | `/farmer/pickup-settings` | `farmer/PickupSettingsPage.jsx` | `FARMER` | FR-40, 45 |
| F-08 | `/farmer/profile` | `farmer/ProfilePage.jsx` | `FARMER` | FR-31, 40 |
| F-09 | `/farmer/reviews` | `farmer/ReviewsPage.jsx` | `FARMER` | FR-47 |
| F-10 | `/farmer/notifications` | `farmer/NotificationsPage.jsx` | `FARMER` | FR-48 |
| F-11 | `/farmer/password` | `farmer/ChangePasswordPage.jsx` | `FARMER` | FR-31 |

#### Admin — `pages/admin/`
| Mã | Route | File | Guard | FR |
| :---: | :--- | :--- | :--- | :--- |
| A-01 | `/admin` | `admin/AdminDashboard.jsx` | `ADMIN` | FR-03, 50 |
| A-02 | `/admin/farmers` | `admin/FarmersPage.jsx` | `ADMIN` | FR-51 |
| A-03 | `/admin/farmers/:id` | `admin/FarmerDetailPage.jsx` | `ADMIN` | FR-51 |
| A-04 | `/admin/customers` | `admin/CustomersPage.jsx` | `ADMIN` | FR-52 |
| A-05 | `/admin/markets` | `admin/MarketListPage.jsx` | `ADMIN` | FR-53 |
| A-06 | `/admin/markets/new`, `/admin/markets/:id/edit` | `admin/MarketFormPage.jsx` | `ADMIN` | FR-53 |
| A-07 | `/admin/categories` | `admin/CategoriesPage.jsx` | `ADMIN` | FR-56 |
| A-08 | `/admin/moderation` | `admin/ModerationPage.jsx` | `ADMIN` | FR-54 |
| A-09 | `/admin/reports` | `admin/ReportsPage.jsx` | `ADMIN` | FR-55 |
| A-10 | `/admin/announcements` | `admin/AnnouncementsPage.jsx` | `ADMIN` | FR-57 |
| A-11 | `/admin/audit-logs` | `admin/AuditLogsPage.jsx` | `ADMIN` | FR-58 |
| A-12 | `/admin/password` | `admin/ChangePasswordPage.jsx` | `ADMIN` | FR-31 |

#### Component nhúng (không có route)
| Mã | Vị trí | File | Hiển thị cho | FR |
| :---: | :--- | :--- | :--- | :--- |
| N-01 | Chuông trên Header | `features/notifications/NotificationBell.jsx` | Customer, Farmer | FR-24, 28, 48 |
| N-03 | Widget chat nổi | `features/chat/ChatWidget.jsx` | Guest, Customer (tool đơn hàng cần đăng nhập) | FR-29 |
| N-04 | Banner thông báo toàn sàn | `features/announcements/AnnouncementBanner.jsx` | Theo đối tượng của thông báo | FR-57 |

### 2.2 Điều hướng sau đăng nhập & khi sai quyền
| Tình huống | Hành vi |
| :--- | :--- |
| `CUSTOMER` đăng nhập | Về `next` nếu có (chỉ chấp nhận route công khai hoặc `/customer/*`), ngược lại `/customer` |
| `FARMER` đăng nhập | `/farmer`. `PENDING`/`REJECTED`: banner trạng thái, khóa tạo sản phẩm. `SUSPENDED`: banner đỏ, chỉ xem |
| `ADMIN` đăng nhập | `/admin` |
| Guest mở route `/customer/*`, `/farmer/*`, `/admin/*` | Chuyển `/login?next=<route>` |
| Đã đăng nhập mở nhánh của role khác | Trang `/403` |
| Đã đăng nhập mở `/login`, `/register*` | Chuyển về dashboard của role mình |

---

## 3. ĐẶC TẢ MÀN HÌNH — GUEST / TRANG CÔNG KHAI (`pages/guest/`)

### G-01 · Trang chủ
- **Mục đích**: Điểm vào tìm kiếm nhanh.
- **Khối nội dung**:
  1. Hero: ô tìm kiếm lớn (placeholder "Tìm rau, trái cây, chợ, nông dân...") → điều hướng `/products?q=` hoặc tab kết quả chợ/Farmer.
  2. "Chợ gần bạn": nút "Dùng vị trí của tôi" (Geolocation) → 4 card chợ gần nhất (`name`, `address`, `distance_km`, ngày họp hôm nay có/không).
  3. "Danh mục": lưới icon danh mục (từ master categories).
  4. "Hàng mới trong tuần": 8 card sản phẩm mới cập nhật.
  5. Banner thông báo toàn sàn (N-04).
- **Dữ liệu cần**: markets (gần nhất), categories, products (mới nhất, 8).

### G-02 · Danh sách chợ + bản đồ
- **Bố cục**: Desktop chia 2 cột (danh sách 40% | bản đồ 60%); mobile có tab "Danh sách / Bản đồ".
- **Bộ lọc**: từ khóa (tên/địa chỉ), ngày họp (Thứ 2 → Chủ nhật, mặc định "Tất cả"), nút "Gần tôi" (bật sắp xếp theo `distance_km`).
- **Card chợ**: tên, địa chỉ, ngày họp (chip), giờ mở–đóng, số Farmer đang hoạt động, khoảng cách (nếu có), nút ♥ lưu chợ (Customer), nút "Chỉ đường" (Google Maps link).
- **Bản đồ**: marker mỗi chợ; click marker → popup tên + nút "Xem chợ"; hover card → highlight marker.
- **Phân trang**: 20 / trang.

### G-03 · Chi tiết chợ
- **Header**: tên, địa chỉ, ngày họp, giờ mở–đóng, ♥ lưu chợ, nút "Chỉ đường".
- **Bản đồ**: marker chợ, cao 320px.
- **Danh sách Farmer tại chợ**: lọc theo ngày; card gồm ảnh sạp, tên sạp, `stall_label` (ví dụ "Sạp B12"), điểm đánh giá TB + số đánh giá, ngày có mặt tại chợ này, số sản phẩm còn hàng → click tới G-06.
- **Chỉ hiển thị Farmer `APPROVED`** (D-015).

### G-04 · Danh mục sản phẩm
- **Bộ lọc (thanh bên, drawer trên mobile)**:
  | Bộ lọc | Kiểu | Giá trị |
  | :--- | :--- | :--- |
  | Từ khóa `q` | Text, debounce 400ms | — |
  | Danh mục | Multi-select checkbox | Master categories |
  | Chợ | Select | Danh sách chợ hoạt động |
  | Ngày | Select | Thứ 2 → Chủ nhật (lọc Farmer có khung pickup ngày đó) |
  | Giá | Min / Max (số) | — |
  | Chỉ còn hàng | Toggle | Mặc định bật |
  | Sắp xếp | Select | Mới nhất · Giá tăng · Giá giảm · Đánh giá cao |
- **Đồng bộ URL**: mọi filter nằm trên query string (chia sẻ link được).
- **Card sản phẩm**: ảnh, tên, giá / đơn vị, tên sạp, badge còn hàng / hết hàng / tạm ngừng, sao TB, nút "+ Giỏ" (disabled khi hết hàng hoặc tạm ngừng; Guest bấm → modal "Đăng nhập để đặt hàng" rồi quay lại trang cũ), ♥ yêu thích.
- **Không hiển thị**: sản phẩm `is_archived`, `is_hidden_by_admin`, Farmer không `APPROVED`.

### G-05 · Chi tiết sản phẩm
- **Thông tin**: ảnh lớn, tên, danh mục, giá / đơn vị, "Còn X kg", mô tả, Farmer (link G-06), các chợ Farmer bán + ngày.
- **Hành động**: ô số lượng (stepper 1..`stock_quantity`), "Thêm vào giỏ", ♥ yêu thích (đang hết hàng thì ghi chú "Bạn sẽ được báo khi có hàng lại").
- **Đánh giá sản phẩm**: điểm TB, phân bố 5 → 1 sao, danh sách review (tên khách rút gọn, sao, nhận xét, ngày, phản hồi của Farmer nếu có), phân trang 10.

### G-06 · Hồ sơ Farmer (công khai)
- **Header**: ảnh sạp, tên sạp, người liên hệ, điểm TB, ♥ yêu thích Farmer.
- **Tab "Hàng trong tuần"**: lưới sản phẩm còn bán của Farmer (card như G-04).
- **Tab "Chợ & giờ nhận hàng"**: bảng mỗi chợ tham gia: tên chợ, `stall_label`, ngày + khung pickup, nút "Chỉ đường"; bản đồ marker các chợ + vị trí sạp (nếu Farmer có tọa độ).
- **Tab "Đánh giá"**: review về Farmer (D-016) + phản hồi.
- **Ghi chú**: hiển thị "Đặt trước tối thiểu `order_cutoff_hours` giờ trước giờ nhận".

### G-13 · Danh bạ nông dân (FR-12, FR-16)
- **Mục đích**: Đáp ứng câu SRS "search markets, **Farmers**, or products"; trước đây chỉ tìm được Farmer gián tiếp qua chợ.
- **Bố cục**: như G-02 (danh sách | bản đồ vị trí sạp có tọa độ).
- **Bộ lọc**: từ khóa (tên sạp), chợ, ngày có mặt (Thứ 2 → CN), danh mục hàng đang bán, "Gần tôi" (khoảng cách tới chợ gần nhất của Farmer).
- **Sắp xếp**: Đánh giá cao · Nhiều sản phẩm còn hàng · Gần nhất · Tên A → Z.
- **Card**: ảnh sạp, tên sạp, sao TB + số đánh giá, chợ + `stall_label`, ngày có mặt (chip), số sản phẩm còn hàng, ♥ yêu thích → click tới G-06.
- **Chỉ hiển thị Farmer `APPROVED`**. Phân trang 20.

### G-07 · Giới thiệu (About Us)
- Khối nội dung tĩnh: sứ mệnh nền tảng, cách hoạt động (3 bước: Tìm → Đặt trước → Nhận tại chợ), thành viên đội (ảnh, tên, vai trò).
- **FAQ (accordion)**: thanh toán khi nhận hàng; không giao tận nhà; cutoff là gì; **dùng chung tài khoản gia đình** (D-021: đăng nhập trên nhiều thiết bị, giỏ hàng riêng từng máy, lịch sử đơn và yêu thích dùng chung).

### G-08 · Liên hệ (Contact Us)
- Thông tin tĩnh: địa chỉ đội, email, SĐT, giờ làm việc.
- Iframe Google Maps `https://www.google.com/maps?q=<lat>,<lng>&output=embed` (D-012), cao 360px, responsive.
- Không có form gửi liên hệ (SRS chỉ yêu cầu thông tin tĩnh).

### G-09 · Đăng nhập
| Trường | Kiểu | Bắt buộc | Validate |
| :--- | :--- | :---: | :--- |
| Email | email | * | §1.5 |
| Mật khẩu | password (nút hiện/ẩn) | * | Không rỗng |
- Lỗi 401 hiển thị trên form: "Email hoặc mật khẩu không đúng" (không kích hoạt refresh).
- Tài khoản bị khóa: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên."
- Link: "Đăng ký khách hàng", "Đăng ký bán hàng (Nông dân)".

### G-10 · Đăng ký Customer (FR-01)
| Trường | Kiểu | Bắt buộc | Validate |
| :--- | :--- | :---: | :--- |
| Họ và tên | text | * | 2–100 ký tự |
| Số điện thoại | tel | * | Regex VN |
| Email | email | * | Duy nhất (lỗi server `EMAIL_EXISTS` hiện dưới ô) |
| Địa chỉ | textarea | * | 5–255 ký tự |
| Mật khẩu | password | * | ≥ 8, chữ + số |
| Xác nhận mật khẩu | password | * | Trùng |
- Thành công → tự đăng nhập → quay lại `next` hoặc `/`.

### G-11 · Đăng ký Farmer (FR-02)
| Trường | Kiểu | Bắt buộc | Validate |
| :--- | :--- | :---: | :--- |
| Tên sạp / cơ sở | text | * | 2–100 ký tự |
| Người liên hệ | text | * | 2–100 ký tự |
| Số điện thoại | tel | * | Regex VN |
| Email | email | * | Duy nhất |
| Địa chỉ | textarea | * | 5–255 ký tự |
| Mật khẩu / Xác nhận | password | * | Như G-10 |
- Thành công → Success screen: "Đăng ký thành công. Tài khoản đang chờ quản trị viên duyệt. Trong lúc chờ, bạn có thể hoàn thiện hồ sơ sạp." + nút "Vào trang quản lý".

---

## 4. ĐẶC TẢ MÀN HÌNH — PHÂN HỆ KHÁCH HÀNG (`pages/customer/`)

### C-00 · Tổng quan Customer (FR-03, FR-32)
- **Mục đích**: SRS yêu cầu Customer "securely access their dashboard" và §1.4 nêu "interactive dashboards for both Farmers and customers".
- **Thẻ số liệu**: Đơn đang mở · Sẵn sàng nhận (nổi bật nếu > 0) · Đơn hoàn tất · Chưa đánh giá.
- **Lần nhận hàng sắp tới**: tối đa 3 đơn gần giờ nhận nhất — Farmer, chợ + `stall_label`, ngày + khung, badge, nút "Chỉ đường", đếm ngược cutoff.
- **Lối tắt**: Nông dân yêu thích (4 card), Chợ đã lưu (chip + chỉ đường), "Đặt lại đơn gần nhất".
- **Thông báo mới nhất**: 5 dòng, link C-09.
- **Rỗng lần đầu**: Empty state "Bạn chưa có đơn nào" + nút "Khám phá sản phẩm".

### C-01 · Giỏ hàng (D-004: Zustand persist `localStorage`)
- **Cấu trúc hiển thị**: gom nhóm theo Farmer. Mỗi nhóm: tên sạp + danh sách dòng.
- **Dòng giỏ**: ảnh, tên, giá hiện tại / đơn vị, stepper số lượng (max = tồn kho lấy lại khi mở trang), thành tiền, nút xóa.
- **Làm mới khi mở trang**: gọi API lấy giá + tồn kho hiện tại cho mọi `product_id` trong giỏ. Món không còn bán → đánh dấu xám "Ngừng bán" + nút xóa; món vượt tồn kho → cảnh báo "Chỉ còn X".
- **Tổng kết**: tạm tính từng nhóm, tổng cộng, dòng chú thích "Thanh toán tiền mặt khi nhận hàng tại chợ".
- **Quyền truy cập**: chỉ `CUSTOMER` (route `/customer/cart`). Farmer/Admin không thấy icon giỏ hàng; Guest được mời đăng nhập ngay khi bấm "+ Giỏ".
- **CTA**: "Tiến hành đặt hàng" → C-02.
- **Dữ liệu giỏ lưu client**: `{ product_id, farmer_id, quantity, name, unit, price_snapshot_for_display }` (giá chỉ để hiển thị, server luôn lấy giá DB).

### C-02 · Đặt hàng (Checkout)
- **Mỗi nhóm Farmer là một khối** gồm:
  | Trường | Kiểu | Bắt buộc | Quy tắc |
  | :--- | :--- | :---: | :--- |
  | Chợ nhận hàng | Select | * | Các chợ Farmer tham gia có khung pickup |
  | Ngày nhận | Date chips | * | Chỉ những ngày khớp `day_of_week` của khung, trong `BOOKING_HORIZON_DAYS` ngày tới (D-013) |
  | Khung giờ | Radio | * | Các `pickup_slots` của ngày đã chọn; khung đã qua cutoff hiện disabled kèm tooltip "Đã quá giờ đặt trước" |
  | Ghi chú cho Farmer | textarea | — | ≤ 300 ký tự |
- **Hiển thị sau khi chọn khung**: "Hạn sửa/hủy: `cutoff_at`", bản đồ nhỏ vị trí chợ + `stall_label`.
- **Tóm tắt bên phải**: danh sách nhóm, tổng tiền, "Bạn sẽ tạo N đơn hàng riêng cho N nông dân".
- **CTA**: "Xác nhận đặt N đơn" → ConfirmDialog tóm tắt → `POST` một lần (D-004) với `Idempotency-Key`.
- **Xử lý lỗi**: `INSUFFICIENT_STOCK` → quay về từng dòng thiếu; `OPEN_ORDER_LIMIT_EXCEEDED` → dialog (§1.7); slot hết hạn → yêu cầu chọn lại.

### C-03 · Đặt hàng thành công
- Icon ✓, "Đã đặt N đơn hàng thành công".
- Danh sách đơn vừa tạo: mã đơn, Farmer, chợ, ngày + khung, tổng tiền, badge `PLACED`.
- Ghi chú: "Nông dân sẽ xác nhận đơn. Bạn sẽ nhận thông báo khi đơn được xác nhận và khi sẵn sàng nhận."
- CTA: "Xem đơn của tôi", "Tiếp tục mua sắm". Giỏ hàng được xóa sau khi tạo thành công.

### C-04 · Đơn hàng của tôi
- **Tabs**: "Đang mở" (`PLACED`, `ACCEPTED`, `READY_FOR_PICKUP`) · "Lịch sử" (5 trạng thái kết thúc).
- **Bộ lọc**: trạng thái (multi), khoảng ngày nhận, Farmer.
- **Cột bảng**: Mã đơn · Nông dân · Chợ · Ngày + khung nhận · Số món · Tổng tiền · Trạng thái (badge) · Hạn sửa/hủy (đếm ngược, chỉ đơn mở) · Hành động.
- **Hành động nhanh trên dòng**: "Xem"; "Đặt lại" (ở tab Lịch sử); "Đánh giá" (khi `COMPLETED` và còn mục chưa đánh giá).
- Sắp xếp mặc định: ngày nhận gần nhất lên đầu (tab Đang mở); ngày đặt mới nhất (tab Lịch sử).

### C-05 · Chi tiết đơn (Customer)
- **Header**: mã đơn, badge, ngày đặt, "Hạn sửa/hủy" (đếm ngược).
- **Khối nhận hàng**: chợ, địa chỉ, `stall_label`, ngày + khung, bản đồ marker chợ, nút "Chỉ đường" (FR-25).
- **Bảng món**: tên, đơn giá (snapshot), số lượng, đơn vị, thành tiền; tổng cộng; chú thích "Thanh toán khi nhận".
- **Timeline (Audit Trail)**: mỗi bước: trạng thái, thời gian, người thực hiện (Bạn / Nông dân / Hệ thống), lý do (khi từ chối / hệ thống tự hủy / tóm tắt sửa đơn).
- **Lý do từ chối** (`DECLINED`): khung đỏ nổi bật.
- **Nút hành động theo trạng thái**: xem ma trận §7.1.
- **Dialog hủy đơn**: "Hủy đơn #1024? Hàng sẽ được trả lại cho nông dân. Không thể hoàn tác." → nút đỏ "Hủy đơn".
- **Đặt lại** (D-019): nạp món vào giỏ theo giá hiện tại; toast liệt kê món bị bỏ qua (hết hàng / ngừng bán); chuyển tới C-01.

### C-06 · Sửa đơn (D-007)
- **Điều kiện vào trang**: đơn `PLACED`/`ACCEPTED` và `now < cutoff_at`; ngược lại chuyển về C-05 kèm toast.
- **Cảnh báo đầu trang** (khi đơn đang `ACCEPTED`): "Đơn đã được nông dân xác nhận. Sau khi sửa, đơn sẽ quay về trạng thái Chờ duyệt."
- **Chỉnh sửa**:
  | Thao tác | Quy tắc |
  | :--- | :--- |
  | Đổi số lượng từng món | Stepper 1..(tồn kho hiện tại + số đang giữ của chính món đó trong đơn) |
  | Xóa món | Cho phép khi còn ≥ 1 món; xóa món cuối → nút bị khóa, gợi ý "Dùng Hủy đơn" |
  | Thêm món | Modal chọn sản phẩm **cùng Farmer**, còn hàng |
  | Đổi khung nhận | Chọn chợ / ngày / khung của cùng Farmer; khung mới phải còn trước cutoff |
- **Tóm tắt thay đổi** trước khi lưu: "Cà chua 5 → 8 kg; thêm Rau muống 2 bó; tổng 120.000 → 185.000 ₫".
- **CTA**: "Lưu thay đổi" (gửi `If-Match`), "Hủy bỏ". 409 → dialog tải lại.

### C-07 · Đánh giá đơn hàng (D-016)
- Chỉ mở khi đơn `COMPLETED`.
- **Khối đánh giá Nông dân** (1 lần / đơn): sao 1–5 *, nhận xét (≤ 1.000).
- **Khối đánh giá từng sản phẩm** (1 lần / món): mỗi món có sao 1–5, nhận xét. Món đã đánh giá hiển thị readonly.
- Có thể gửi từng khối riêng; khối đã gửi chuyển readonly.

### C-08 · Yêu thích (D-019)
- **Tabs**: Nông dân · Sản phẩm · Chợ.
- **Nông dân**: card sạp, sao TB, số sản phẩm còn hàng, nút bỏ ♥.
- **Sản phẩm**: card sản phẩm, trạng thái tồn kho, "+ Giỏ" (nếu còn), nhãn "Sẽ báo khi có hàng lại" (nếu hết), bỏ ♥.
- **Chợ**: card chợ, ngày họp, nút "Chỉ đường", bỏ ♥.
- **Nút ♥ toàn hệ thống** (G-02 → G-06, G-13): optimistic toggle; Guest bấm → modal "Đăng nhập để lưu yêu thích".

---

## 5. ĐẶC TẢ MÀN HÌNH — PHÂN HỆ NÔNG DÂN (`pages/farmer/`)

### F-01 · Tổng quan Farmer (FR-46)
- **Khi mở trang**: backend chạy quét lười `expire_overdue_orders` (D-009) trước khi trả số liệu.
- **Bộ lọc thời gian**: Hôm nay · 7 ngày · 30 ngày · Tùy chọn (từ–đến).
- **Thẻ KPI**:
  | Thẻ | Nguồn |
  | :--- | :--- |
  | Tổng đơn | Mọi đơn trong khoảng |
  | Chờ duyệt | `PLACED` (click → F-02 lọc sẵn) |
  | Đang xử lý | `ACCEPTED` + `READY_FOR_PICKUP` |
  | Doanh thu | Tổng tiền đơn `COMPLETED` |
- **Biểu đồ**: doanh thu theo ngày (cột, Recharts).
- **Bảng "Sản phẩm bán chạy"**: top 5 theo số lượng bán (đơn `COMPLETED`): tên, số lượng, doanh thu.
- **Cảnh báo**: "Có X đơn đã qua giờ nhận nhưng chưa đóng" (đơn `ACCEPTED`/`READY` đã qua `pickup_end_at`) → link F-02.
- **Đơn sắp tới**: 5 đơn gần giờ nhận nhất.

### F-02 · Đơn hàng Farmer (FR-44, FR-46)
- **Tabs**: Chờ duyệt · Đã xác nhận · Sẵn sàng · Lịch sử (kết thúc).
- **Bộ lọc**: ngày nhận (khoảng), chợ, trạng thái (tab Lịch sử), tìm theo mã đơn / tên khách.
- **Cột bảng**: Mã đơn · Khách hàng (tên, SĐT) · Chợ · Ngày + khung nhận · Số món · Tổng tiền · Trạng thái · Cutoff · Hành động.
- **Hành động trên dòng**: nút theo ma trận §7.1 (Duyệt / Từ chối / Sẵn sàng / Hoàn tất / Không đến).
- **Chế độ "Danh sách soạn hàng"** (tab Đã xác nhận): gom tổng số lượng từng sản phẩm cho một ngày + chợ ("Cà chua: 23 kg trên 6 đơn") giúp Farmer chuẩn bị. *(Dữ liệu suy ra từ đơn, không phát sinh bảng mới.)*
- **Phân trang**: 20.

### F-03 · Chi tiết đơn (Farmer)
- Như C-05 nhưng hiển thị thông tin khách (tên, SĐT, email), ghi chú của khách.
- Timeline có dòng "Khách sửa: ..." (T7) để Farmer thấy thay đổi.
- **Dialog Từ chối** (T3/T4): textarea "Lý do từ chối" * (5–500 ký tự) + gợi ý nhanh (chip: "Hết hàng", "Không kịp chuẩn bị", "Đơn khả nghi"). Nút đỏ "Từ chối đơn".
- **Dialog Sẵn sàng** (T9): "Xác nhận đã soạn xong đơn #1024? Khách sẽ nhận thông báo." Nút bị khóa trước `cutoff_at` kèm tooltip "Chỉ được đánh dấu sau HH:mm dd/MM".
- **Dialog Hoàn tất** (T10): "Khách đã nhận hàng và thanh toán X ₫?"
- **Dialog Không đến** (T11): chỉ bật sau `pickup_end_at`; "Hàng sẽ không được hoàn vào kho trực tuyến."

### F-04 · Sản phẩm của tôi (FR-41, FR-43)
- **Thanh công cụ**: tìm kiếm, lọc danh mục, lọc trạng thái (Còn hàng / Hết hàng / Tạm ngừng / Bị gỡ / Đã lưu trữ), nút "+ Thêm sản phẩm" (khóa nếu Farmer chưa `APPROVED`, tooltip giải thích).
- **Cột bảng**: Ảnh · Tên · Danh mục · Giá / đơn vị · Tồn kho (sửa nhanh tại chỗ) · Số lượng mặc định tuần · Trạng thái · Hành động.
- **Hành động**:
  | Nút | Hiệu ứng | Xác nhận |
  | :--- | :--- | :--- |
  | Sửa | Mở F-05 | — |
  | Đánh dấu hết hàng | `stock_quantity = 0` | ConfirmDialog |
  | Tạm ngừng / Mở bán lại | Toggle `is_available` | — |
  | Lưu trữ (xóa) | `is_archived = true` (D-017) | ConfirmDialog đỏ: "Sản phẩm sẽ bị ẩn khỏi cửa hàng. Đơn đã đặt không bị ảnh hưởng." |
- **Sản phẩm bị Admin gỡ**: dòng có nhãn đỏ + lý do; không mở bán lại được.
- **Sửa tồn kho nhanh**: tăng từ 0 lên > 0 sẽ kích hoạt restock alert (hiển thị toast "Đã báo cho X khách yêu thích sản phẩm này").

### F-05 · Form sản phẩm (Thêm / Sửa)
| Trường | Kiểu | Bắt buộc | Validate |
| :--- | :--- | :---: | :--- |
| Tên sản phẩm | text | * | 2–100 ký tự |
| Danh mục | Select (master, chỉ danh mục hoạt động) | * | — |
| Giá (₫) | number | * | Số nguyên 1.000–100.000.000 |
| Đơn vị tính | Select `KG / BUNCH / PIECE / PACK` | * | D-014 |
| Số lượng tồn kho | number | * | Số nguyên ≥ 0 |
| Số lượng mặc định hàng tuần | number | — | Số nguyên ≥ 0; để trống = không thuộc mẫu tuần |
| Mô tả | textarea | — | ≤ 1.000 ký tự |
| Ảnh | file + preview | — | jpg/png/webp ≤ 2MB |
| Đang mở bán | switch | — | Mặc định bật |
- Ghi chú dưới ô Giá khi sửa: "Giá mới chỉ áp dụng cho đơn đặt sau thời điểm lưu."
- CTA: "Lưu sản phẩm", "Hủy".

### F-06 · Mẫu tồn kho hàng tuần (D-008)
- **Bảng**: Sản phẩm · Tồn kho hiện tại · Đang giữ bởi đơn mở · Số lượng mặc định (sửa tại chỗ, lưu từng dòng) · Trạng thái bán.
- **Nút chính "Áp dụng cho tuần này"** → Dialog xem trước:
  - Bảng: Sản phẩm · Mẫu · Đang giữ · Tồn kho mới (`max(mẫu − đang giữ, 0)`), ví dụ "Cà chua: 20 − 5 = 15".
  - Ghi chú: sản phẩm đang "Tạm ngừng" vẫn được cập nhật số lượng nhưng giữ nguyên cờ tạm ngừng.
  - Khối cảnh báo: danh sách đơn `ACCEPTED`/`READY_FOR_PICKUP` đã qua `pickup_end_at` chưa đóng, mỗi dòng có nút nhanh "Hoàn tất" / "Không đến".
  - CTA: "Xác nhận áp dụng".
- **Sau khi áp dụng**: toast "Đã cập nhật tồn kho X sản phẩm".

### F-07 · Chợ & khung nhận hàng (FR-40, FR-45)
- **Khối "Cài đặt đặt trước"**:
  | Trường | Kiểu | Bắt buộc | Validate |
  | :--- | :--- | :---: | :--- |
  | Số giờ chốt đơn trước giờ nhận (`order_cutoff_hours`) | number | * | Số nguyên 0–72 |
  - Ghi chú: "Thay đổi chỉ áp dụng cho đơn đặt mới" (D-007).
- **Khối "Chợ tham gia"**: danh sách chợ đang bán; nút "+ Thêm chợ" → modal chọn chợ (từ danh sách Admin quản lý) + `stall_label` (ví dụ "Sạp B12", ≤ 30 ký tự). Gỡ chợ: khóa nếu còn đơn mở tại chợ đó.
- **Khối "Khung nhận hàng" theo từng chợ**:
  | Cột | Kiểu | Quy tắc |
  | :--- | :--- | :--- |
  | Thứ | Select Thứ 2 → Chủ nhật | Chỉ những ngày chợ họp (theo `operating_days` của chợ) |
  | Giờ bắt đầu | time | Trong giờ mở cửa chợ |
  | Giờ kết thúc | time | > giờ bắt đầu, trong giờ đóng cửa chợ |
  | Hành động | Sửa / Xóa | Xóa có ConfirmDialog |
- **Ngày hoạt động của Farmer** (SRS "operating days"): hiển thị tự tổng hợp từ các khung nhận hàng, dạng chip "T3, T5, T7".

### F-08 · Hồ sơ sạp (FR-40)
| Trường | Kiểu | Bắt buộc | Validate |
| :--- | :--- | :---: | :--- |
| Tên sạp / cơ sở | text | * | 2–100 |
| Người liên hệ | text | * | 2–100 |
| Số điện thoại | tel | * | Regex VN |
| Email | email (readonly) | — | Không đổi được |
| Địa chỉ | textarea | * | 5–255 |
| Giới thiệu sạp | textarea | — | ≤ 1.000 |
| Ảnh sạp | file | — | jpg/png/webp ≤ 2MB |
| Vị trí trên bản đồ | `MapPicker` (bấm / kéo marker) + nút "Tìm theo địa chỉ" (Nominatim) | — | Lat/Lng cùng có hoặc cùng trống (D-012) |
| Vĩ độ / Kinh độ | number (readonly, điền từ MapPicker, có nút xóa) | — | 6 chữ số thập phân |
- Hiển thị trạng thái duyệt hiện tại + lý do (nếu `REJECTED`/`SUSPENDED`).

### F-09 · Đánh giá (FR-47)
- **Tabs**: Về sạp · Về sản phẩm.
- **Bộ lọc**: số sao, đã / chưa phản hồi.
- **Card đánh giá**: khách (tên rút gọn), sao, nhận xét, ngày, đơn liên quan, sản phẩm (tab sản phẩm).
- **Phản hồi** (1 lần / review, D-016): textarea ≤ 500 ký tự, nút "Gửi phản hồi"; sau khi gửi hiển thị readonly.
- Review bị Admin ẩn: hiển thị mờ, nhãn "Đã bị quản trị viên ẩn", không phản hồi được.

---

## 6. ĐẶC TẢ MÀN HÌNH — PHÂN HỆ QUẢN TRỊ (`pages/admin/`)

### A-01 · Tổng quan Admin (FR-50)
- **Thẻ KPI**: Tổng nông dân (+ số chờ duyệt, link A-02) · Tổng khách hàng · Tổng chợ hoạt động · Tổng đơn hàng.
- **Biểu đồ**: số đơn theo ngày 30 ngày gần nhất (đường); đơn theo trạng thái (cột).
- **Danh sách nhanh**: 5 Farmer chờ duyệt mới nhất (nút Duyệt / Xem).

### A-02 · Quản lý nông dân (FR-51)
- **Tabs**: Chờ duyệt · Đã duyệt · Đình chỉ · Từ chối.
- **Tìm kiếm**: tên sạp, email, SĐT. **Lọc**: chợ tham gia.
- **Cột bảng**: Tên sạp · Người liên hệ · SĐT · Email · Ngày đăng ký · Số sản phẩm · Số đơn mở · Trạng thái · Hành động.
- **Hành động theo trạng thái (D-015)**:
  | Trạng thái | Nút | Dialog |
  | :--- | :--- | :--- |
  | `PENDING` | Duyệt | Xác nhận thường |
  | `PENDING` | Từ chối | Lý do * |
  | `APPROVED` | Đình chỉ | Lý do * + cảnh báo: "X đơn đang mở sẽ bị hủy (Bị từ chối), hàng được hoàn kho, khách được thông báo. Sạp sẽ bị ẩn khỏi trang công khai." |
  | `SUSPENDED` | Khôi phục | Xác nhận thường |

### A-03 · Hồ sơ nông dân (Admin xem)
- Toàn bộ thông tin đăng ký + hồ sơ sạp, bản đồ vị trí, chợ tham gia, khung nhận hàng, danh sách sản phẩm, thống kê đơn (tổng / hoàn tất / từ chối / hết hạn), lịch sử thay đổi trạng thái duyệt (ai, khi nào, lý do). Nút hành động như A-02.

### A-04 · Quản lý khách hàng (FR-52)
- **Tìm kiếm**: tên, email, SĐT. **Lọc**: Hoạt động / Đã khóa.
- **Cột**: Họ tên · Email · SĐT · Ngày đăng ký · Tổng đơn · Đơn mở · Số lần `NO_SHOW` · Trạng thái · Hành động.
- **Khóa tài khoản**: Lý do * + cảnh báo "X đơn đang mở sẽ bị hủy và hoàn kho. Khách không thể đăng nhập." (D-015).
- **Kích hoạt lại**: xác nhận thường.
- **Xem chi tiết** (drawer): thông tin + danh sách đơn gần đây.

### A-05 · Danh sách chợ (FR-53)
- Bảng + bản đồ tổng (tab). **Cột**: Tên · Địa chỉ · Ngày họp · Giờ mở–đóng · Số Farmer · Trạng thái · Hành động (Sửa / Ngừng hoạt động / Kích hoạt).
- **Ngừng hoạt động** (D-017): ConfirmDialog "Chợ sẽ bị ẩn khỏi trang công khai. Không nhận đơn mới tại chợ này." Hiển thị số đơn mở đang gắn với chợ.

### A-06 · Form chợ
| Trường | Kiểu | Bắt buộc | Validate |
| :--- | :--- | :---: | :--- |
| Tên chợ | text | * | 2–100, duy nhất |
| Địa chỉ | textarea | * | 5–255 |
| Ngày họp | Checkbox group Thứ 2 → CN | * | ≥ 1 ngày |
| Giờ mở cửa | time | * | — |
| Giờ đóng cửa | time | * | > giờ mở |
| Mô tả | textarea | — | ≤ 1.000 |
| Vị trí | `MapPicker` + "Tìm theo địa chỉ" | * | Lat/Lng bắt buộc (D-012) |
| Nhà cung cấp bản đồ | Hiển thị cố định "OpenStreetMap" | — | Tương ứng cột `map_provider` trong SRS |

### A-07 · Danh mục sản phẩm (FR-56)
- Bảng: Tên danh mục · Biểu tượng · Số sản phẩm · Thứ tự hiển thị · Trạng thái · Hành động.
- Thêm / Sửa trong modal: tên * (2–50, duy nhất, phân biệt dấu), biểu tượng (chọn từ bộ icon), thứ tự hiển thị.
- **Xóa**: chỉ khi 0 sản phẩm; ngược lại chỉ cho "Ẩn danh mục" (không cho chọn khi tạo sản phẩm mới).

### A-08 · Kiểm duyệt nội dung (FR-54)
- **Tab Sản phẩm**: tìm theo tên / Farmer; cột: ảnh, tên, Farmer, giá, trạng thái; nút "Gỡ" (lý do *, đặt `is_hidden_by_admin`) / "Khôi phục".
- **Tab Đánh giá**: lọc số sao, loại (Farmer / Sản phẩm); cột: khách, đối tượng, sao, nhận xét, ngày; nút "Ẩn" (lý do *) / "Hiện lại".

### A-09 · Báo cáo & thống kê (FR-55, D-018)
- **Bộ lọc**: khoảng ngày *, chợ (tùy chọn).
- **Khối 1 — Tổng quan đơn**: tổng đơn theo từng trạng thái.
- **Khối 2 — Doanh thu theo chợ**: bảng Chợ · Số đơn hoàn tất · Doanh thu; biểu đồ cột. (Chỉ đơn `COMPLETED`.)
- **Khối 3 — Nông dân tích cực nhất**: top 10: Tên sạp · Số đơn hoàn tất · Doanh thu · Điểm đánh giá TB.
- **Nút "Xuất Excel"**: tải `.xlsx` gồm 3 sheet tương ứng; mỗi lần xuất được ghi nhật ký `EXPORT_DATA`.

### A-10 · Thông báo toàn sàn (FR-57)
- Bảng: Tiêu đề · Đối tượng · Thời gian hiển thị · Trạng thái · Hành động.
- Form (modal):
  | Trường | Kiểu | Bắt buộc | Validate |
  | :--- | :--- | :---: | :--- |
  | Tiêu đề | text | * | 5–150 |
  | Nội dung | textarea (plain text) | * | ≤ 1.000 |
  | Đối tượng | Select: Tất cả · Khách hàng · Nông dân | * | — |
  | Hiển thị từ / đến | datetime | * / — | "Đến" > "Từ" |
  | Đang bật | switch | — | — |
- Hiển thị ở N-04 (banner, đóng được, nhớ theo phiên bằng `sessionStorage` trong trình duyệt người dùng).

### A-11 · Nhật ký hệ thống (FR-58)
- Bảng chỉ đọc: Thời gian · Người dùng · Hành động (`LOGIN`, `LOGIN_FAILED`, `EXPORT_DATA`, `FARMER_SUSPENDED`, `CUSTOMER_DEACTIVATED`, `ACCESS_DENIED`...) · Endpoint · IP · Mã HTTP · Request ID.
- Lọc: khoảng ngày, hành động, người dùng. Click dòng → drawer JSON `details`.

---

## 7. COMPONENT NHÚNG & MÀN HÌNH LẶP LẠI THEO ROLE

### N-01 · Chuông thông báo (Header)
- Icon chuông + số chưa đọc (ẩn khi 0, "9+" khi > 9).
- Dropdown 10 thông báo gần nhất: icon theo loại, tiêu đề, nội dung 2 dòng, thời gian tương đối, chấm xanh chưa đọc. Click → đánh dấu đã đọc + điều hướng `target_url`.
- Nút "Đánh dấu tất cả đã đọc", link "Xem tất cả" → C-09 (Customer) hoặc F-10 (Farmer). Admin không nhận thông báo cá nhân nên không có chuông.
- Cập nhật tức thời qua WebSocket (D-010); khi mất kết nối, lấy lại số chưa đọc lúc kết nối lại.

### C-09 / F-10 · Trang thông báo (theo role)
- Cùng dùng `features/notifications/NotificationList.jsx`; mỗi role có route riêng trong nhánh của mình.
- Danh sách đầy đủ, lọc Tất cả / Chưa đọc, phân trang 20. Thông báo toàn sàn (N-04) không nằm ở đây.

### N-03 · Widget trợ lý AI (D-011)
- Nút tròn nổi góc phải dưới → khung chat 360×520 (toàn màn hình trên mobile).
- Lời chào + 4 câu gợi ý (chip): "Chợ nào họp sáng Chủ nhật?", "Ai đang bán dâu tây?", "Đơn của tôi đến đâu rồi?", "Khung nhận hàng của sạp X?".
- Tin nhắn hiển thị dạng text thuần (không render HTML). Trạng thái "Đang trả lời..." khi chờ.
- Lịch sử chỉ lưu trong state phiên hiện tại (không lưu server, D-011); gửi kèm ~10 tin gần nhất.
- Hỏi về đơn khi chưa đăng nhập → bot trả lời gợi ý đăng nhập.
- Ẩn widget nếu `AI_CHAT_ENABLED=false` (lấy qua cấu hình công khai).

### C-10 · Hồ sơ cá nhân (Customer)
- Họ tên *, SĐT *, Địa chỉ *, Email (readonly). CTA "Lưu". *(Farmer dùng F-08; Admin không có hồ sơ mở rộng.)*

### C-11 / F-11 / A-12 · Đổi mật khẩu (theo role)
- Cùng dùng `features/auth/ChangePasswordForm.jsx`, route nằm trong nhánh của từng role.
- Mật khẩu hiện tại *, Mật khẩu mới * (§1.5), Xác nhận *. Thành công → toast; các thiết bị khác vẫn giữ phiên (D-021).

---

## 8. MA TRẬN NÚT HÀNH ĐỘNG THEO TRẠNG THÁI ĐƠN (UI ⇄ FSM D-006)

### 8.1 Nút hiển thị theo trạng thái × vai trò
| Trạng thái | Customer (C-04, C-05) | Farmer (F-02, F-03) |
| :--- | :--- | :--- |
| `PLACED` | Sửa, Hủy (T5) *(trước `cutoff_at`)* | Duyệt (T2), Từ chối (T3) *(trước `pickup_start_at`)* |
| `ACCEPTED` | Sửa (→ về Chờ duyệt, T7), Hủy (T6) *(trước `cutoff_at`)* | Từ chối (T4) *(trước `cutoff_at`)*, Sẵn sàng (T9) *(sau `cutoff_at`)* |
| `READY_FOR_PICKUP` | Chỉ đường | Hoàn tất (T10), Không đến (T11) *(sau `pickup_end_at`)* |
| `COMPLETED` | Đánh giá, Đặt lại | — |
| `CANCELLED` / `DECLINED` / `NO_SHOW` / `EXPIRED` | Đặt lại | — |

**Admin không thao tác trên từng đơn.** Các cạnh Admin (T3, T4, T12 khi đình chỉ Farmer tại A-02/A-03; T5, T6, T13 khi khóa Customer tại A-04) được kích hoạt hàng loạt từ một hộp thoại xác nhận, hiển thị trước số đơn bị ảnh hưởng theo từng trạng thái. Timeline đơn hiển thị người thực hiện "Quản trị viên" và lý do `FARMER_SUSPENDED_BY_ADMIN` / `CUSTOMER_LOCKED_BY_ADMIN` dưới dạng câu tiếng Việt.

### 8.2 Quy tắc hiển thị nút phụ thuộc thời gian
- Nút ngoài khung thời gian **vẫn hiển thị nhưng disabled** kèm tooltip mốc giờ (Farmer cần biết khi nào làm được), trừ nút Sửa/Hủy của Customer đã quá cutoff thì **ẩn** và thay bằng dòng "Đã quá hạn sửa/hủy".
- Tính toán thời gian ở FE chỉ để hiển thị; quyết định cuối cùng do backend (Gate 3 → 422).
- Mọi nút ở bảng này gửi `If-Match: <version>`.

---

## 9. LUỒNG NGHIỆP VỤ XUYÊN MÀN HÌNH (KEY USER FLOWS)

### 9.1 Luồng đặt hàng (Customer)
```text
G-04/G-05/G-06 ──[+ Giỏ]──► Guest? ──► G-09 (next=trang hiện tại) ──┐
                               │                                       │
                               ▼  ◄────────────────────────────────────┘
                   C-01 /customer/cart (nhóm theo Farmer)
                               │ [Tiến hành đặt hàng]
                               ▼
                   C-02 /customer/checkout: mỗi nhóm chọn Chợ → Ngày → Khung
                               │ [Xác nhận đặt N đơn] → ConfirmDialog
                               ▼
                   POST (Idempotency-Key) ──lỗi──► tô đỏ dòng / dialog giới hạn
                               │ 201
                               ▼
                   C-03 Thành công (N đơn PLACED) → xóa giỏ
                               ▼
                   Farmer nhận thông báo "Đơn mới" (N-01)
```

### 9.2 Luồng xử lý đơn (Farmer ⇄ Customer)
```text
F-02 [Duyệt] ──► ACCEPTED ──► Khách nhận in-app + email "Đơn đã xác nhận"
     [Từ chối + lý do] ──► DECLINED ──► Khách nhận in-app + email + lý do
Khách sửa đơn ACCEPTED (C-06) ──► PLACED ──► Farmer nhận "Đơn đã thay đổi" → duyệt lại
Sau cutoff: F-02 [Sẵn sàng] ──► READY_FOR_PICKUP ──► Khách nhận in-app + email
Tại chợ: [Hoàn tất] ──► COMPLETED ──► C-07 mở cho khách đánh giá
Quá giờ nhận: [Không đến] ──► NO_SHOW
Farmer không duyệt kịp: quét lười ──► EXPIRED ──► Khách nhận in-app + email
```

### 9.3 Luồng mẫu tồn kho tuần (Farmer)
```text
F-06: sửa "Số lượng mặc định" từng dòng ──► [Áp dụng cho tuần này]
      ──► Dialog xem trước (mẫu − đang giữ = mới) + đơn quá hạn chưa đóng
      ──► [Xác nhận] ──► tồn kho cập nhật ──► restock alert cho món 0 → >0
```

### 9.4 Luồng duyệt / đình chỉ Farmer (Admin)
```text
G-11 đăng ký ──► PENDING (F-01 banner chờ duyệt, khóa tạo sản phẩm)
A-02 [Duyệt] ──► APPROVED ──► Farmer nhận thông báo, mở khóa chức năng
A-02 [Từ chối + lý do] ──► REJECTED
A-02 [Đình chỉ + lý do] ──► dialog đếm đơn mở ──► SUSPENDED: đơn mở bị từ chối, hoàn kho, khách được báo, sạp ẩn
A-02 [Khôi phục] ──► APPROVED
```

---

## 10. THÀNH PHẦN GIAO DIỆN THEO PHÂN HỆ (`src/features/`)

| Feature | Thành phần chính | Dùng tại |
| :--- | :--- | :--- |
| `auth/` | `LoginForm`, `RegisterCustomerForm`, `RegisterFarmerForm`, `ChangePasswordForm` | G-09 → G-11, C-11, F-11, A-12 |
| `markets/` | `MarketCard`, `MarketFilters`, `MarketMap`, `MarketForm` | G-01 → G-03, C-00, A-05, A-06 |
| `maps/` | `BaseMap` (fix icon/CSS Leaflet), `MapPicker`, `DirectionsButton`, `NearMeButton` | Mọi màn hình bản đồ |
| `farmers/` | `FarmerCard`, `FarmerFilters`, `FarmerHeader`, `PickupSlotTable`, `FarmerStatusBadge` | G-03, G-06, G-13, F-07, A-02 |
| `products/` | `ProductCard`, `ProductFilters`, `ProductForm`, `StockBadge`, `QuantityStepper` | G-04, G-05, F-04, F-05 |
| `cart/` | `useCartStore` (Zustand persist), `CartGroup`, `CartLine` | C-01, C-02, Header |
| `orders/` | `OrderStatusBadge`, `OrderTable`, `OrderTimeline`, `OrderActions` (theo §8), `PickupSelector`, `DeclineDialog`, `CutoffCountdown` | C-02 → C-06, F-02, F-03 |
| `weekly-stock/` | `WeeklyTemplateTable`, `ApplyTemplateDialog` | F-06 |
| `reviews/` | `RatingStars`, `ReviewList`, `ReviewForm`, `ReplyForm` | G-05, G-06, C-07, F-09, A-08 |
| `favorites/` | `FavoriteButton`, `useFavorites` | G-02 → G-06, C-08 |
| `notifications/` | `NotificationBell`, `NotificationList`, `useNotificationSocket` | N-01, C-09, F-10 |
| `announcements/` | `AnnouncementBanner`, `AnnouncementForm` | N-04, A-10 |
| `chat/` | `ChatWidget`, `ChatMessage` | N-03 |
| `reports/` | `KpiCard`, `RevenueChart`, `TopTable`, `ExportButton` | F-01, A-01, A-09 |
| `users/` | `FarmerTable`, `CustomerTable`, `ReasonDialog` | A-02 → A-04 |
| `audit/` | `AuditLogTable` | A-11 |

**Thư viện bổ sung ngoài danh mục playbook (cần Lead duyệt)**: `leaflet` + `react-leaflet` v5 (D-012). Các thư viện khác đã có trong playbook.

---

## 11. KIỂM KÊ DỮ LIỆU SUY RA TỪ UI (ĐẦU VÀO PASS 4)
*(Chỉ liệt kê trường mà UI hiển thị hoặc gửi đi. Pass 4 sẽ đối chiếu thêm SRS, Business Rules và trường toàn vẹn hệ thống.)*

| Thực thể | Trường UI cần | Màn hình nguồn |
| :--- | :--- | :--- |
| User | email, role, is_active, must_change_password | G-09, A-04 |
| CustomerProfile | full_name, phone, address | G-10, C-10, A-04 |
| FarmerProfile | stall_name, contact_person, phone, address, description, image, latitude, longitude, status, status_reason, order_cutoff_hours, rating_avg*, rating_count* | G-11, F-08, F-07, A-02 |
| Market | name, address, operating_days, open_time, close_time, description, latitude, longitude, map_provider, is_active, distance_km* , farmer_count* | A-06, G-02 |
| FarmerMarket | farmer, market, stall_label | F-07, G-06 |
| PickupSlot | farmer_market, day_of_week, start_time, end_time | F-07, C-02 |
| Category | name, icon, display_order, is_active, product_count* | A-07 |
| Product | name, category, price, unit, stock_quantity, weekly_default_quantity, description, image, is_available, is_archived, is_hidden_by_admin, hidden_reason, held_quantity*, rating_avg* | F-04 → F-06, G-04 |
| Order | id, customer, farmer, market, pickup_date, pickup_start_at, pickup_end_at, cutoff_at, status, note, total_amount, version, created_at, is_overdue*, decline_reason (từ history) | C-02 → C-06, F-02, F-03 |
| OrderItem | product, product_name, unit, unit_price (snapshot), quantity, line_total | C-05, F-03 |
| Order history | status, history_date, history_user, change_reason | Timeline C-05, F-03 |
| ProductReview / FarmerReview | order, target, rating, comment, reply, replied_at, is_hidden_by_admin, hidden_reason, created_at | C-07, G-05, G-06, F-09, A-08 |
| FavoriteFarmer / FavoriteProduct / FavoriteMarket | customer, target, created_at | C-08 |
| Notification | type, title, message, target_url, is_read, created_at | N-01, C-09, F-10 |
| Announcement | title, content, audience, starts_at, ends_at, is_active | A-10, N-04 |
| AuditLog | user, action, endpoint, ip_address, status_code, request_id, details, created_at | A-11 |

*Trường có dấu `*` là trường tính toán (annotate / serializer), không lưu cột.*

---

## 12. ĐIỂM CẦN LEAD ARCHITECT XÁC NHẬN TRONG PASS 3
| ID | Điểm | Đề xuất trong bản đặc tả này |
| :---: | :--- | :--- |
| U-01 | Giá trị `BOOKING_HORIZON_DAYS` (D-013 ghi "N ngày tới") | 7 ngày |
| U-02 | Giỏ hàng chỉ dành cho Customer đã đăng nhập (route `/customer/cart`) | Áp dụng; Guest bấm "+ Giỏ" được mời đăng nhập rồi quay lại |
| U-03 | Chế độ "Danh sách soạn hàng" tại F-02 (dữ liệu suy ra, không thêm bảng) | Giữ, phục vụ "manage pre-orders" |
| U-04 | Ràng buộc khung pickup nằm trong ngày + giờ họp của chợ (F-07) | Áp dụng |
| U-05 | Hiển thị tên khách rút gọn trên review công khai ("Nguyễn V. A.") | Áp dụng |
| U-06 | Thêm thư viện `leaflet` + `react-leaflet` v5 | Duyệt |

~~~ Hết Pass 3 — Chờ Lead Architect phê duyệt trước khi sang Pass 4 ~~~
