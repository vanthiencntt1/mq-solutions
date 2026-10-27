import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import { encryptPii } from '../lib/infra/crypto/pii';

// Đặt lại mật khẩu + mã 2FA cho tài khoản admin (dùng trên máy dev / server khi quên).
//   pnpm admin:reset                       → admin@mqsolutions.local
//   pnpm admin:reset email@domain.vn
// In mật khẩu mới và dòng otpauth:// ra màn hình MỘT lần – chép ngay.
const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? process.env.SEED_ADMIN_EMAIL ?? 'admin@mqsolutions.local').toLowerCase();
  const piiSecret = process.env.PII_SECRET;
  if (!piiSecret) throw new Error('Thiếu PII_SECRET trong .env');

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) throw new Error(`Không có tài khoản admin ${email}. Chạy pnpm db:seed để tạo SUPER_ADMIN.`);

  const password = randomBytes(9).toString('base64url');
  const totpSecret = authenticator.generateSecret();
  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(password),
      totpSecretEnc: encryptPii(totpSecret, piiSecret),
      failedCount: 0,
      lockedUntil: null,
      active: true,
    },
  });
  await prisma.adminSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.auditLog.create({
    data: { actorType: 'SYSTEM', actorId: 'cli', action: 'ADMIN_RESET_PASSWORD', module: 'ADMIN', target: user.id },
  });

  console.log(`\nTài khoản : ${email}`);
  console.log(`Mật khẩu  : ${password}`);
  console.log(`Mã 2FA    : ${authenticator.keyuri(email, 'MQ Solutions', totpSecret)}`);
  console.log('→ Thêm mã 2FA vào Google Authenticator: chọn "Nhập khóa thiết lập", dán phần sau "secret=".\n');
}

main()
  .catch((e) => {
    console.error((e as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
