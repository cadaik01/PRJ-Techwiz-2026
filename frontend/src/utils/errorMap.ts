export type ErrorAction = {
  title: string;
  suggestion?: string;
};

const ERROR_MAP: Record<string, ErrorAction> = {
  INSUFFICIENT_STOCK: {
    title: 'Không đủ tồn kho',
    suggestion: 'Giảm số lượng hoặc chọn sản phẩm khác.',
  },
  OPEN_ORDER_LIMIT_EXCEEDED: {
    title: 'Đã vượt giới hạn đơn mở',
    suggestion: 'Hoàn thành hoặc hủy đơn đang mở trước khi đặt thêm.',
  },
  SLOT_NOT_AVAILABLE: {
    title: 'Khung giờ nhận hàng không còn trống',
    suggestion: 'Chọn khung giờ khác.',
  },
  PRODUCT_NOT_AVAILABLE: {
    title: 'Sản phẩm không còn bán',
    suggestion: 'Xóa sản phẩm khỏi giỏ và chọn món khác.',
  },
  CUTOFF_PASSED: {
    title: 'Đã quá thời hạn đặt/sửa đơn',
    suggestion: 'Không thể thay đổi đơn sau cut-off.',
  },
  IDEMPOTENCY_IN_PROGRESS: {
    title: 'Đơn đang được xử lý',
    suggestion: 'Vui lòng đợi vài giây rồi thử lại.',
  },
  RESOURCE_MODIFIED: {
    title: 'Đơn vừa được cập nhật',
    suggestion: 'Tải lại đơn để xem phiên bản mới nhất.',
  },
  INVALID_STATUS_TRANSITION: {
    title: 'Không thể chuyển trạng thái này',
    suggestion: 'Kiểm tra trạng thái hiện tại của đơn.',
  },
  PICKUP_ALREADY_STARTED: {
    title: 'Đã tới giờ nhận hàng',
    suggestion: 'Không thể hủy/sửa sau khi bắt đầu khung giờ nhận.',
  },
  FARMER_SUSPENDED: {
    title: 'Tài khoản nông dân đang bị tạm khóa',
  },
  FARMER_NOT_APPROVED: {
    title: 'Hồ sơ nông dân chưa được duyệt',
  },
  CUTOFF_NOT_REACHED: {
    title: 'Chưa tới cut-off',
    suggestion: 'Chờ đến cut-off trước khi đánh dấu sẵn sàng.',
  },
  PICKUP_NOT_ENDED: {
    title: 'Chưa hết khung giờ nhận hàng',
    suggestion: 'Hoàn thành/no-show sau khi kết thúc slot.',
  },
  REVIEW_NOT_ALLOWED: {
    title: 'Chưa thể đánh giá',
    suggestion: 'Chỉ đánh giá sau khi đơn hoàn thành.',
  },
  REPLY_ALREADY_EXISTS: {
    title: 'Đã phản hồi đánh giá này',
  },
  RESOURCE_IN_USE: {
    title: 'Tài nguyên đang được sử dụng',
    suggestion: 'Không thể xóa khi còn liên kết dữ liệu.',
  },
  EMAIL_EXISTS: {
    title: 'Email đã được đăng ký',
    suggestion: 'Đăng nhập hoặc dùng email khác.',
  },
  INVALID_CREDENTIALS: {
    title: 'Email hoặc mật khẩu không đúng',
  },
  ACCOUNT_LOCKED: {
    title: 'Tài khoản đã bị khóa',
    suggestion: 'Liên hệ quản trị viên để được hỗ trợ.',
  },
  TOKEN_INVALID: {
    title: 'Phiên đăng nhập hết hạn',
    suggestion: 'Vui lòng đăng nhập lại.',
  },
  VALIDATION_ERROR: {
    title: 'Dữ liệu không hợp lệ',
    suggestion: 'Kiểm tra lại các trường đánh dấu lỗi.',
  },
  CONFLICT_RETRY: {
    title: 'Xung đột dữ liệu',
    suggestion: 'Tải lại và thử lại thao tác.',
  },
  OVERDUE_ORDERS_PENDING: {
    title: 'Còn đơn quá hạn',
    suggestion: 'Xử lý hết đơn quá hạn trước khi áp dụng mẫu tồn kho tuần.',
  },
  AI_UNAVAILABLE: {
    title: 'Trợ lý AI tạm thời không khả dụng',
    suggestion: 'Vui lòng thử lại sau ít phút.',
  },
};

export function mapErrorCode(code: string | undefined | null): ErrorAction {
  if (!code) {
    return { title: 'Đã xảy ra lỗi', suggestion: 'Vui lòng thử lại.' };
  }
  return (
    ERROR_MAP[code] ?? {
      title: 'Đã xảy ra lỗi',
      suggestion: 'Vui lòng thử lại.',
    }
  );
}

export function getErrorMessage(
  code: string | undefined | null,
  fallback?: string,
): string {
  if (fallback) return fallback;
  return mapErrorCode(code).title;
}
