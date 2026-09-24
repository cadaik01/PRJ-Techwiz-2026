# PRJ-Techwiz 2026 — MarketLink

## Nguồn sự thật nghiệp vụ (bắt buộc)

`Document/doc/MarketLink_requirement_analysis_ok (4).md` là tài liệu nghiệp vụ và hợp đồng API đã được Lead Architect chốt (bản có Decision Log D-001 → D-026).
**Mọi lần viết, sửa hoặc review code (backend lẫn frontend) phải đối chiếu với file này trước khi viết và trước khi commit.**

Quy trình mỗi lần code:
1. Xác định mã liên quan: FR-xx, UC-xx, D-xxx, cạnh FSM T1–T13, endpoint (AU/PU/CU/FA/AD/NO-xx), bảng ở Pass 4A.
2. Đọc đúng mục trong file (bảng tra bên dưới), không làm theo trí nhớ.
3. Code đúng tên trường, kiểu dữ liệu, URL, mã lỗi, mã HTTP, luật tồn kho và FSM như file ghi.
4. Viết test theo kịch bản CT-xx tương ứng (Pass 4B §7).
5. Ghi mã FR / D / T / endpoint đã đối chiếu vào mô tả commit hoặc PR.

Khi code hiện có, yêu cầu mới hoặc skill **mâu thuẫn** với file: dừng lại, nêu rõ chỗ lệch cho Lead Architect quyết định. Không tự ý làm khác file, không tự sửa file.
Thứ tự ưu tiên: file này quyết định **nghiệp vụ và hợp đồng API** (đã đóng băng, đổi phải ghi Change Log Pass 4B §8); skill `.claude/skills/techwiz-django-backend/SKILL.md` quyết định **cách viết code** (cấu trúc tầng, khóa dòng, quy ước đặt tên, commit).

## Bảng tra nhanh trong file

| Cần tra | Mục |
| :--- | :--- |
| 26 quyết định kiến trúc D-001 → D-026 | Decision Log (đầu file) |
| Actor, phạm vi, Use Case UC-01 → UC-34 | Pass 1 |
| Checkout N đơn, giữ hàng, chống đơn ảo | Pass 2 §2 A-001, A-001b |
| FSM đơn hàng 8 trạng thái, 13 cạnh T1–T13 | Pass 2 §2 A-002 (bản chốt duy nhất) |
| Sửa đơn & cutoff | Pass 2 §2 A-003 |
| Mẫu tồn kho tuần, quét lười đơn quá hạn | Pass 2 §2 A-004, A-005 |
| Thông báo, AI chat, bản đồ | Pass 2 §2 A-006, A-007, A-008 |
| FR-01 → FR-59, NFR-01 → NFR-12 | Pass 2 §4, §5 |
| Màn hình, route, validate, nút theo trạng thái | Pass 3 |
| 24 bảng (22 + `market_closures`, `farmer_closures`), cột, index, enum | Pass 4A §3, §4 |
| Thứ tự khóa, transaction, bất biến | Pass 4A §5, §6 |
| Header, envelope, phân trang, kiểu dữ liệu, mã lỗi | Pass 4B §1, §2 |
| Lược đồ JSON (Me, OrderDetail, ...) | Pass 4B §3 |
| Danh mục endpoint | Pass 4B §4 |
| Checkout, sửa đơn, hành động FSM, đình chỉ / khóa | Pass 4B §5 |
| Phạm vi quyền cấp đối tượng | Pass 4B §6 |
| Kịch bản test CT-01 → CT-19 | Pass 4B §7 |
| 4 lưu ý thi công (audit ngoài atomic, GETDEL, khóa, CORS) | `Document/doc/MarketLink_Implementation_Notes.md` |

## Quy ước khác

- Backend: đọc skill `techwiz-django-backend` trước khi code, commit, push hoặc mở PR (gồm mục 16: không để AI thành contributor).
- CSDL: MySQL 8, `utf8mb4_0900_ai_ci`; không dùng SQLite.
