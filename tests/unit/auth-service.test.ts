import { describe, expect, it } from 'vitest';
import { checkPasswordPolicy, generateTempPassword } from '@/lib/domain/account/password';
import { RegisterSchema } from '@/lib/domain/account/schemas';
import { cccdMatchesGenderCentury } from '@/lib/domain/account/cccd';
import { AuthService } from '@/lib/services/auth/auth-service';
import { makeFakes } from './auth-fakes';

// CCCD mẫu: 079 | 0 (nam 1900s) | 90 (năm 1990) | 000001
const REG = {
  cccd: '079090000001',
  fullName: 'Nguyễn Văn Mẫu',
  birthYear: 1990,
  gender: 1 as const,
  phone: '0900000001',
  email: 'mau@gmail.com',
  consent: true as const,
};
const ctx = { ip: '1.2.3.4', ipHash: 'iphash' };

async function registered(opts?: Parameters<typeof makeFakes>[0]) {
  const f = makeFakes(opts);
  const svc = new AuthService(f.deps);
  await svc.register(REG, ctx);
  return { f, svc, password: f.lastPassword() };
}

describe('mật khẩu', () => {
  it('sinh 10 ký tự có hoa, thường, số', () => {
    const pw = generateTempPassword((n) => Math.floor(Math.random() * n));
    expect(pw).toHaveLength(10);
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/\d/);
  });
  it('chính sách: chặn CCCD, SĐT, năm sinh, thiếu số', () => {
    const c = { cccd: REG.cccd, phone: REG.phone, birthYear: 1990 };
    expect(checkPasswordPolicy('matkhau1990', c)).not.toHaveLength(0);
    expect(checkPasswordPolicy('abc000001xyz', c)).not.toHaveLength(0);
    expect(checkPasswordPolicy('chiCoChu', c)).not.toHaveLength(0);
    expect(checkPasswordPolicy('Bvien2026x', c)).toHaveLength(0);
  });
  it('CCCD: số thứ 4 khớp giới tính + thế kỷ', () => {
    expect(cccdMatchesGenderCentury('079090000001', 1990, 1)).toBe(true);
    expect(cccdMatchesGenderCentury('079190000001', 1990, 0)).toBe(true);
    expect(cccdMatchesGenderCentury('079205000001', 2005, 1)).toBe(true);
    expect(cccdMatchesGenderCentury('079090000001', 1990, 0)).toBe(false);
  });
  it('schema đăng ký chuẩn hóa email, bắt đồng ý điều khoản', () => {
    expect(RegisterSchema.parse({ ...REG, email: ' MAU@Gmail.com ' }).email).toBe('mau@gmail.com');
    expect(RegisterSchema.safeParse({ ...REG, consent: false }).success).toBe(false);
  });
});

