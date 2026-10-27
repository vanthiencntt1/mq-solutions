import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import type { AdminUserDeps, AdminUserRow } from '@/lib/domain/admin/ports';
import type {
  AdminRoleCreateInput,
  AdminUserCreateInput,
  AdminUserUpdateInput,
} from '@/lib/domain/admin/schemas';
import type { AdminPrincipal } from '@/lib/services/admin-auth';

function requireManage(actor: AdminPrincipal): void {
  if (!can({ name: actor.role, permissions: actor.permissions }, PERMISSIONS.STAFF_MANAGE))
    throw new AppError('FORBIDDEN');
}

function allowed(actor: AdminPrincipal, target: AdminUserRow | null): void {
  requireManage(actor);
  if (actor.role !== 'FACILITY_MANAGER') return;
  if (!target || target.role !== 'FACILITY_STAFF' || !actor.facilityIds?.includes(target.facilityId ?? ''))
    throw new AppError('FORBIDDEN');
}

export class AdminUsersService {
  constructor(private readonly d: AdminUserDeps) {}

  async list(actor: AdminPrincipal, page: number, pageSize: number) {
    requireManage(actor);
    return this.d.repo.list(
      actor.facilityIds,
      (page - 1) * pageSize,
      pageSize,
      actor.role === 'FACILITY_MANAGER' ? 'FACILITY_STAFF' : undefined,
    );
  }

  async options(actor: AdminPrincipal) {
    requireManage(actor);
    const [roles, facilities] = await Promise.all([
      actor.role !== 'FACILITY_MANAGER' ? this.d.repo.listRoles() : Promise.resolve(['FACILITY_STAFF']),
      this.d.repo.listFacilities(actor.facilityIds),
    ]);
    return { roles, facilities };
  }

  async createRole(actor: AdminPrincipal, input: AdminRoleCreateInput): Promise<void> {
    if (actor.role !== 'SUPER_ADMIN') throw new AppError('FORBIDDEN');
    if (await this.d.repo.findRole(input.name)) throw new AppError('ADMIN_ROLE_EXISTS');
    await this.d.repo.createRole(input.name, [...new Set(input.permissions)]);
    await this.d.repo.audit({
      actorId: actor.id,
      action: 'ADMIN_ROLE_CREATE',
      facilityId: null,
      target: input.name,
    });
  }

  async create(actor: AdminPrincipal, input: AdminUserCreateInput): Promise<AdminUserRow> {
    requireManage(actor);
    if (
      actor.role === 'FACILITY_MANAGER' &&
      (input.role !== 'FACILITY_STAFF' || input.facilityId !== actor.facilityIds?.[0])
    )
      throw new AppError('FORBIDDEN');
    this.checkScope(input.role, input.facilityId);
    if (input.facilityId && !(await this.d.repo.facilityExists(input.facilityId)))
      throw new AppError('NOT_FOUND');
    const role = await this.d.repo.findRole(input.role);
    if (!role) throw new AppError('NOT_FOUND');
    if (await this.d.repo.findEmail(input.email)) throw new AppError('ADMIN_EMAIL_EXISTS');
    const password = this.d.password();
    const secret = this.d.totp.generate();
    const row = await this.d.repo.create({
      ...input,
      roleId: role.id,
      passwordHash: await this.d.hasher.hash(password),
      totpSecretEnc: `pending:${this.d.cipher.encrypt(secret)}`,
    });
    try {
      await this.d.mailer.send({
        to: input.email,
        subject: 'Tài khoản quản trị MQ Solutions',
        html: `<p>Tài khoản quản trị đã được tạo.</p><p>Mật khẩu tạm: <strong>${password}</strong></p><p>Đăng nhập tại /admin/dang-nhap để thiết lập ứng dụng xác thực 2FA, sau đó đổi mật khẩu.</p>`,
      });
    } catch {
      await this.d.repo.update(row.id, { active: false });
      throw new AppError('MAIL_SEND_FAILED');
    }
    await this.d.repo.audit({
      actorId: actor.id,
      action: 'ADMIN_USER_CREATE',
      facilityId: row.facilityId,
      target: row.id,
    });
    return row;
  }

  async update(actor: AdminPrincipal, id: string, input: AdminUserUpdateInput): Promise<AdminUserRow> {
    const target = await this.d.repo.find(id);
    if (!target) throw new AppError('NOT_FOUND');
    allowed(actor, target);
    if (id === actor.id && input.active === false) throw new AppError('ADMIN_SELF_LOCK');
    if (actor.role === 'FACILITY_MANAGER' && (input.role || input.facilityId !== undefined))
      throw new AppError('FORBIDDEN');
    const roleName = input.role ?? target.role;
    const facilityId = input.facilityId === undefined ? target.facilityId : input.facilityId;
    this.checkScope(roleName, facilityId);
    if (facilityId && !(await this.d.repo.facilityExists(facilityId))) throw new AppError('NOT_FOUND');
    const role = input.role ? await this.d.repo.findRole(input.role) : null;
    if (input.role && !role) throw new AppError('NOT_FOUND');
    const row = await this.d.repo.update(id, { roleId: role?.id, facilityId, active: input.active });
    if (input.active === false || input.role || input.facilityId !== undefined)
      await this.d.repo.revokeSessions(id, this.d.now());
    await this.d.repo.audit({
      actorId: actor.id,
      action: 'ADMIN_USER_UPDATE',
      facilityId: row.facilityId,
      target: id,
    });
    return row;
  }

  async resetTotp(actor: AdminPrincipal, id: string): Promise<void> {
    const target = await this.d.repo.find(id);
    if (!target) throw new AppError('NOT_FOUND');
    allowed(actor, target);
    if (id === actor.id) throw new AppError('ADMIN_SELF_RESET_2FA');
    const secret = this.d.totp.generate();
    await this.d.repo.update(id, { totpSecretEnc: `pending:${this.d.cipher.encrypt(secret)}` });
    await this.d.repo.revokeSessions(id, this.d.now());
    await this.d.repo.audit({
      actorId: actor.id,
      action: 'ADMIN_2FA_RESET',
      facilityId: target.facilityId,
      target: id,
    });
    await this.d.mailer.send({
      to: target.email,
      subject: 'Thiết lập lại 2FA quản trị MQ Solutions',
      html: '<p>2FA của bạn đã được đặt lại. Hãy đăng nhập bằng mật khẩu để thiết lập lại ứng dụng xác thực.</p>',
    });
  }

  private checkScope(role: string, facilityId: string | null) {
    if (role === 'FACILITY_STAFF' || role === 'FACILITY_MANAGER') {
      if (!facilityId) throw new AppError('ADMIN_FACILITY_REQUIRED');
    } else if (['SUPER_ADMIN', 'OPERATOR', 'EDITOR'].includes(role) && facilityId)
      throw new AppError('ADMIN_FACILITY_NOT_ALLOWED');
    // ACCOUNTANT và vai trò tùy chỉnh có thể gắn một cơ sở hoặc toàn hệ thống (A01 mục 2–3).
  }
}

export const ADMIN_USER_PERMISSION = PERMISSIONS.STAFF_MANAGE;
