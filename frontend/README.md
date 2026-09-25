# PRJ-Techwiz 2026 Frontend (MarketLink)

Nền tảng đặt trước – nhận tại quầy (Pre-order & Self-pickup).

## Yêu cầu

- Node.js 20+
- pnpm 9+ (hoặc npm)

## Chạy nhanh

```bash
pnpm i
cp .env.example .env
pnpm dev
```

Mở http://localhost:5173

## Biến môi trường

| Biến | Mô tả | Mặc định |
|------|--------|----------|
| `VITE_API_URL` | Base URL API | `/api` |
| `VITE_WS_BASE_URL` | Base path WebSocket | `/ws` |
| `VITE_USE_MOCK` | Bật MSW mock (không cần backend) | `true` |

## Tài khoản demo (MSW)

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `customer@demo.vn` | `Demo1234` | Khách hàng |
| `farmer@demo.vn` | `Demo1234` | Nông dân |
| `admin@demo.vn` | `Demo1234` | Quản trị |

Trang đăng nhập có nút **Đăng nhập nhanh demo**.

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm preview
```

## Tech stack

Vite 8 · React 19 · TypeScript · Vanilla CSS (BEM + design tokens) · Radix · React Router 7 · TanStack Query · Zustand · RHF + Zod · Axios · MSW · Leaflet/OSM · Framer Motion · Sonner

## Phase 2 — Guest / Public

Đã có các màn:
- `/` trang chủ (search, danh mục, chợ gần, sản phẩm nổi bật, nông dân yêu thích)
- `/markets` + `/markets/:id` (list + bản đồ Leaflet cluster)
- `/products` + `/products/:id` (filter URL sync, infinite scroll, giỏ)
- `/farmers` + `/farmers/:id` (lọc/sort, lịch nhận hàng, tab đánh giá)

## Phase 3–5 — Auth / Customer / Farmer / Admin

Đã có đầy đủ luồng đăng nhập–đăng ký, giỏ→đơn, yêu thích, dashboard nông dân, kiểm duyệt & báo cáo admin (xem router `src/app/router`).

## Phase 6 — Realtime, AI chat & polish

- **N-01 / N-04**: `NotificationBell` (Customer + Farmer) + `useNotificationSocket` (AU-08 ws-ticket → `/ws/notifications/?ticket=`, reconnect backoff 1→16s; mock interval khi `VITE_USE_MOCK=true`)
- **CH-01**: `AiChatWidget` (hiện khi `ai_chat_enabled`); MSW `POST /api/chat/` (+ mô phỏng 503 `AI_UNAVAILABLE`)
- **A11y**: skip-to-content trên Public / Customer / Farmer / Admin layouts
- **Perf**: `LazyImage` trên card sản phẩm/chợ; prefetch danh sách chợ/sản phẩm/nông dân khi hover nav public
