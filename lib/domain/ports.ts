// Interface hạ tầng mà services dùng (00-CONG-NGHE-QUY-UOC mục 2). Hiện thực nằm ở lib/infra.

export interface HisRequestOptions {
  timeoutMs?: number;
}

/** Cổng gọi ApiDatKham của một cơ sở. */
export interface HisGateway {
  call<T>(facilityId: string, path: string, body: unknown, opt?: HisRequestOptions): Promise<T>;
}

export interface CreatePaymentInput {
  facilityId: string;
  orderCode: string;
  amount: number;
  /** Hạn thanh toán – cổng có link (PayOS) tự khóa link khi hết hạn. */
  expiresAt?: Date;
}

export interface PaymentQr {
  bankCode: string;
  accountNo: string;
  accountName: string;
  amount: number;
  content: string;
  qrImageUrl: string;
  /** Trang thanh toán của cổng (PayOS) – có sẵn các lựa chọn app/ví. */
  checkoutUrl?: string;
  expiresAt: Date;
}

/** Thanh toán theo cơ sở – mỗi cơ sở 1 tài khoản ngân hàng riêng (C07 mục 5). */
export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<PaymentQr>;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export interface Mailer {
  send(msg: MailMessage): Promise<void>;
}

export interface StoredFile {
  key: string; // đường dẫn tương đối, ví dụ 2026/10/3f2a….webp
  url: string; // /uploads/2026/10/3f2a….webp (chỉ với tệp công khai)
  size: number;
  mime: string;
}

