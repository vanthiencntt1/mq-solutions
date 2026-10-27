export const FEEDBACK_TOPICS = {
  GOPY: 'Góp ý dịch vụ',
  KHIEU_NAI: 'Khiếu nại',
  HO_TRO: 'Yêu cầu hỗ trợ',
  KHAC: 'Khác',
} as const;

export const FEEDBACK_STATUS = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  DONE: 'Đã xong',
} as const;

export type FeedbackStatus = keyof typeof FEEDBACK_STATUS;
export type FeedbackTopic = keyof typeof FEEDBACK_TOPICS;

export interface FeedbackRow {
  id: string;
  accountId: string;
  topic: FeedbackTopic;
  message: string;
  appointmentId: string | null;
  appointmentCode: string | null;
  facilityId: string | null;
  facilityName: string | null;
  status: FeedbackStatus;
  assignee: string | null;
  createdAt: Date;
}

export interface FeedbackAppointment {
  id: string;
  code: string;
  facilityName: string;
  examDate: Date;
}
