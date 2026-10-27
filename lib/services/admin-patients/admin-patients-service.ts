import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { cccdMatchesBirthYear, cccdMatchesGenderCentury, normalizeName } from '@/lib/domain/account/cccd';
import { generateTempPassword } from '@/lib/domain/account/password';
import type { AccountRecord } from '@/lib/domain/account/ports';
import { passwordResetMail } from '@/lib/services/auth/mail-templates';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { formatDateTime, maskCccd, maskEmail, maskName, maskPhone } from '@/lib/utils/format';
import type { PatientActionInput, PatientSearchInput, PatientUpdateInput } from './schemas';
import type { AccountPatch, AdminPatientsDeps } from './types';

const PAGE_SIZE = 20;

function requirePermission(
  actor: AdminPrincipal,
  permission:
    | typeof PERMISSIONS.PATIENT_READ
    | typeof PERMISSIONS.PATIENT_RESET_PASSWORD
    | typeof PERMISSIONS.AUDIT_READ,
) {
  if (!can({ name: actor.role, permissions: actor.permissions }, permission)) throw new AppError('FORBIDDEN');
}

function requireCentral(actor: AdminPrincipal) {
  if (actor.facilityIds !== null) throw new AppError('FORBIDDEN');
}

export class AdminPatientsService {
  constructor(private readonly d: AdminPatientsDeps) {}