/** Lưu tệp trên ổ đĩa server (00-CONG-NGHE-QUY-UOC mục 3). */
export interface Storage {
  save(input: { data: Buffer; mime: string; visibility: 'public' | 'private' }): Promise<StoredFile>;
  read(key: string, visibility: 'public' | 'private'): Promise<Buffer>;
  remove(key: string, visibility: 'public' | 'private'): Promise<void>;
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

// A08 – Cổng lưu mẫu email, nhật ký và thông báo trong web.
export type TemplateCode = 'ACCOUNT_CREATED' | 'PASSWORD_RESET' | 'PASSWORD_ISSUED' | 'PASSWORD_CHANGED' | 'BOOKING_SUCCESS' | 'BOOKING_REMIND' | 'BOOKING_CANCELLED' | 'REFUND_DONE' | 'EMAIL_CHANGED';
export interface EmailTemplateRow { code: TemplateCode; subject: string; bodyJson: { text: string }; updatedAt?: Date }
export interface NotificationRow { id: string; type: string; title: string; body: string; link: string | null; readAt: Date | null; createdAt: Date }
export interface EmailLogRow { id: string; template: string; toHash: string; status: string; createdAt: Date }
export interface NewNotification { type: 'BOOKED' | 'REMIND' | 'CANCELLED' | 'REFUNDED' | 'RESULT_READY' | 'SYSTEM'; title: string; body: string; link?: string | null }
export interface EmailJob { code: TemplateCode; to: string; vars: Record<string, string>; attachments?: { filename: string; base64: string }[] }
export interface EmailQueue { add(job: EmailJob): Promise<void> }
export interface NotificationRepository {
  getTemplate(code: TemplateCode): Promise<EmailTemplateRow | null>;
  listTemplates(): Promise<EmailTemplateRow[]>;
  saveTemplate(row: EmailTemplateRow, adminId: string): Promise<void>;
  logEmail(template: TemplateCode, toHash: string, status: 'QUEUED' | 'SENT' | 'FAILED'): Promise<void>;
  listEmailLogs(page: number, pageSize: number): Promise<{ rows: EmailLogRow[]; total: number; today: number }>;
  list(accountId: string, page: number, pageSize: number): Promise<{ rows: NotificationRow[]; total: number }>;
  unreadCount(accountId: string): Promise<number>;
  create(accountId: string, notification: NewNotification): Promise<void>;
  markRead(accountId: string, id: string, at: Date): Promise<boolean>;
  broadcast(input: NewNotification, facilityId: string | null): Promise<number>;
  facilities(scope: string[] | null): Promise<{ id: string; name: string }[]>;
  facilityExists(id: string): Promise<boolean>;
}
export interface NotificationDeps { repo: NotificationRepository; queue: EmailQueue; mailer: Mailer; hashEmail(email: string): string; now(): Date }

// A05 – Cổng quản lý tài khoản bệnh nhân; service không phụ thuộc Prisma hay Redis.
export type AdminPatientAccount = import('@/lib/domain/account/ports').AccountRecord;
export type AccountPatch = Partial<Pick<AdminPatientAccount,
  'cccdEnc' | 'cccdHmac' | 'fullName' | 'fullNameNorm' | 'birthYear' | 'birthDate' | 'gender' |
  'phone' | 'phoneHmac' | 'email' | 'addressLine' | 'insuranceNoEnc' | 'passwordHash' |
  'mustChangePassword' | 'passwordChangedAt' | 'failedCount' | 'lockedUntil' | 'status'>>;
export interface SearchFilter {
  kind: 'cccd' | 'phone' | 'code' | 'name' | 'email';
  value: string;
  facilityIds: string[] | null;
  skip: number;
  take: number;
}
export interface PatientAppointment {
  id: string; code: string; facilityName: string; facilityId: string; examDate: Date;
  status: string; amountVnd: number; createdAt: Date;
}
export interface PatientAuditEvent { action: string; module: string; at: Date; actorType: string }
export interface PatientRepository {
  search(filter: SearchFilter): Promise<{ rows: AdminPatientAccount[]; total: number }>;
  findScoped(id: string, facilityIds: string[] | null): Promise<AdminPatientAccount | null>;
  cccdExists(hmac: string, exceptId: string): Promise<boolean>;
  mutate(id: string, patch: AccountPatch, event: { actorId: string; action: string; reason: string; evidenceKey?: string; facilityId?: string | null; changed?: string[] }): Promise<void>;
  auditView(id: string, actorId: string, action: string, facilityId?: string | null): Promise<void>;
  appointments(id: string, facilityIds: string[] | null, skip: number, take: number): Promise<{ rows: PatientAppointment[]; total: number }>;
  events(id: string, facilityIds: string[] | null): Promise<PatientAuditEvent[]>;
  pendingDeletion(id: string): Promise<Date | null>;
  anonymize(id: string, patch: AccountPatch, actorId: string, reason: string): Promise<void>;
}
export interface AdminPatientsDeps {
  repo: PatientRepository;
  pii: import('@/lib/domain/account/ports').PiiCipher;
  hasher: Pick<import('@/lib/domain/account/ports').PasswordHasher, 'hash'>;
  limiter: import('@/lib/domain/account/ports').RateLimiter;
  tvCache: import('@/lib/domain/account/ports').TokenVersionCache;
  mailer: Mailer;
  storage: Pick<Storage, 'save' | 'remove'>;
  clearIdentity(accountId: string): Promise<void>;
  randomInt(max: number): number;
  randomId(): string;
  now(): Date;
  appUrl: string;
}

// A09 – Cổng đánh giá/liên hệ; tầng hạ tầng chỉ phụ thuộc domain.
export interface ReviewSummary { average: number; count: number }
export interface PublishedReview {
  id: string; rating: number; comment: string | null; reply: string | null; createdAt: Date;
}
export interface ReviewRepository {
  appointment(id: string, accountId: string): Promise<{ facilityId: string; status: string } | null>;
  create(input: { appointmentId: string; accountId: string; facilityId: string; rating: number; comment: string | null }): Promise<{ id: string; status: string }>;
  facilityIdByCode(code: string): Promise<string | null>;
  published(facilityId: string, skip: number, take: number): Promise<PublishedReview[]>;
  summary(facilityId: string): Promise<ReviewSummary>;
}
export interface ReviewCache {
  get(facilityId: string): Promise<ReviewSummary | null>;
  set(facilityId: string, summary: ReviewSummary): Promise<void>;
  del(facilityId: string): Promise<void>;
}
export interface AdminReviewRow {
  id: string; facilityId: string; facilityName: string; rating: number; comment: string | null;
  status: string; reply: string | null; createdAt: Date;
}
export interface ContactRow {
  id: string; type: string; org: string; name: string; phone: string; email: string;
  message: string; status: string; assignee: string | null; note: string | null; createdAt: Date;
}
export interface AdminReviewRepository {
  listReviews(query: { page: number; pageSize: number; facilityId?: string; rating?: number; status?: 'PENDING' | 'SHOWN' | 'HIDDEN' }, facilityIds: string[] | null): Promise<{ rows: AdminReviewRow[]; total: number }>;
  findReview(id: string, facilityIds: string[] | null): Promise<AdminReviewRow | null>;
  updateReview(id: string, input: { status?: 'SHOWN' | 'HIDDEN'; reply?: string | null }): Promise<AdminReviewRow>;
  facilities(ids: string[] | null): Promise<{ id: string; name: string }[]>;
  listContacts(query: { page: number; pageSize: number; status?: 'NEW' | 'IN_PROGRESS' | 'DONE' }): Promise<{ rows: ContactRow[]; total: number }>;
  findContact(id: string): Promise<ContactRow | null>;
  updateContact(id: string, input: { status?: 'NEW' | 'IN_PROGRESS' | 'DONE'; note?: string | null; assignee?: string | null }): Promise<ContactRow>;
  assigneeExists(id: string): Promise<boolean>;
  assignees(): Promise<{ id: string; name: string }[]>;
  audit(input: { actorId: string; action: string; facilityId: string | null; target: string }): Promise<void>;
}

// A06 – Cổng quản trị phiếu khám. Repository luôn nhận phạm vi cơ sở do phiên admin cấp.
export interface AdminAppointmentFilter {
  facilityIds: string[] | null;
  facilityId?: string;
  date?: string;
  specialty?: string;
  status?: string;
  payMethod?: string;
  bookingApi?: string;
  hasHisError?: boolean;
  code?: string;
  skip: number;
  take: number;
}
export interface AdminAppointmentRow {
  accountId: string; // A06: chỉ dùng ở server để xác minh MaBN qua IdentityService khi hủy.
  id: string; code: string; facilityId: string; facilityName: string; facilityCode: string;
  patientName: string; maBN: string | null; isNewPatient: boolean;
  specialtyName: string; doctorName: string | null; roomName: string;
  examDate: Date; slotLabel: string; status: string; payMethod: string;
  bookingApi: string; objectType: string; amount: number; stt: number | null;
  hisBookingId: string | null; hisError: string | null; cancelRequest: boolean;
  checkedInAt: Date | null; paidAt: Date | null; createdAt: Date;
}
export interface AdminAppointmentDetail extends AdminAppointmentRow {
  events: { fromStatus: string | null; toStatus: string; actorType: string; note: string | null; at: Date }[];
  outbox: { command: string; attempts: number; lastError: string | null; nextRunAt: Date; doneAt: Date | null; createdAt: Date }[];
}
export interface AdminAppointmentRepository {
  list(filter: AdminAppointmentFilter): Promise<{ rows: AdminAppointmentRow[]; total: number }>;
  find(code: string, facilityIds: string[] | null): Promise<AdminAppointmentDetail | null>;
  facilities(ids: string[] | null): Promise<{ id: string; name: string }[]>;
  retry(code: string, actorId: string, at: Date): Promise<void>;
  note(code: string, actorId: string, note: string): Promise<void>;
  confirmCancel(code: string, actorId: string, at: Date, note: string): Promise<void>;
  cancel(code: string, actorId: string, at: Date, note: string): Promise<void>;
  requestCancel(code: string, actorId: string, at: Date, note: string): Promise<void>;
  setStt(code: string, actorId: string, stt: number, hisBookingId: string, at: Date): Promise<void>;
  checkIn(code: string, actorId: string, at: Date): Promise<boolean>;
  auditView(code: string, actorId: string, facilityId: string): Promise<void>;
  email(code: string): Promise<string | null>;
  auditResend(code: string, actorId: string, facilityId: string): Promise<void>;
}

// G1HOME – dữ liệu CMS công khai; hạ tầng chỉ trả dữ liệu, service kiểm Zod và hiệu lực.
export interface SiteBanner {
  id: string;
  placement: string;
  imageUrl: string;
  imageMobileUrl: string | null;
  title: string | null;
  link: string | null;
  startAt: Date | null;
  endAt: Date | null;
  sortOrder: number;
  active: boolean;
}
export interface SitePopup {
  id: string;
  imageUrl: string;
  link: string | null;
  pages: string[];
  frequency: 'ONCE_SESSION' | 'ONCE_DAY';
  startAt: Date | null;
  endAt: Date | null;
  active: boolean;
}
export interface SiteReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
export interface SiteContentRepository {
  blocks(): Promise<unknown[]>;
  banners(): Promise<unknown[]>;
  popups(): Promise<unknown[]>;
  menus(): Promise<unknown[]>;
  testimonials(): Promise<unknown[]>;
  announcement(): Promise<unknown>;
}
