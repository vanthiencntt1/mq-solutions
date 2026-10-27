// Tên hàng đợi và lịch chạy job nền (C09 mục 1). Mỗi job khóa theo (job, facilityId) để không chạy chồng.

export const QUEUES = {
  health: 'his-health', // kiểm tra kết nối ApiDatKham – mỗi 1 phút
  hisRetry: 'his-retry', // gửi lại lệnh HIS lỗi (his_outbox) – mỗi 1 phút
  statusSync: 'status-sync', // cập nhật trạng thái phiếu trong ngày – 5–10 phút, giờ làm việc
  reconcile: 'reconcile', // đối soát cuối ngày theo facility.reconcile_time
  email: 'email', // gửi email (Gmail SMTP)
  paymentExpire: 'payment-expire', // phiếu chờ thanh toán quá 15 phút → QUA_HAN
  // C08 – email nhắc lịch trước ngày khám.
  remind: 'booking-remind',
  // A10: quét cảnh báo vận hành sau mỗi phút.
  reportAlert: 'report-alert',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Lịch lặp (cron, giờ Việt Nam). Đối soát chạy mỗi 15 phút và tự lọc cơ sở đến giờ reconcile_time. */
export const REPEATS: { queue: QueueName; name: string; pattern: string }[] = [
  { queue: QUEUES.health, name: 'check-all', pattern: '* * * * *' },
  { queue: QUEUES.hisRetry, name: 'retry-due', pattern: '* * * * *' },
  { queue: QUEUES.paymentExpire, name: 'expire-due', pattern: '* * * * *' },
  { queue: QUEUES.statusSync, name: 'sync-today', pattern: '*/5 6-20 * * *' },
  { queue: QUEUES.reconcile, name: 'reconcile-due', pattern: '*/15 * * * *' },
  // C08 – chạy 18:00 giờ Việt Nam để nhắc lịch ngày hôm sau.
  { queue: QUEUES.remind, name: 'remind-tomorrow', pattern: '0 18 * * *' },
  // A10 mục 3: phát hiện cơ sở DOWN, phiếu HIS tồn và đối soát lỗi.
  { queue: QUEUES.reportAlert, name: 'check-alerts', pattern: '* * * * *' },
];
