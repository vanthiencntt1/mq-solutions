import type { RateLimiter } from '@/lib/domain/account/ports';
import type { Mailer } from '@/lib/domain/ports';
import type { AdminFeedbackListQuery, FeedbackListQuery, UpdateFeedbackInput } from './schemas';
import type { FeedbackAppointment, FeedbackRow, FeedbackTopic } from './types';

export interface FeedbackRepository {
  ownAppointment(id: string, accountId: string): Promise<{ id: string } | null>;
  myAppointments(accountId: string): Promise<FeedbackAppointment[]>;
  create(
    accountId: string,
    input: { topic: FeedbackTopic; message: string; appointmentId: string | null },
  ): Promise<FeedbackRow>;
  listMine(accountId: string, query: FeedbackListQuery): Promise<{ rows: FeedbackRow[]; total: number }>;
  listAdmin(
    query: AdminFeedbackListQuery,
    scope: string[] | null,
  ): Promise<{ rows: FeedbackRow[]; total: number }>;
  findAdmin(id: string, scope: string[] | null): Promise<FeedbackRow | null>;
  assignees(scope: string[] | null): Promise<{ id: string; name: string; facilityId: string | null }[]>;
  assigneeAllowed(id: string, facilityId: string | null): Promise<boolean>;
  updateAdmin(row: FeedbackRow, input: UpdateFeedbackInput, actorId: string): Promise<FeedbackRow>;
  auditEmailRetry(id: string, actorId: string, facilityId: string | null): Promise<void>;
  patientEmail(accountId: string): Promise<string | null>;
}

export interface FeedbackDeps {
  repo: FeedbackRepository;
  limiter: RateLimiter;
  mailer: Mailer;
}
