# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## DỰ ÁN: MARKETLINK - GIẢI PHÁP WEB TOÀN DIỆN (END-TO-END)

---

- **Cuộc thi:** TECHWIZ 7 - The World Tech Championship
- **Đơn vị tổ chức:** Aptech
- **Tên dự án:** MarketLink
- **Khẩu hiệu:** Farm Fresh Just a Click Away *(Nông sản tươi ngon chỉ với một cú nhấp chuột)*
- **Chủ đề (Theme):** eGreen Basket
- **Hạng mục:** End-to-End Web Solutions
- **Phiên bản tài liệu:** 1.0

---

## MỤC LỤC

1. [1.1 Bối cảnh và Tính Cần thiết](#11-bối-cảnh-và-tính-cần-thiết)
2. [1.2 Giải pháp Đề xuất](#12-giải-pháp-đề-xuất)
3. [1.3 Mục đích của Tài liệu](#13-mục-đích-của-tài-liệu)
4. [1.4 Phạm vi Dự án](#14-phạm-vi-dự-án)
5. [Kiến trúc & Sơ đồ Luồng hoạt động](#kiến-trúc--sơ-đồ-luồng-hoạt-động)
6. [1.5 Ràng buộc Hệ thống & Phạm vi Loại trừ](#15-ràng-buộc-hệ-thống--phạm-vi-loại-trừ)
7. [1.6 Yêu cầu Chức năng (Functional Requirements)](#16-yêu-cầu-chức-năng-functional-requirements)
   - [Phân hệ Khách hàng (Customer Features)](#a-phân-hệ-khách-hàng-customer-features)
   - [Phân hệ Nông dân / Chủ quầy (Farmer Features)](#b-phân-hệ-nông-dân--chủ-quầy-farmer-features)
   - [Phân hệ Quản trị viên (Admin Features)](#c-phân-hệ-quản-trị-viên-admin-features)
   - [Các tính năng khác (Other Features)](#d-các-tính-năng-khác-other-features)
8. [Lưu ý Quan trọng về Sử dụng AI](#lưu-ý-quan-trọng-về-sử-dụng-ai)
9. [1.7 Yêu cầu Phi Chức năng (Non-Functional Requirements)](#17-yêu-cầu-phi-chức-năng-non-functional-requirements)
10. [1.8 Yêu cầu Giao diện & Hạ tầng Kỹ thuật](#18-yêu-cầu-giao-diện--hạ-tầng-kỹ-thuật)
    - [Yêu cầu Phần cứng & Môi trường](#yêu-cầu-phần-cứng--môi-trường)
    - [Công nghệ Phần mềm Đề xuất](#công-nghệ-phần-mềm-đề-xuất)
    - [Thiết kế Cơ sở Dữ liệu Mẫu (Database Design)](#thiết-kế-cơ-sở-dữ-liệu-mẫu-database-design)
11. [1.9 Sản phẩm Bàn giao Dự án (Project Deliverables)](#19-sản-phẩm-bàn-giao-dự-án-project-deliverables)

---

## 1.1 Bối cảnh và Tính Cần thiết

* Các chợ nông sản địa phương ngày càng thu hút người tiêu dùng đang tìm kiếm các sản phẩm tươi sống, đúng mùa và được trồng tại địa phương.
* **Vấn đề tồn tại:** Khách hàng hiếm khi biết trước người nông dân nào sẽ tham gia bán hàng vào một ngày cụ thể, số lượng tồn kho còn bao nhiêu, hoặc mức giá như thế nào.
* Việc cập nhật thông tin hiện nay chủ yếu qua các hình thức thủ công như bảng phấn, tờ rơi in ấn hoặc truyền miệng. Điều này dẫn đến tình trạng người mua đến nơi thì mặt hàng ưa thích đã bán hết, hoặc mất công đi lại khi nông dân nghỉ bán tuần đó.
* Về phía người nông dân, họ không có công cụ thuận tiện để công khai tồn kho theo tuần, nhận đơn đặt hàng trước ngày họp chợ, hoặc xây dựng mối quan hệ lâu dài với khách hàng quen thuộc.
* **Giải pháp cần thiết:** Một ứng dụng Web Full-Stack kết nối trực tiếp nông dân và người tiêu dùng trên cùng một nền tảng. Nông dân có thể công bố hàng hóa, giá bán và quản lý đơn đặt trước. Khách hàng có thể tìm kiếm chợ lân cận, định vị gian hàng qua bản đồ, duyệt sản phẩm, đặt chỗ lấy hàng và để lại đánh giá.

---

## 1.2 Giải pháp Đề xuất

Ứng dụng web toàn diện **MarketLink** cung cấp nền tảng tập trung kết nối người nông dân tại các chợ địa phương với khách hàng:

### Các hành động chính của Khách hàng:
* Duyệt danh sách chợ và nông dân gần khu vực của mình.
* Tìm kiếm và lọc sản phẩm có sẵn.
* Sử dụng Google Maps API hoặc OpenStreetMap để định vị chợ/nông dân, xem hướng dẫn đường đi và xác định điểm nhận hàng (pickup point).
* Đặt hàng trước (pre-order) để lấy hàng tại chợ.
* Theo dõi lịch sử đơn hàng.
* Lưu các nông dân và sản phẩm yêu thích.
* Gửi nhận xét và đánh giá sao.

Nền tảng duy trì cơ sở dữ liệu về kho hàng của nông dân, lịch sử đặt hàng và mục yêu thích của khách. Đi kèm là tính năng AI cơ bản (tùy chọn) để giải đáp các câu hỏi phổ biến như giờ họp chợ, tình trạng hoạt động của người bán và chi tiết sản phẩm.

---

## 1.3 Mục đích của Tài liệu

Tài liệu này xác định rõ ràng thiết kế, kỳ vọng chức năng, tiêu chuẩn phi chức năng và hướng dẫn triển khai cho ứng dụng web **MarketLink**. Tài liệu đóng vai trò là cơ sở tham chiếu cho lập trình viên, kiểm thử viên, quản trị dự án và ban giám khảo đánh giá sản phẩm.

---

## 1.4 Phạm vi Dự án

* Xây dựng ứng dụng web đa tầng hoàn chỉnh, giao diện responsive, trực quan và có khả năng mở rộng.
* Hỗ trợ xác thực đăng ký an toàn, phân quyền truy cập theo vai trò (Role-Based Access Control) và cung cấp bảng điều khiển tương tác (Dashboard) riêng cho từng vai trò: Khách hàng, Nông dân, Quản trị viên.
* Tích hợp bản đồ trực tuyến (Google Maps API hoặc OpenStreetMap).
* Tích hợp chatbot/trợ lý AI cơ bản (tùy chọn).
* Quản lý dữ liệu người dùng, sản phẩm, đơn đặt trước và báo cáo tổng hợp.

---

## Kiến trúc & Sơ đồ Luồng hoạt động

### Kiến trúc Đa tầng (Multi-tier Architecture)
Hệ thống tuân thủ mô hình kiến trúc chuẩn Client-Server:
1. **Trình duyệt Web (Client):** Chrome, Firefox, Safari, Edge,...
2. **Máy chủ Web (Web Server):** Tiếp nhận và điều hướng các yêu cầu HTTP/HTTPS từ Client.
3. **Máy chủ Ứng dụng (Application Server):** Xử lý logic nghiệp vụ phía máy chủ (Server-side logic).
4. **Cơ sở Dữ liệu (Database):** Lưu trữ, truy xuất và quản lý dữ liệu tập trung.

### Sơ đồ Luồng hoạt động Nghiệp vụ (Flow Diagram)
* **Bắt đầu (Start)**
* **Đăng nhập Người dùng (User Login):** Xác thực và kiểm tra thông tin đăng nhập.
* **Xác định Vai trò (Role Identification):**
  * **Admin (Quản trị viên):** Quản lý người dùng, kiểm soát truy cập, giám sát hệ thống, xuất báo cáo.
  * **Vendor (Nông dân / Nhà cung cấp):** Quản lý sản phẩm, xem đơn hàng, phản hồi đánh giá, cập nhật hồ sơ gian hàng.
  * **Customer (Khách hàng):** Duyệt sản phẩm, đặt đơn trước, theo dõi đơn/điểm nhận hàng, gửi đánh giá.
* **Xử lý Dữ liệu (Data Processing):** Thao tác cơ sở dữ liệu và gọi các dịch vụ API.
* **Đầu ra & Báo cáo (Output & Reports):** Hiển thị kết quả, phân tích số liệu.
* **Kết thúc (End)**

---

## 1.5 Ràng buộc Hệ thống & Phạm vi Loại trừ

### Ràng buộc kỹ thuật & Pháp lý:
* Hệ thống phải tương thích hoàn toàn với các trình duyệt web hiện đại và hiển thị chuẩn xác trên mọi kích thước màn hình thiết bị (Responsive).
* Cần đảm bảo quy trình sao lưu, đồng bộ và dung lượng lưu trữ dữ liệu.
* Hình ảnh và video sử dụng trên hệ thống phải tuân thủ nghiêm ngặt bản quyền sở hữu trí tuệ và thỏa thuận cấp phép.

### PHẠM VI LOẠI TRỪ (Out of Scope - Tuyệt đối không xây dựng):
1. **Không tích hợp cổng thanh toán trực tuyến:** Việc thanh toán cho các đơn đặt trước sẽ được thanh toán trực tiếp bằng tiền mặt hoặc thanh toán trực tiếp khi khách hàng đến nhận hàng tại chợ.
2. **Không có dịch vụ giao hàng / chuyển phát (Courier / Delivery):** Hệ thống chỉ phục vụ hình thức khách tự đến nhận hàng tại chợ (pickup at the market).
3. **Không xác minh pháp lý của nông dân:** Không kiểm tra giấy phép kinh doanh, xác minh danh tính cá nhân hoặc chứng nhận vệ sinh an toàn thực phẩm / chứng chỉ hữu cơ (organic).

---

## 1.6 Yêu cầu Chức năng (Functional Requirements)

### A. Phân hệ Khách hàng (Customer Features)

1. **Đăng ký và Đăng nhập:**
   * Khách hàng đăng ký tài khoản cần cung cấp: Họ tên, số điện thoại liên hệ, email, địa chỉ.
   * Đăng nhập an toàn và truy cập bảng điều khiển cá nhân.
   * Cho phép lưu danh sách nhiều gian hàng và sản phẩm yêu thích.
   * Cho phép chia sẻ tài khoản trong phạm vi gia đình (tùy chọn).

2. **Duyệt Chợ và Nông dân:**
   * Xem danh sách chợ gần khu vực dựa trên vị trí và ngày họp chợ; hiển thị danh sách các nông dân bán tại từng chợ.
   * Xem hồ sơ chi tiết của nông dân: Tên gian hàng, vị trí cụ thể, các ngày mở bán, danh mục sản phẩm của tuần hiện tại.
   * Bản đồ nhúng (Google Maps / OpenStreetMap): Hiển thị vị trí các chợ và quầy hàng với các điểm ghim (markers) và hướng dẫn đường đi đến điểm hẹn lấy hàng.

3. **Tìm kiếm, Xem & Lọc Sản phẩm:**
   * Xem danh mục sản phẩm (rau xanh, củ quả, trái cây, đồ bơ sữa, bánh làm tại nhà...).
   * Bộ lọc nâng cao theo: Mức giá, danh mục, tên chợ và ngày họp chợ.
   * Xem thông tin chi tiết sản phẩm: Tên hàng, giá bán, đơn vị tính, số lượng còn lại trong kho, thông tin người bán.

4. **Đặt Hàng trước để Nhận tại Chợ (Pre-Orders):**
   * Thêm sản phẩm vào giỏ hàng và tiến hành đặt trước dựa trên số lượng tồn kho khả dụng của nông dân.
   * Lựa chọn ngày nhận hàng và khung thời gian lấy hàng (pickup time slot) trong các khung giờ nông dân thiết lập.
   * Theo dõi trạng thái đơn hàng xuyên suốt:
     * `Placed` (Đã đặt)
     * `Accepted` (Đã xác nhận)
     * `Ready for pickup` (Sẵn sàng lấy)
     * `Completed` (Đã hoàn thành)
   * Cho phép hủy hoặc thay đổi thông tin đơn hàng trước thời hạn chốt đơn (cut-off time) của nông dân.
   * Thanh toán trực tiếp tại thời điểm nhận hàng.

5. **Quản lý Đơn hàng:**
   * Xem chi tiết các đơn hàng đang chờ hoặc đã đặt.
   * Chỉnh sửa đơn hàng (nếu còn trong thời hạn cho phép).
   * Hủy đơn hàng.

6. **Lịch sử Đơn hàng & Mục Yêu thích:**
   * Xem lại toàn bộ lịch sử mua hàng, tính năng đặt lại nhanh (reorder) các món đồ quen thuộc.
   * Đánh dấu yêu thích người bán và sản phẩm để truy cập nhanh và nhận thông báo khi có hàng lại (restock alerts).
   * Lưu địa điểm chợ ưa thích và nhận thông tin lộ trình nhận hàng thuận tiện nhất qua tích hợp bản đồ.

7. **Trợ lý AI (Tùy chọn - Optional):**
   * Chatbot ứng dụng AI hỗ trợ người dùng tìm kiếm sản phẩm cụ thể giữa các chợ và nông dân.
   * Tự động trả lời câu hỏi thường gặp: Khung giờ họp chợ, tình trạng hoạt động của người bán, thời gian nhận hàng, chi tiết hàng hóa.

8. **Đánh giá & Xếp hạng:**
   * Chấm điểm sao và gửi nhận xét cho người bán cũng như từng sản phẩm sau khi hoàn tất việc nhận đơn.
   * Xem đánh giá và phản hồi của những khách hàng khác trước khi đưa ra quyết định đặt mua.

---

### B. Phân hệ Nông dân / Chủ quầy (Farmer Features)

1. **Đăng ký & Quản lý Hồ sơ Gian hàng:**
   * Cung cấp thông tin lúc đăng ký: Tên gian hàng/tên cơ sở kinh doanh, người đại diện liên hệ, số điện thoại, email, địa chỉ.
   * Sau khi đăng nhập, cập nhật hồ sơ chuyên sâu: Các chợ tham gia mở bán, ngày bán hàng, khung giờ nhận hàng quy định, chi tiết định vị (địa chỉ, điểm ghim bản đồ, kinh độ, vĩ độ) để hiển thị trên bản đồ.

2. **Quản lý Tồn kho & Giá bán Hàng tuần:**
   * Thao tác CRUD (Thêm, Sửa, Xem, Xóa) sản phẩm: Tên hàng, danh mục, đơn giá, đơn vị tính, số lượng hàng có sẵn, bài viết mô tả và hình ảnh sản phẩm.
   * Thiết lập danh mục hàng mẫu lặp lại hàng tuần (recurring weekly stock template) và tùy biến linh hoạt khi nguồn hàng biến động.
   * Tính năng đánh dấu sản phẩm: "Hết hàng" (Sold out) hoặc "Tạm ngưng phục vụ" (Temporarily unavailable).

3. **Quản lý Đơn Đặt trước:**
   * Nhận và xem danh sách đơn đặt trước đổ về theo thời gian thực.
   * Thao tác Tiếp nhận (Accept) hoặc Từ chối (Decline) đơn hàng.
   * Cập nhật trạng thái đơn thành "Sẵn sàng lấy hàng" (Ready for pickup).
   * Thiết lập giờ đóng cổng nhận đơn (cutoff time) và quản lý số lượng suất nhận hàng khả dụng cho từng khung giờ.

4. **Lịch sử Giao dịch & Báo cáo Thống kê:**
   * Xem lại các phiên bán hàng đã qua, chi tiết lịch sử đơn hàng.
   * Xem danh mục sản phẩm bán chạy nhất (Best-selling products).
   * Bảng số liệu tổng quan: Tổng số đơn hàng (Total Orders), Đơn đang chờ duyệt (Pending Orders), Báo cáo tóm tắt doanh thu dự kiến (Revenue Summary).

5. **Tương tác với Đánh giá:**
   * Theo dõi phản hồi từ khách hàng và gửi câu trả lời phản hồi công khai đối với các đánh giá trên sản phẩm của mình.

---

### C. Phân hệ Quản trị viên (Admin Features)

1. **Bảng điều khiển Quản trị (Admin Dashboard):**
   * Đăng nhập bảo mật vào trang quản trị độc lập hoàn toàn với giao diện Khách hàng và Nông dân.
   * Thống kê trực quan các chỉ số nền tảng: Tổng số nông dân, Tổng số khách hàng, Tổng số chợ, Tổng số lượt đặt hàng.

2. **Quản lý Nông dân và Khách hàng:**
   * Tiếp nhận, phê duyệt (Approve) hoặc đình chỉ (Suspend) hồ sơ đăng ký của Nông dân. Nông dân bắt buộc phải được Admin duyệt mới có quyền đăng bán sản phẩm.
   * Quản lý trạng thái tài khoản khách hàng: Kích hoạt (Activate) hoặc Khóa tạm thời (Deactivate) khi vi phạm quy tắc cộng đồng.

3. **Quản lý Chợ (Markets):**
   * Quản lý danh mục các chợ nông sản: Thêm mới, chỉnh sửa thông tin, xóa chợ.
   * Thông tin bao gồm: Tên chợ, địa chỉ cụ thể, ngày họp chợ, giờ mở cửa/đóng cửa, tọa độ bản đồ hoặc liên kết nhúng bản đồ.

4. **Kiểm duyệt Nội dung (Content Moderation):**
   * Giám sát và chủ động gỡ bỏ các bài đăng sản phẩm sai sự thật hoặc các bình luận/đánh giá thô tục, tiêu cực, vi phạm chính sách.

5. **Báo cáo và Phân tích Hệ thống:**
   * Báo cáo toàn diện hệ thống: Khối lượng đơn hàng, ước tính doanh thu theo từng địa điểm chợ, danh sách những nông dân bán hàng năng nổ/hiệu quả nhất.

6. **Cấu hình Hệ thống (System Configuration):**
   * Quản lý dữ liệu danh mục gốc (Master data - categories).
   * Soạn thảo và gửi thông báo, bản tin quan trọng đến toàn bộ người dùng trên hệ sinh thái.

---

### D. Các tính năng khác (Other Features)

* **Kiểm soát truy cập dựa trên vai trò (RBAC):** Đảm bảo quyền hạn được cô lập tuyệt đối; người dùng chỉ xem và thao tác được các chức năng thuộc về vai trò của mình.
* **Hệ thống Tìm kiếm, Sắp xếp & Lọc:** Cho phép tìm kiếm kết hợp đa tiêu chí kèm chế độ hiển thị kết quả theo định vị bản đồ.
* **Thiết kế Responsive:** Hoạt động liền mạch từ máy tính bàn, laptop đến máy tính bảng và điện thoại thông minh.
* **Hệ thống Thông báo (Notifications):** Gửi email hoặc hiển thị thông báo đẩy trong web (in-app alerts) khi đơn được duyệt và khi đơn hàng đã sẵn sàng để đến lấy.
* **Trang Giới thiệu (About Us):** Hiển thị câu chuyện thương hiệu, sứ mệnh nền tảng và đội ngũ phát triển.
* **Trang Liên hệ (Contact Us):** Cung cấp thông tin liên hệ chính thống kèm bản đồ số nhúng trực tiếp vị trí văn phòng.

---

## Lưu ý Quan trọng về Sử dụng AI

Ban tổ chức quy định rõ ràng về phạm vi sử dụng Trí tuệ Nhân tạo:
* **Khuyến khích sử dụng AI làm công cụ hỗ trợ:** Cho phép dùng các công cụ thiết kế (Canva AI, Figma AI, Uizard), công cụ trợ lý lập trình (GitHub Copilot, v.v.) để gia tăng năng suất và hỗ trợ tư duy sáng tạo.
* **NGHIÊM CẤM:**
  * Không dùng các mẫu giao diện có sẵn toàn bộ (ready-made templates) vì sẽ ảnh hưởng tiêu cực đến điểm số đánh giá.
  * Không nộp các đoạn mã hoặc nội dung thuần túy do AI sinh ra mà không có sự chỉnh sửa sâu sắc và thấu hiểu bản chất.
  * Không dùng AI để tạo tự động toàn bộ tài liệu dự án.
* **Trách nhiệm:** Phải liệt kê minh bạch danh sách các công cụ AI đã sử dụng trong tài liệu nộp bài. Thí sinh phải tự tin trả lời phỏng vấn và giải trình mọi quyết định thiết kế cũng như logic mã nguồn trước ban giám khảo.

---

## 1.7 Yêu cầu Phi Chức năng (Non-Functional Requirements)

| Tiêu chuẩn | Nội dung yêu cầu chi tiết |
| :--- | :--- |
| **An toàn (Safe to use)** | Hệ thống tuyệt đối không chứa mã độc, không kích hoạt tự động tải tệp tin đáng ngờ. |
| **Khả năng tiếp cận (Accessibility)** | Phông chữ rõ ràng, độ tương phản màu chuẩn, cấu trúc menu và điều hướng trực quan. |
| **Tính thân thiện (User-friendliness)** | Giao diện công thái học, dễ sử dụng cho cả nông dân lẫn khách hàng lớn tuổi. |
| **Vận hành (Operability)** | Đạt độ tin cậy và hiệu quả xử lý nghiệp vụ nhất quán. |
| **Hiệu năng (Performance)** | Tốc độ tải trang nhanh, thời gian phản hồi thấp, chuyển trang mượt mà kể cả khi tải danh mục sản phẩm lớn. |
| **Khả năng mở rộng (Scalability)** | Kiến trúc máy chủ và cơ sở dữ liệu đáp ứng tốt lưu lượng tăng đột biến vào những ngày cao điểm họp chợ. |
| **Bảo mật (Security)** | Kiểm soát xác thực người dùng chặt chẽ, mã hóa mật khẩu, bảo vệ dữ liệu cá nhân. |
| **Độ sẵn sàng (Availability)** | Hệ thống hoạt động liên tục $24/7$ với thời gian gián đoạn (downtime) ở mức tối thiểu. |
| **Khả năng tương thích (Compatibility)** | Tương thích đa nền tảng, đa trình duyệt (Chrome, Safari, Edge, Firefox). |

---

## 1.8 Yêu cầu Giao diện & Hạ tầng Kỹ thuật

### Yêu cầu Phần cứng & Môi trường
* Bộ xử lý: Intel Core i5 / i7 hoặc tương đương trở lên.
* Bộ nhớ RAM: Tối thiểu 8 GB.
* Màn hình màu SVGA trở lên.
* Ổ cứng trống: Tối thiểu 500 GB.
* Thiết bị ngoại vi: Chuột và bàn phím.

### Công nghệ Phần mềm Đề xuất
* **Frontend:** HTML5, CSS3, Bootstrap, JavaScript, jQuery, TypeScript, ReactJS hoặc AngularJS / Angular.
* **Backend (Tùy chọn một trong các phương án):**
  * Java SDK, Jakarta EE (sử dụng NetBeans hoặc Eclipse).
  * C# với ASP.NET MVC / ASP.NET Core (sử dụng Visual Studio).
  * PHP với Laravel Framework.
  * Python với Django hoặc Flask.
  * Node.js, Express.js (kết hợp React hoặc Angular - ME*N stack).
* **Cơ sở dữ liệu:** MySQL, Microsoft SQL Server, MongoDB hoặc cấu trúc JSON.
* **Máy chủ cục bộ:** XAMPP phiên bản mới nhất (nếu triển khai PHP/MySQL).
* **Bản đồ số:** Google Maps API hoặc OpenStreetMap (bắt buộc lưu trữ kinh độ / vĩ độ để ghim vị trí lấy hàng).
* **Chatbot AI (Tùy chọn):** Có thể tích hợp qua các giải pháp như Tawk.to, Zapier hoặc tự lập trình qua API AI.

---

### Thiết kế Cơ sở Dữ liệu Mẫu (Database Design)

#### 1. Bảng `Users` (Người dùng)
| Tên cột | Kiểu dữ liệu | Khóa | Ghi chú |
| :--- | :--- | :---: | :--- |
| `user_id` | INT | PK | Mã định danh người dùng duy nhất |
| `username` | VARCHAR(50) | UNIQUE | Tên đăng nhập |
| `password_hash` | VARCHAR(255) | | Mật khẩu đã băm an toàn |
| `email` | VARCHAR(100) | UNIQUE | Địa chỉ hòm thư điện tử |
| `role` | VARCHAR(20) | | Vai trò: `Admin`, `Farmer`, `Customer` |
| `created_at` | DATETIME | | Thời gian khởi tạo tài khoản |

#### 2. Bảng `Markets` (Chợ nông sản)
| Tên cột | Kiểu dữ liệu | Khóa | Ghi chú |
| :--- | :--- | :---: | :--- |
| `market_id` | INT | PK | Mã định danh chợ |
| `market_name` | VARCHAR(100) | | Tên phiên chợ nông sản |
| `address` | TEXT | | Địa chỉ thực tế |
| `latitude` | DECIMAL(10,8) | | Vĩ độ bản đồ |
| `longitude` | DECIMAL(11,8) | | Kinh độ bản đồ |
| `map_provider` | VARCHAR(30) | | Nhà cung cấp: GoogleMaps / OSM |

#### 3. Bảng `Products` (Sản phẩm)
| Tên cột | Kiểu dữ liệu | Khóa | Ghi chú |
| :--- | :--- | :---: | :--- |
| `product_id` | INT | PK | Mã định danh sản phẩm |
| `farmer_id` | INT | FK | Khóa ngoại tham chiếu đến bảng `Users` |
| `name` | VARCHAR(100) | | Tên mặt hàng nông sản |
| `description` | TEXT | | Bài viết giới thiệu sản phẩm |
| `price` | DECIMAL(10,2) | | Đơn giá niêm yết |
| `stock_quantity`| INT | | Số lượng tồn kho hàng tuần |
| `created_at` | DATETIME | | Ngày đăng bán |

#### 4. Bảng `Orders` (Đơn đặt trước)
| Tên cột | Kiểu dữ liệu | Khóa | Ghi chú |
| :--- | :--- | :---: | :--- |
| `order_id` | INT | PK | Mã định danh đơn hàng |
| `customer_id` | INT | FK | Khóa ngoại tham chiếu người đặt hàng |
| `product_id` | INT | FK | Khóa ngoại tham chiếu mặt hàng |
| `quantity` | INT | | Số lượng đặt trước |
| `total_amount` | DECIMAL(10,2) | | Tổng tiền cần trả khi lấy hàng |
| `order_status` | VARCHAR(20) | | Trạng thái: Placed, Ready, Completed,... |
| `order_date` | DATETIME | | Thời điểm đặt đơn |

#### 5. Bảng `Reviews` (Đánh giá)
| Tên cột | Kiểu dữ liệu | Khóa | Ghi chú |
| :--- | :--- | :---: | :--- |
| `review_id` | INT | PK | Mã đánh giá duy nhất |
| `product_id` | INT | FK | Khóa ngoại tham chiếu đến sản phẩm |
| `customer_id` | INT | FK | Khóa ngoại tham chiếu đến khách đánh giá |
| `rating` | INT | | Điểm đánh giá (1 - 5 sao) |
| `comment` | TEXT | | Lời bình luận chi tiết |
| `review_date` | DATETIME | | Thời điểm gửi đánh giá |

#### 6. Bảng `Reports` (Báo cáo hệ thống)
| Tên cột | Kiểu dữ liệu | Khóa | Ghi chú |
| :--- | :--- | :---: | :--- |
| `report_id` | INT | PK | Mã định danh báo cáo |
| `generated_by` | INT | FK | Khóa ngoại tham chiếu Quản trị viên xuất báo cáo |
| `report_type` | VARCHAR(50) | | Loại báo cáo (doanh thu, sản lượng,...) |
| `generated_at` | DATETIME | | Thời gian tạo báo cáo |

---

## 1.9 Sản phẩm Bàn giao Dự án (Project Deliverables)

Dự án hoàn chỉnh phải được đóng gói nén (file `.zip`) bao gồm các thành phần bắt buộc:

1. **Tài liệu Báo cáo Dự án (Project Report):**
   * Định nghĩa bài toán thực tế (Problem Definition).
   * Đặc tả thiết kế hệ thống (Design Specifications).
   * Các sơ đồ trực quan: Sơ đồ luồng (Flowcharts), Sơ đồ luồng dữ liệu (DFD), Sơ đồ thực thể quan hệ (ERD).
   * Thiết kế cơ sở dữ liệu chi tiết.
   * Dữ liệu kiểm thử mẫu đã sử dụng (Test Data).
   * **Lưu ý đặc biệt:** Báo cáo dự án **không được chèn mã nguồn (source code)**.

2. **Tệp `ReadMe.doc` (Bắt buộc):**
   * Liệt kê tất cả các giả định được đưa ra trong quá trình phát triển (nếu có).
   * **Hướng dẫn cài đặt và thiết lập dự án (Installation Instructions - Bắt buộc).**
   * **Thông tin đăng nhập mẫu (User Credentials) kèm mật khẩu cho tất cả các nhóm vai trò: Admin, Farmer, Customer (Bắt buộc).**

3. **Tệp kịch bản Cơ sở dữ liệu (`.sql`):**
   * Chứa toàn bộ câu lệnh khởi tạo bảng, quan hệ khóa ngoại và dữ liệu mẫu (seed data).

4. **Video Demo Sản phẩm (`.mp4`) (BẮT BUỘC):**
   * Video quay lại toàn bộ quy trình vận hành thực tế của hệ thống, minh họa đầy đủ các tính năng trong mục Yêu cầu Chức năng.

5. **Đường dẫn Website Trực tuyến (Hosting URL):**
   * Khuyến khích đưa hệ thống lên các nền tảng máy chủ trực tuyến (Cloud/Vercel/Heroku/Render/VPS) để ban giám khảo dễ dàng truy cập và trải nghiệm trực tiếp.