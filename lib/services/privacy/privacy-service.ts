import { z } from 'zod';
import type { PasswordHasher, PiiCipher, RateLimiter } from '@/lib/domain/account/ports';
import { AppError } from '@/lib/domain/errors';
import { maskCccd, maskEmail, maskPhone } from '@/lib/utils/format';

// C10 mục 2: yêu cầu xóa được ghi bền vững để nhân viên xử lý nghĩa vụ lưu trữ.
export const DeletionRequestSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('XOA TAI KHOAN'),
});

export interface PrivacyAccount {
  id: string;
  status: string;
  passwordHash: string;
  cccdEnc: string;
  phone: string;
  email: string;
  birthYear: number;
  gender: number;
  consentVersion: string;
  consentAt: Date;
  createdAt: Date;
}

export interface PrivacyAppointment {
  code: string;
  facility: string;
  examDate: Date;
  status: string;
  amount: number;
  createdAt: Date;
}

export interface PrivacyRepository {
  findAccount(accountId: string): Promise<PrivacyAccount | null>;
  findDeletionRequest(accountId: string): Promise<Date | null>;
  createDeletionRequest(accountId: string, ipHash?: string): Promise<Date>;
  listAppointments(accountId: string): Promise<PrivacyAppointment[]>;
  recordExport(accountId: string, ipHash?: string): Promise<void>;
}

export interface PrivacyDeps {
  repository: PrivacyRepository;
  hasher: Pick<PasswordHasher, 'verify'>;
  pii: Pick<PiiCipher, 'decrypt'>;
  limiter: RateLimiter;
  now: () => Date;
}

export class PrivacyService {
  constructor(private readonly deps: PrivacyDeps) {}

  async getDeletionRequest(accountId: string): Promise<string | null> {
    const at = await this.deps.repository.findDeletionRequest(accountId);
    return at?.toISOString() ?? null;
  }

  async requestDeletion(accountId: string, password: string, ipHash?: string) {
    const limit = await this.deps.limiter.hit(`privacy:delete:${accountId}`, 5, 3600);
    if (!limit.allowed) throw new AppError('RATE_LIMITED');
    const account = await this.deps.repository.findAccount(accountId);
    if (!account || account.status !== 'ACTIVE') throw new AppError('UNAUTHENTICATED');
    if (!(await this.deps.hasher.verify(account.passwordHash, password)))
      throw new AppError('AUTH_WRONG_PASSWORD');
    const existing = await this.deps.repository.findDeletionRequest(accountId);
    const at = existing ?? (await this.deps.repository.createDeletionRequest(accountId, ipHash));
    return { requestedAt: at.toISOString(), pending: true };
  }

  async exportData(accountId: string, ipHash?: string) {
    const account = await this.deps.repository.findAccount(accountId);
    if (!account || account.status !== 'ACTIVE') throw new AppError('UNAUTHENTICATED');
    const appointments = await this.deps.repository.listAppointments(accountId);
    await this.deps.repository.recordExport(accountId, ipHash);
    // C10 mục 2: chỉ xuất dữ liệu web sở hữu, tránh lộ định danh đầy đủ hoặc MaBN lên trình duyệt.
    return {
      exportedAt: this.deps.now().toISOString(),
      scope: 'Tài khoản và lịch đặt khám trên MQ Solutions',
      account: {
        cccdMasked: maskCccd(this.deps.pii.decrypt(account.cccdEnc)),
        phoneMasked: maskPhone(account.phone),
        emailMasked: maskEmail(account.email),
        birthYear: account.birthYear,
        gender: account.gender,
        consentVersion: account.consentVersion,
        consentAt: account.consentAt.toISOString(),
        createdAt: account.createdAt.toISOString(),
      },
      appointments: appointments.map((item) => ({
        code: item.code,
        facility: item.facility,
        examDate: item.examDate.toISOString().slice(0, 10),
        status: item.status,
        amountVnd: item.amount,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}
