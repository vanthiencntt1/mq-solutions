// Bảng mã lỗi nghiệp vụ tập trung (00-CONG-NGHE-QUY-UOC mục 6). Thông điệp hiển thị cho người dùng bằng tiếng Việt.

export const ERROR_CATALOG = {
  VALIDATION_FAILED: { status: 422, message: 'Dữ liệu không hợp lệ' },
  BAD_REQUEST: { status: 400, message: 'Yêu cầu không hợp lệ' },
  UNAUTHENTICATED: { status: 401, message: 'Vui lòng đăng nhập' },
  FORBIDDEN: { status: 403, message: 'Bạn không có quyền thực hiện thao tác này' },
  NOT_FOUND: { status: 404, message: 'Không tìm thấy dữ liệu' },
  RATE_LIMITED: { status: 429, message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau' },
  INTERNAL: { status: 500, message: 'Hệ thống đang bận, vui lòng thử lại sau' },

  // Tài khoản (C01)
  AUTH_INVALID_CREDENTIALS: { status: 401, message: 'Thông tin đăng nhập không đúng' },
  AUTH_ACCOUNT_LOCKED: {
    status: 403,
    message: 'Tài khoản tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau 15 phút',
  },
  AUTH_MUST_CHANGE_PASSWORD: { status: 403, message: 'Vui lòng đổi mật khẩu trước khi tiếp tục' },
  ACCOUNT_CCCD_EXISTS: {
    status: 409,
    message: 'CCCD này đã được đăng ký. Vui lòng đăng nhập hoặc dùng Quên mật khẩu.',
  },
  ACCOUNT_CCCD_MISMATCH: {
    status: 422,
    message: 'Số CCCD không khớp năm sinh / giới tính, vui lòng kiểm tra lại',
  },
  AUTH_PHONE_AMBIGUOUS: {
    status: 409,
    message: 'Số điện thoại này dùng cho nhiều tài khoản, vui lòng đăng nhập bằng CCCD',
  },
  AUTH_WRONG_PASSWORD: { status: 422, message: 'Mật khẩu hiện tại không đúng' },
  AUTH_PASSWORD_POLICY: { status: 422, message: 'Mật khẩu mới chưa đạt yêu cầu' },
  CAPTCHA_FAILED: { status: 422, message: 'Vui lòng xác nhận bạn không phải robot' },
  MAIL_SEND_FAILED: { status: 502, message: 'Chưa gửi được email, vui lòng thử lại sau ít phút' },

  // Định danh tại cơ sở (C03)
  IDENTITY_MISMATCH: {
    status: 409,
    message: 'Thông tin chưa khớp hồ sơ tại cơ sở, vui lòng mang CCCD đến quầy để cập nhật',
  },
  IDENTITY_NOT_FOUND: { status: 404, message: 'Bạn chưa có hồ sơ tại cơ sở này' },

  // Hồ sơ bệnh án (C04)
  RECORD_FILE_EXPIRED: { status: 403, message: 'Liên kết tệp đã hết hạn, vui lòng tải lại kết quả' },
  RECORD_DATA_INVALID: { status: 502, message: 'Dữ liệu hồ sơ từ cơ sở chưa đúng định dạng' },

  // Đặt khám (C05, C06, C08)
  FACILITY_PAUSED: { status: 503, message: 'Cơ sở đang tạm ngưng đặt khám online' },
  BOOKING_SLOT_FULL: { status: 409, message: 'Khung giờ đã đầy, vui lòng chọn khung khác' },
  // C05 – giới hạn phiếu đang chờ/đang khám tại một cơ sở.
  BOOKING_TOO_MANY_ACTIVE: { status: 409, message: 'Bạn đã có 3 phiếu chưa khám tại cơ sở này' },
  BOOKING_ALREADY_TODAY: { status: 409, message: 'Bạn đã có lịch khám tại cơ sở này trong ngày đã chọn' },
  BOOKING_BHYT_NOT_ALLOWED: { status: 422, message: 'Chỉ bệnh nhân đã khám tại cơ sở mới đặt được BHYT' },
  BOOKING_PATIENT_INFO_MISMATCH: { status: 409, message: 'Thông tin hành chính chưa khớp với cơ sở' },
  CANCEL_NOT_ALLOWED: { status: 409, message: 'Đã quá thời hạn tự hủy, vui lòng liên hệ cơ sở' },
  CANCEL_PAID_NOT_ALLOWED: {
    status: 409,
    message: 'Phiếu đã thanh toán, yêu cầu hủy đã được chuyển cho cơ sở xử lý',
  },

  // Thanh toán (C07)
  PAYMENT_NOT_CONFIGURED: { status: 409, message: 'Cơ sở chưa hỗ trợ thanh toán online' },

  // HIS (C02)
  HIS_UNAVAILABLE: { status: 503, message: 'Chưa kết nối được cơ sở, vui lòng thử lại sau' },
  HIS_ERROR: { status: 502, message: 'Cơ sở trả lỗi, vui lòng thử lại sau' },
  // W06W07 – Nội dung công khai
  CONTENT_INVALID: { status: 500, message: 'Nội dung đang được cập nhật, vui lòng quay lại sau' },
  // A01 – Đăng nhập và phân quyền quản trị
  ADMIN_INVALID_CREDENTIALS: { status: 401, message: 'Email, mật khẩu hoặc mã xác thực không đúng' },
  ADMIN_ACCOUNT_LOCKED: { status: 403, message: 'Tài khoản quản trị tạm khóa, vui lòng thử lại sau 15 phút' },
  ADMIN_INVALID_TOTP: { status: 422, message: 'Mã xác thực 2FA không đúng' },
  ADMIN_WRONG_PASSWORD: { status: 422, message: 'Mật khẩu hiện tại không đúng' },
  ADMIN_PASSWORD_POLICY: { status: 422, message: 'Mật khẩu mới phải khác mật khẩu hiện tại' },
  ADMIN_EMAIL_EXISTS: { status: 409, message: 'Email này đã có tài khoản quản trị' },
  ADMIN_ROLE_EXISTS: { status: 409, message: 'Mã vai trò này đã tồn tại' },
  ADMIN_SELF_LOCK: { status: 409, message: 'Bạn không thể tự khóa tài khoản của mình' },
  ADMIN_SELF_RESET_2FA: { status: 409, message: 'Bạn không thể tự đặt lại 2FA' },
  ADMIN_FACILITY_REQUIRED: { status: 422, message: 'Vai trò này phải gắn với một cơ sở' },
  ADMIN_FACILITY_NOT_ALLOWED: { status: 422, message: 'Vai trò này chỉ được dùng ở phạm vi toàn hệ thống' },
  // A08 – Thông báo và email
  NOTIFICATION_TEMPLATE_VARIABLE: { status: 422, message: 'Mẫu email có biến không hợp lệ hoặc thiếu giá trị' },
  // A09 – Đánh giá cơ sở
  REVIEW_APPOINTMENT_NOT_FOUND: { status: 404, message: 'Không tìm thấy phiếu khám của bạn' },
  REVIEW_NOT_ELIGIBLE: { status: 409, message: 'Chỉ có thể đánh giá sau khi đã khám' },
  REVIEW_ALREADY_EXISTS: { status: 409, message: 'Phiếu khám này đã được đánh giá' },
  // A02 – Quản lý cơ sở y tế
  FACILITY_EXISTS: { status: 409, message: 'Mã hoặc đường dẫn cơ sở đã tồn tại' },
  FACILITY_IMAGE_INVALID: { status: 422, message: 'Ảnh phải là JPEG, PNG hoặc WebP và không quá 10 MB' },
  FACILITY_HEALTH_REQUIRED: { status: 409, message: 'Cần kiểm tra kết nối HIS thành công trước khi bật hoạt động' },
  // A04 – Quản lý nội dung
  CONTENT_SLUG_EXISTS: { status: 409, message: 'Đường dẫn nội dung đã được sử dụng' },
  CONTENT_EMPTY: { status: 422, message: 'Nội dung cần ít nhất một khối trước khi xuất bản' },
  CONTENT_REVIEWER_REQUIRED: { status: 422, message: 'Bài viết y khoa cần người duyệt chuyên môn' },
  CONTENT_SCHEDULE_INVALID: { status: 422, message: 'Thời điểm hẹn đăng phải ở tương lai' },
  CONTENT_DATE_RANGE: { status: 422, message: 'Thời điểm kết thúc phải sau thời điểm bắt đầu' },
  CONTENT_MENU_CYCLE: { status: 422, message: 'Mục menu không thể là mục cha của chính nó' },
  CONTENT_IN_USE: { status: 409, message: 'Nội dung đang được sử dụng, vui lòng gỡ liên kết trước' },
  // A05 – Quản lý tài khoản bệnh nhân
  A05_ACCOUNT_DELETED: { status: 409, message: 'Tài khoản đã được ẩn danh' },
  A05_DISPUTE_UNRESOLVED: { status: 409, message: 'Cần xác minh chủ tài khoản và cập nhật thông tin trước khi mở tranh chấp' },
  A05_INVALID_TRANSITION: { status: 409, message: 'Trạng thái tài khoản không phù hợp với thao tác' },
  A05_NO_DELETE_REQUEST: { status: 409, message: 'Chưa có yêu cầu xóa tài khoản từ bệnh nhân' },
  A05_EVIDENCE_INVALID: { status: 422, message: 'Ảnh giấy tờ phải là JPEG, PNG hoặc WebP, tối đa 5 MB' },
  // C06 – Xác nhận đặt khám và gửi HIS
  BOOKING_IN_PROGRESS: { status: 409, message: 'Phiếu đang được xử lý, vui lòng chờ một chút' },
  BOOKING_PAYMENT_NOT_ALLOWED: { status: 422, message: 'Cơ sở không hỗ trợ hình thức thanh toán đã chọn' },
  BOOKING_PAYMENT_PENDING: { status: 409, message: 'Phiếu chưa được xác nhận thanh toán' },
  BOOKING_ADDRESS_REQUIRED: { status: 422, message: 'Vui lòng chọn đầy đủ địa chỉ để tạo hồ sơ tại cơ sở' },
  BOOKING_DOCTOR_REQUIRED: { status: 409, message: 'Khung giờ chưa có bác sĩ phụ trách, vui lòng chọn lịch khác' },
  BOOKING_HIS_CONFLICT: { status: 409, message: 'Lịch tại cơ sở chưa khớp phiếu, vui lòng liên hệ hỗ trợ' },
  // A06 – Lịch đặt, yêu cầu hủy và check-in tại quầy
  A06_QR_INVALID: { status: 422, message: 'Mã QR không hợp lệ' },
  A06_CHECKIN_NOT_ALLOWED: { status: 409, message: 'Phiếu chưa đủ điều kiện check-in' },
  A06_ALREADY_CHECKED_IN: { status: 409, message: 'Phiếu đã được check-in' },
  A06_CANCEL_REQUEST_REQUIRED: { status: 409, message: 'Phiếu không có yêu cầu hủy đang chờ xử lý' },
  A06_RETRY_NOT_ALLOWED: { status: 409, message: 'Chỉ gửi lại HIS cho phiếu đang lỗi HIS' },
  // A10 – Báo cáo và giám sát
  A10_REPORT_TOO_LARGE: { status: 422, message: 'Báo cáo có quá nhiều nhóm dữ liệu, vui lòng thu hẹp khoảng ngày hoặc chọn cơ sở' },
  // C08 – Quy định hủy của cơ sở phải có dạng D-n HH:mm.
  CANCEL_POLICY_INVALID: { status: 500, message: 'Quy định hủy của cơ sở chưa hợp lệ, vui lòng liên hệ hỗ trợ' },
  // C07 – Thanh toán SePay theo cơ sở.
  PAYMENT_WEBHOOK_UNAUTHORIZED: { status: 401, message: 'Khóa xác thực webhook không hợp lệ' },
  PAYMENT_NOT_AVAILABLE: { status: 409, message: 'Phiếu này chưa thể thanh toán online' },
  PAYMENT_QR_UNAVAILABLE: { status: 502, message: 'Chưa tải được ảnh QR, vui lòng dùng thông tin chuyển khoản bên dưới' },
  // A07 – Xử lý ngoại lệ giao dịch, hoàn tiền và chạy đối soát.
  A07_MATCH_STATE: { status: 409, message: 'Giao dịch hoặc phiếu không còn ở trạng thái có thể gán' },
  A07_MATCH_FACILITY: { status: 409, message: 'Phiếu không thuộc cơ sở nhận tiền hoặc không thanh toán online' },
  A07_REFUND_STATE: { status: 409, message: 'Giao dịch không còn ở trạng thái có thể hoàn tiền' },
  A07_REFUND_AMOUNT: { status: 422, message: 'Số tiền hoàn không hợp lệ với giao dịch' },
  A07_REFUND_TWO_PERSON: { status: 409, message: 'Người lập yêu cầu không thể tự duyệt hoàn tiền' },
  A07_REFUND_APPROVAL_REQUIRED: { status: 409, message: 'Khoản hoàn trên 2.000.000đ cần người khác duyệt trước' },
  A07_RECONCILE_BUSY: { status: 409, message: 'Cơ sở và ngày khám này đang được đối soát, vui lòng thử lại sau' },
  // G2FEEDBACK – Góp ý bệnh nhân (A09 mục 3).
  G2_FEEDBACK_APPOINTMENT_NOT_FOUND: { status: 404, message: 'Không tìm thấy phiếu khám của bạn' },
  G2_FEEDBACK_ASSIGNEE_INVALID: { status: 422, message: 'Người xử lý không thuộc phạm vi cơ sở phù hợp' },
  G2_FEEDBACK_CHANGED: { status: 409, message: 'Góp ý vừa được cập nhật, vui lòng tải lại trang' },
  G2_FEEDBACK_NOT_DONE: { status: 409, message: 'Chỉ gửi lại email cho góp ý đã xử lý xong' },
  G2_FEEDBACK_EMAIL_UNAVAILABLE: { status: 409, message: 'Tài khoản chưa có email để nhận thông báo' },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? ERROR_CATALOG[code].message);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_CATALOG[code].status;
    this.details = details;
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