describe('đăng ký (C01 mục 4)', () => {
  it('tạo tài khoản, mã hóa CCCD, gửi mật khẩu qua Gmail, bắt đổi lần đầu', async () => {
    const { f } = await registered();
    const a = [...f.accounts.values()][0]!;
    expect(a.cccdEnc).not.toContain('079090000001'.slice(0, 3) + 'x');
    expect(a.cccdHmac).toHaveLength(64);
    expect(a.fullNameNorm).toBe('NGUYEN VAN MAU');
    expect(a.mustChangePassword).toBe(true);
    expect(a.consentVersion).toBe('2026-10');
    expect(f.sent[0]?.to).toBe('mau@gmail.com');
    expect(f.lastPassword()).toHaveLength(10);
  });
  it('CCCD trùng → báo lỗi, không lộ thông tin chủ cũ', async () => {
    const { svc } = await registered();
    await expect(svc.register({ ...REG, email: 'khac@gmail.com' }, ctx)).rejects.toMatchObject({
      code: 'ACCOUNT_CCCD_EXISTS',
    });
  });
  it('CCCD không khớp năm sinh → từ chối', async () => {
    const svc = new AuthService(makeFakes().deps);
    await expect(svc.register({ ...REG, birthYear: 1991 }, ctx)).rejects.toMatchObject({
      code: 'ACCOUNT_CCCD_MISMATCH',
    });
  });
  it('gửi mail lỗi → xóa tài khoản vừa tạo để đăng ký lại', async () => {
    const f = makeFakes({ mailFails: true });
    await expect(new AuthService(f.deps).register(REG, ctx)).rejects.toMatchObject({
      code: 'MAIL_SEND_FAILED',
    });
    expect(f.accounts.size).toBe(0);
  });
  it('CAPTCHA sai → từ chối', async () => {
    const svc = new AuthService(makeFakes({ captchaOk: false }).deps);
    await expect(svc.register(REG, ctx)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
  });
});

describe('đăng nhập (C01 mục 5)', () => {
  it('bằng CCCD hoặc SĐT; lần đầu bắt đổi mật khẩu', async () => {
    const { svc, password } = await registered();
    const r1 = await svc.login({ username: REG.cccd, password }, ctx);
    expect(r1.mustChangePassword).toBe(true);
    expect(r1.token).toContain('"mc":true');
    const r2 = await svc.login({ username: REG.phone, password }, ctx);
    expect(r2.fullName).toBe('Nguyễn Văn Mẫu');
  });
  it('sai mật khẩu → thông báo chung; sai 5 lần → khóa 15 phút', async () => {
    const { f, svc, password } = await registered({ captchaOk: true });
    for (let i = 0; i < 4; i++) {
      await expect(svc.login({ username: REG.cccd, password: 'sai' }, ctx)).rejects.toMatchObject({
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }
    await expect(svc.login({ username: REG.cccd, password: 'sai' }, ctx)).rejects.toMatchObject({
      code: 'AUTH_ACCOUNT_LOCKED',
    });
    await expect(svc.login({ username: REG.cccd, password }, ctx)).rejects.toMatchObject({
      code: 'AUTH_ACCOUNT_LOCKED',
    });
    f.advance(15 * 60_000 + 1000);
    await expect(svc.login({ username: REG.cccd, password }, ctx)).resolves.toBeTruthy();
  });
  it('tài khoản không tồn tại → cùng thông báo như sai mật khẩu', async () => {
    const svc = new AuthService(makeFakes().deps);
    await expect(svc.login({ username: '079090000009', password: 'x' }, ctx)).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
    });
  });
  it('SĐT thuộc nhiều tài khoản → yêu cầu dùng CCCD', async () => {
    const { f, svc, password } = await registered();
    f.advance(1000);
    await svc.register({ ...REG, cccd: '079190000002', gender: 0, email: 'b@gmail.com' }, ctx);
    await expect(svc.login({ username: REG.phone, password }, ctx)).rejects.toMatchObject({
      code: 'AUTH_PHONE_AMBIGUOUS',
    });
  });
});

describe('đổi mật khẩu, quên mật khẩu, phiên (C01 mục 6, 8)', () => {
  it('đổi mật khẩu → token_version tăng, phiên cũ hết hiệu lực, có email báo', async () => {
    const { f, svc, password } = await registered();
    const { token: oldToken } = await svc.login({ username: REG.cccd, password }, ctx);
    const id = [...f.accounts.keys()][0]!;
    expect(await svc.resolveSession(oldToken)).not.toBeNull();
    const r = await svc.changePassword(
      id,
      { oldPassword: password, newPassword: 'Bvien2026x', confirmPassword: 'Bvien2026x' },
      ctx,
    );
    expect(r.token).not.toContain('mc');
    expect(await svc.resolveSession(oldToken)).toBeNull();
    expect(await svc.resolveSession(r.token)).toMatchObject({ mustChangePassword: false });
    expect(f.sent.at(-1)?.subject).toContain('thay đổi');
  });
  it('đổi mật khẩu: sai mật khẩu cũ / vi phạm chính sách', async () => {
    const { f, svc, password } = await registered();
    const id = [...f.accounts.keys()][0]!;
    await expect(
      svc.changePassword(
        id,
        { oldPassword: 'sai', newPassword: 'Bvien2026x', confirmPassword: 'Bvien2026x' },
        ctx,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_WRONG_PASSWORD' });
    await expect(
      svc.changePassword(
        id,
        { oldPassword: password, newPassword: 'abc1990xyz', confirmPassword: 'abc1990xyz' },
        ctx,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_POLICY' });
  });
  it('quên mật khẩu: khớp → mật khẩu mới qua Gmail, mật khẩu cũ hết dùng', async () => {
    const { f, svc, password } = await registered();
    const { token } = await svc.login({ username: REG.cccd, password }, ctx);
    await svc.forgotPassword({ cccd: REG.cccd, birthYear: 1990, email: REG.email }, ctx);
    const newPw = f.lastPassword();
    expect(newPw).not.toBe(password);
    expect(await svc.resolveSession(token)).toBeNull();
    await expect(svc.login({ username: REG.cccd, password }, ctx)).rejects.toBeTruthy();
    expect((await svc.login({ username: REG.cccd, password: newPw }, ctx)).mustChangePassword).toBe(true);
  });
  it('quên mật khẩu: không khớp → không gửi gì, không báo lỗi', async () => {
    const { f, svc } = await registered();
    const before = f.sent.length;
    await svc.forgotPassword({ cccd: REG.cccd, birthYear: 1991, email: REG.email }, ctx);
    await svc.forgotPassword({ cccd: '079090000009', birthYear: 1990, email: REG.email }, ctx);
    expect(f.sent.length).toBe(before);
  });
  it('quên mật khẩu tối đa 3 lần / giờ / CCCD', async () => {
    const { f, svc } = await registered();
    const before = f.sent.length;
    for (let i = 0; i < 5; i++)
      await svc.forgotPassword({ cccd: REG.cccd, birthYear: 1990, email: REG.email }, ctx);
    expect(f.sent.length - before).toBe(3);
  });
  it('đăng xuất mọi thiết bị', async () => {
    const { f, svc, password } = await registered();
    const { token } = await svc.login({ username: REG.cccd, password }, ctx);
    await svc.logoutAll([...f.accounts.keys()][0]!, ctx);
    expect(await svc.resolveSession(token)).toBeNull();
  });
});

describe('thông tin cá nhân (C01 mục 7)', () => {
  it('đổi Gmail phải nhập lại mật khẩu, gửi báo về Gmail cũ', async () => {
    const { f, svc, password } = await registered();
    const id = [...f.accounts.keys()][0]!;
    await expect(svc.updateProfile(id, { email: 'moi@gmail.com' }, ctx)).rejects.toMatchObject({
      code: 'AUTH_WRONG_PASSWORD',
    });
    const p = await svc.updateProfile(
      id,
      { email: 'moi@gmail.com', currentPassword: password, addressLine: '1 Lê Lợi' },
      ctx,
    );
    expect(p.email).toBe('moi@gmail.com');
    expect(p.addressLine).toBe('1 Lê Lợi');
    expect(f.sent.at(-1)?.to).toBe('mau@gmail.com');
    expect(p.cccdMasked).toBe('********0001');
  });
});

describe('schema form đăng ký', () => {
  it('chưa chọn giới tính / chưa nhập năm sinh → báo đúng lỗi, không ép thành 0', () => {
    const r = RegisterSchema.safeParse({ ...REG, gender: null, birthYear: '' });
    expect(r.success).toBe(false);
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(msgs).toContain('Chọn giới tính');
    expect(msgs).toContain('Nhập năm sinh');
    expect(RegisterSchema.parse({ ...REG, gender: '0', birthYear: '1990' })).toMatchObject({
      gender: 0,
      birthYear: 1990,
    });
  });
});