  async search(actor: AdminPrincipal, input: PatientSearchInput) {
    requirePermission(actor, PERMISSIONS.PATIENT_READ);
    if (input.kind === 'name' || input.kind === 'email') requireCentral(actor);
    const limit = await this.d.limiter.hit(`a05:search:${actor.id}`, 60, 60);
    if (!limit.allowed) throw new AppError('RATE_LIMITED');
    const value =
      input.kind === 'cccd' || input.kind === 'phone'
        ? this.d.pii.hmac(input.q)
        : input.kind === 'name'
          ? normalizeName(input.q)
          : input.kind === 'email'
            ? input.q.toLowerCase()
            : input.q.toUpperCase();
    const { rows, total } = await this.d.repo.search({
      kind: input.kind,
      value,
      facilityIds: actor.facilityIds,
      skip: (input.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    return {
      rows: rows.map((a) => ({
        id: a.id,
        nameMasked: maskName(a.fullName),
        cccdMasked: maskCccd(this.d.pii.decrypt(a.cccdEnc)),
        phoneMasked: maskPhone(a.phone),
        emailMasked: maskEmail(a.email),
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      page: input.page,
      pageSize: PAGE_SIZE,
    };
  }

  async detail(actor: AdminPrincipal, id: string) {
    const a = await this.requireAccount(actor, id);
    return {
      id: a.id,
      fullName: a.fullName,
      cccdMasked: maskCccd(this.d.pii.decrypt(a.cccdEnc)),
      phoneMasked: maskPhone(a.phone),
      emailMasked: maskEmail(a.email),
      birthYear: a.birthYear,
      gender: a.gender,
      status: a.status,
      failedCount: a.failedCount,
      lockedUntil: a.lockedUntil?.toISOString() ?? null,
      passwordChangedAt: a.passwordChangedAt?.toISOString() ?? null,
      lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      deletionRequestedAt: (await this.d.repo.pendingDeletion(id))?.toISOString() ?? null,
    };
  }

  async revealCccd(actor: AdminPrincipal, id: string) {
    requireCentral(actor);
    requirePermission(actor, PERMISSIONS.AUDIT_READ);
    const a = await this.requireAccount(actor, id);
    // A05 mục 2: ghi audit bền vững trước khi trả dữ liệu nhạy cảm.
    await this.d.repo.auditView(id, actor.id, 'VIEW_PII');
    return { cccd: this.d.pii.decrypt(a.cccdEnc) };
  }

  async appointments(actor: AdminPrincipal, id: string, page: number) {
    await this.requireAccount(actor, id);
    const result = await this.d.repo.appointments(id, actor.facilityIds, (page - 1) * PAGE_SIZE, PAGE_SIZE);
    return {
      rows: result.rows.map((a) => ({
        ...a,
        examDate: a.examDate.toISOString().slice(0, 10),
        createdAt: a.createdAt.toISOString(),
      })),
      total: result.total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  async events(actor: AdminPrincipal, id: string) {
    await this.requireAccount(actor, id);
    return (await this.d.repo.events(id, actor.facilityIds)).map((e) => ({ ...e, at: formatDateTime(e.at) }));
  }

  async update(actor: AdminPrincipal, id: string, input: PatientUpdateInput) {
    requireCentral(actor);
    const a = await this.requireAccount(actor, id);
    if (a.status === 'DELETED') throw new AppError('A05_ACCOUNT_DELETED');
    const cccd = input.cccd ?? this.d.pii.decrypt(a.cccdEnc);
    const birthYear = input.birthYear ?? a.birthYear;
    const gender = input.gender ?? a.gender;
    if (!cccdMatchesBirthYear(cccd, birthYear) || !cccdMatchesGenderCentury(cccd, birthYear, gender as 0 | 1))
      throw new AppError('ACCOUNT_CCCD_MISMATCH');
    if (
      input.cccd &&
      this.d.pii.hmac(input.cccd) !== a.cccdHmac &&
      (await this.d.repo.cccdExists(this.d.pii.hmac(input.cccd), id))
    )
      throw new AppError('ACCOUNT_CCCD_EXISTS');
    const evidence = Buffer.from(input.evidence.base64, 'base64');
    if (
      evidence.length === 0 ||
      evidence.length > 5_000_000 ||
      !this.validImage(input.evidence.mime, evidence)
    )
      throw new AppError('A05_EVIDENCE_INVALID');
    const patch: AccountPatch = {};
    if (input.cccd) {
      patch.cccdEnc = this.d.pii.encrypt(input.cccd);
      patch.cccdHmac = this.d.pii.hmac(input.cccd);
    }
    if (input.fullName) {
      patch.fullName = input.fullName;
      patch.fullNameNorm = normalizeName(input.fullName);
    }
    if (input.birthYear !== undefined) patch.birthYear = input.birthYear;
    if (input.gender !== undefined) patch.gender = input.gender;
    if (input.phone) {
      patch.phone = input.phone;
      patch.phoneHmac = this.d.pii.hmac(input.phone);
    }
    if (input.email) patch.email = input.email.toLowerCase();
    const file = await this.d.storage.save({
      data: evidence,
      mime: input.evidence.mime,
      visibility: 'private',
    });
    try {
      await this.d.repo.mutate(id, patch, {
        actorId: actor.id,
        action: 'PATIENT_UPDATE',
        reason: input.reason,
        evidenceKey: file.key,
        changed: Object.keys(patch),
      });
    } catch (error) {
      await this.d.storage.remove(file.key, 'private');
      throw error;
    }
    await Promise.all([this.d.tvCache.del(id), this.d.clearIdentity(id)]);
    return this.detail(actor, id);
  }

  async action(actor: AdminPrincipal, id: string, input: PatientActionInput) {
    const a = await this.requireAccount(actor, id);
    if (a.status === 'DELETED') throw new AppError('A05_ACCOUNT_DELETED');
    if (input.action === 'RESET_PASSWORD') return this.resetPassword(actor, a, input.reason);
    requireCentral(actor);
    if (input.action === 'DELETE') return this.delete(actor, a, input.reason);
    const status =
      input.action === 'LOCK'
        ? 'LOCKED'
        : input.action === 'DISPUTE'
          ? 'DISPUTED'
          : input.action === 'UNLOCK'
            ? 'ACTIVE'
            : a.status;
    if (input.action === 'UNLOCK' && a.status === 'DISPUTED') throw new AppError('A05_DISPUTE_UNRESOLVED');
    if (input.action === 'UNLOCK' && a.status !== 'LOCKED') throw new AppError('A05_INVALID_TRANSITION');
    if (input.action === 'LOCK' && a.status !== 'ACTIVE') throw new AppError('A05_INVALID_TRANSITION');
    if (input.action === 'DISPUTE' && a.status === 'DISPUTED') throw new AppError('A05_INVALID_TRANSITION');
    await this.d.repo.mutate(
      id,
      { status, ...(input.action === 'UNLOCK' ? { lockedUntil: null, failedCount: 0 } : {}) },
      { actorId: actor.id, action: `PATIENT_${input.action}`, reason: input.reason },
    );
    await this.d.tvCache.del(id);
    return { status };
  }

  private async resetPassword(actor: AdminPrincipal, a: AccountRecord, reason: string) {
    requirePermission(actor, PERMISSIONS.PATIENT_RESET_PASSWORD);
    if (a.status === 'DISPUTED') throw new AppError('A05_DISPUTE_UNRESOLVED');
    const limit = await this.d.limiter.hit(`a05:reset:${a.id}`, 3, 3600);
    if (!limit.allowed) throw new AppError('RATE_LIMITED');
    const password = generateTempPassword(this.d.randomInt);
    await this.d.repo.mutate(
      a.id,
      {
        passwordHash: await this.d.hasher.hash(password),
        mustChangePassword: true,
        passwordChangedAt: this.d.now(),
        failedCount: 0,
        lockedUntil: null,
        status: 'ACTIVE',
      },
      { actorId: actor.id, action: 'PATIENT_RESET_PASSWORD', reason },
    );
    await this.d.tvCache.del(a.id);
    const mail = passwordResetMail({
      fullName: a.fullName,
      password,
      loginUrl: `${this.d.appUrl}/dang-nhap`,
    });
    try {
      await this.d.mailer.send({ to: a.email, subject: mail.subject, html: mail.html });
    } catch {
      await this.d.repo.mutate(
        a.id,
        {
          passwordHash: a.passwordHash,
          mustChangePassword: a.mustChangePassword,
          passwordChangedAt: a.passwordChangedAt,
          status: a.status,
        },
        { actorId: actor.id, action: 'PATIENT_RESET_ROLLBACK', reason: 'Gửi email thất bại' },
      );
      await this.d.tvCache.del(a.id);
      throw new AppError('MAIL_SEND_FAILED');
    }
    return { emailMasked: maskEmail(a.email) };
  }

  private async delete(actor: AdminPrincipal, a: AccountRecord, reason: string) {
    if (!(await this.d.repo.pendingDeletion(a.id))) throw new AppError('A05_NO_DELETE_REQUEST');
    const token = this.d.randomId();
    await this.d.repo.anonymize(
      a.id,
      {
        cccdEnc: this.d.pii.encrypt(token),
        cccdHmac: this.d.pii.hmac(token),
        fullName: 'Tài khoản đã xóa',
        fullNameNorm: 'TAI KHOAN DA XOA',
        birthYear: 1900,
        birthDate: null,
        gender: 0,
        phone: '',
        phoneHmac: this.d.pii.hmac(`${token}:phone`),
        email: `deleted+${a.id}@invalid.local`,
        addressLine: null,
        insuranceNoEnc: null,
        passwordHash: await this.d.hasher.hash(this.d.randomId()),
        status: 'DELETED',
        lockedUntil: null,
        failedCount: 0,
      },
      actor.id,
      reason,
    );
    await Promise.all([this.d.tvCache.del(a.id), this.d.clearIdentity(a.id)]);
    return { status: 'DELETED' as const };
  }

  private validImage(mime: string, data: Buffer): boolean {
    return mime === 'image/jpeg'
      ? data[0] === 0xff && data[1] === 0xd8
      : mime === 'image/png'
        ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mime === 'image/webp' &&
          data.toString('ascii', 0, 4) === 'RIFF' &&
          data.toString('ascii', 8, 12) === 'WEBP';
  }

  private async requireAccount(actor: AdminPrincipal, id: string) {
    requirePermission(actor, PERMISSIONS.PATIENT_READ);
    const a = await this.d.repo.findScoped(id, actor.facilityIds);
    if (!a) throw new AppError('NOT_FOUND');
    return a;
  }
}
