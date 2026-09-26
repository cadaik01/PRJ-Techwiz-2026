---
name: techwiz-frontend-react
description: Quy chuẩn lập trình Frontend React + TypeScript + Vite, mô hình Feature-Driven Architecture, quản lý state với TanStack Query & Zustand, validate Zod, quy ước Axios Interceptor (Auto-Refresh Token & Trailing Slash), Type Safety (snake_case sync với DRF), English-only codebase và contributor hygiene. Dùng khi viết/review code FE, làm UI components, hoặc commit/PR.
---

# React REST Client — Implementation Standard (Frontend)

Tài liệu quy định phong cách lập trình bắt buộc cho Router, Component, Feature Module, Custom Hook, Store và Integration Layer.

---

## 1. Cấu Trúc Thư Mục Hệ Thống (Feature-Driven Architecture)

Dự án áp dụng mô hình **Feature-Driven Architecture**, chia rõ ranh giới giữa tài nguyên dùng chung toàn hệ thống (`src/components/`, `src/types/`, `src/lib/`) và logic nghiệp vụ nội bộ (`src/features/`).

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
│
└── src/
    ├── assets/                    # Static assets (Images, SVGs, Fonts)
    ├── config/                    # System configs & environment variables
    │   ├── env.ts                 # Validate VITE_* env vars via Zod
    │   └── constants/             # Centralized constants (queryKeys, storageKeys, roles)
    ├── types/                     # Global TypeScript Types (api.types.ts, auth.types.ts)
    ├── components/                # Domain-agnostic UI Components
    │   ├── ui/                    # Primitive components (Button, Input, Modal, Table)
    │   ├── feedback/              # Status UI (ErrorBoundary, PageSkeleton, EmptyState, Toast)
    │   └── layout/                # Shell components (AppHeader, AppSidebar, Footer)
    ├── features/                  # FEATURE-DRIVEN MODULES (Domain-specific logic)
    │   ├── auth/                  # Feature: Auth (api/, components/, hooks/, schemas/, types/)
    │   └── notifications/         # Feature: Notifications
    ├── layouts/                   # Layout Shells (AuthLayout.tsx, AppLayout.tsx)
    ├── pages/                     # Route Containers (Import features and bind to layouts)
    ├── router/                    # Scalable Routing System (guards/, routes/, AppRouter.tsx)
    ├── stores/                    # Client-only UI Stores (Zustand: auth.store.ts, ui.store.ts)
    ├── lib/                       # Third-party Instances (axiosClient.ts, queryClient.ts, cn.ts)
    ├── utils/                     # Pure Helper Functions (formatters/, helpers/)
    ├── App.tsx                    # Root Provider Wrapper
    ├── main.tsx                   # Entry Point
    └── index.css                  # Global styles entry → styles/global.css
```

---

## 2. Chuẩn API Response, URL Routing & Type Safety

* **Type Safety tuyệt đối**: Bắt buộc dùng TypeScript, **cấm 100% việc sử dụng kiểu `any`**.
* **Đồng bộ Naming `snake_case`**: Dữ liệu API Payload và Response Interfaces phải giữ nguyên kiểu `snake_case` khớp 100% với Backend DTOs để tránh phát sinh lỗi conversion.
* **Quy tắc Dấu gạch chéo URL (`APPEND_SLASH`)**: 100% các đường dẫn API gọi từ Frontend **bắt buộc phải có dấu `/` ở cuối** (Ví dụ: `/api/customer/orders/`, tuyệt đối không dùng `/api/customer/orders`).
* **Chuẩn hóa API Response Envelope (Khớp với DRF Backend)**:
  Mọi API call bọc kiểu dữ liệu nhận về qua `ApiResponse<T>` tại `src/types/api.types.ts`:

```typescript
export interface ApiResponse<T unknown> {
  success: boolean;
  message: string;
  data: T;
  errors: Record<string, string[]>;
}

export interface PaginatedData<T> {
  items: T[];
  total_items: number;
  total_pages: number;
  current_page: number;
  page_size: number;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;
```

---

## 3. Quy Chuẩn Axios Client (src/lib/axiosClient.ts)

Base Configuration: Tạo một instance Axios duy nhất với baseURL lấy từ src/config/env.ts (import.meta.env.VITE_API_URL).

Request Interceptor:

Tự động lấy Access Token từ Zustand Store/Storage để gắn Header Authorization: Bearer <token>.

Tự động kiểm tra và cảnh báo/format nếu URL truyền vào thiếu dấu / ở cuối.

Response Interceptor:

Trả về dữ liệu response.data (được cast trực tiếp về ApiResponse<T>).

Catch tập trung các mã lỗi HTTP (403 Forbidden, 500 Server Error).

Cơ chế Refresh Token Queue: Khi gặp 401 Unauthorized, tạm dừng các request đến sau, tự động gọi API refresh token. Nếu thành công -> retry lại các request hỏng. Nếu thất bại -> xóa session và chuyển hướng về /login.

---

## 4. Quản Lý State & Server Data

Server State (TanStack Query):

100% thao tác lấy dữ liệu (GET) sử dụng useQuery.

100% thao tác ghi/đổi dữ liệu (POST, PUT, PATCH, DELETE) sử dụng useMutation.

Mọi Query Key bắt buộc phải khai báo tập trung tại src/config/constants/queryKeys.ts (ví dụ: ORDER_KEYS.list(filters)).

Sau khi useMutation thành công, bắt buộc gọi queryClient.invalidateQueries() để cập nhật lại dữ liệu mới nhất.

Client UI State (Zustand):

Chỉ lưu trữ các state thuần UI hoặc phiên làm việc tạm (trạng thái Sidebar, Theme Mode, Auth Token).

Không dùng Zustand để cache lại dữ liệu từ API.

---

## 5. Quy Chuẩn Form Handling & Server Error Mapping

Thư viện: Sử dụng React Hook Form + Zod Schema Validation.

Khai báo Schema: Đặt trong folder schemas/ của từng Feature tương ứng (ví dụ: src/features/auth/schemas/login.schema.ts).

Upload File: Validate kích thước file (file.size <= MAX_SIZE) và định dạng (ACCEPTED_TYPES.includes(file.type)) ngay trong Zod Schema trước khi append vào FormData.

Map Lỗi từ Backend:
Tất cả lỗi vi phạm nghiệp vụ do Backend trả về trong errors object phải được map ngược lại vào input form qua helper function:

```typescript
// Helper map lỗi từ Backend Response vào React Hook Form
export const mapServerErrorsToForm = <TFieldValues FieldValues extends>(
  serverErrors: Record<string, string[]>,
  setError: UseFormSetError<TFieldValues>
) => {
  Object.keys(serverErrors).forEach((field) => {
    const message = serverErrors[field]?.[0];
    if (message) {
      setError(field as Path<TFieldValues>, { type: "server", message });
    }
  });
};
```

---

## 6. Quy Chuẩn UI Rendering & Styling

Styling: Vanilla CSS thuần — tokens/reset/base tại `src/styles/`, mỗi component/page có file `.css` co-located (BEM). Dùng helper `cn()` (clsx) tại `src/lib/cn.ts` khi nối class có điều kiện. Absolute cấm dùng inline style (`style={{...}}`).

Trạng thái UI Bắt buộc (UI Feedback Rule): Mọi trang/màn hình danh sách khi fetch dữ liệu bắt buộc phải xử lý đủ 3 trạng thái:

isLoading: Hiển thị <PageSkeleton /> hoặc Skeleton Component tương ứng.

isError: Hiển thị thông báo lỗi qua Toast hoặc <ErrorBoundary />.

isEmpty (data.length === 0): Hiển thị <EmptyState /> kèm nút action gợi ý.

---

## 7. Quy Ước Đặt Tên & Mã Nguồn (Naming Conventions)

Non-component files: camelCase hoặc kebab-case (ví dụ: axiosClient.ts, auth.store.ts, date.ts).

Component files & Component Name: PascalCase (ví dụ: LoginForm.tsx, AppSidebar.tsx, AppLayout.tsx).

Custom Hooks: Tiền tố use dạng camelCase (ví dụ: useAuth.ts, useOrderMutation.ts).

TypeScript Types / Interfaces: PascalCase (ví dụ: UserSession, OrderState).

Constants: UPPER_SNAKE_CASE (ví dụ: STORAGE_KEYS_TOKEN = "access_token").

---

## 8. Chuẩn Ngôn Ngữ Mã Nguồn (English-Only Codebase)

Toàn bộ mã nguồn (Codebase) viết bằng tiếng Anh 100%.

Bắt buộc tiếng Anh:

Tên biến, hàm, component, props, hooks, types, interfaces, file, thư mục.

Code comments, JSDoc/docstring.

Console logs, error bounds messages.

Commit message, branch name, Pull Request title/description.

Được phép tiếng Việt:

Chuỗi văn bản hiển thị trên giao diện cho người dùng (Label, Toast notification, Placeholder) — nên gom vào file constants/i18n.

Lệnh kiểm tra tiếng Việt trước khi commit:

```bash
grep -rlP '[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]' \
  src/ \
  --exclude-dir=node_modules
```

---

## 9. Quy Ước Git & Quyền Tác Giả Commit (Contributor Hygiene)

Không một công cụ AI nào được phép xuất hiện trong danh sách Contributors của Repository.

Tuyệt đối không thêm trailer Co-Authored-By: trỏ tới bất kỳ AI nào (Claude, Copilot, Cursor...).

Tuyệt đối không chứa văn bản quảng cáo công cụ (Generated with..., robot emoji) trong commit/PR description.

Cấu hình danh tính Git chính xác trước khi commit:

```bash
git config user.name  "Nguyen Van A"
git config user.email "email-dang-ky-github@example.com"
```

Lệnh kiểm tra commit trước khi push:

```bash
git log --format='%B' \
  | grep -inE '^co-authored-by:|^generated with|noreply@anthropic|@users\.noreply\.github\.com.*copilot' \
  && echo "CÓ VẤN ĐỀ" || echo "SẠCH"
```
