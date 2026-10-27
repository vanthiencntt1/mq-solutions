import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import { encryptPii } from '../lib/infra/crypto/pii';

// Seed dữ liệu GIẢ cho local / staging (00-DATABASE mục 9). Không dùng dữ liệu bệnh nhân thật.
const prisma = new PrismaClient();

const ROLES: { name: string; permissions: string[] }[] = [
  { name: 'SUPER_ADMIN', permissions: ['*'] },
  {
    name: 'OPERATOR',
    permissions: ['facility:*', 'catalog:read', 'appointment:*', 'patient:*', 'monitor:read'],
  },
  { name: 'EDITOR', permissions: ['content:*'] },
  { name: 'ACCOUNTANT', permissions: ['payment:*', 'refund:create', 'report:read'] },
  {
    name: 'FACILITY_STAFF',
    permissions: ['appointment:read', 'appointment:checkin', 'appointment:cancel', 'patient:reset-password'],
  },
  { name: 'FACILITY_MANAGER', permissions: ['appointment:*', 'report:read', 'staff:manage', 'payment:read'] },
];

async function main() {
  const piiSecret = process.env.PII_SECRET;
  if (!piiSecret) throw new Error('Thiếu PII_SECRET');

  for (const r of ROLES) {
    await prisma.adminRole.upsert({
      where: { name: r.name },
      update: { permissions: r.permissions },
      create: r,
    });
  }

  const superRole = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } });
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@mqsolutions.local';
  const existing = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString('base64url');
    const totpSecret = authenticator.generateSecret();
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: 'Quản trị hệ thống',
        passwordHash: await hash(password),
        totpSecretEnc: encryptPii(totpSecret, piiSecret),
        roleId: superRole.id,
      },
    });
    // Chỉ in ra ở môi trường local khi seed lần đầu
    console.log(`\n[seed] SUPER_ADMIN: ${adminEmail} / ${password}`);
    console.log(`[seed] TOTP: ${authenticator.keyuri(adminEmail, 'MQ Solutions', totpSecret)}\n`);
  }

  // 4 bệnh viện thật dùng ApiDatKham của MQ. URL mặc định là IP nội bộ (máy chủ web đặt trong mạng BV);
  // máy dev ngoài mạng ghi đè bằng HIS_URL_<MÃ> trong .env (ví dụ http://mqsoft.ddns.net:<port>).
  // Khóa 3DES nằm trong biến HIS_KEY_<MÃ>, không nằm trong code/DB.
  const realFacilities = [
    {
      code: 'BVAB',
      slug: 'benh-vien-an-binh',
      name: 'Bệnh viện An Bình',
      port: 9001,
      address: '146 An Bình, Phường 7, Quận 5, TP. Hồ Chí Minh',
    },
    {
      code: 'BVTD',
      slug: 'benh-vien-da-khoa-thu-duc',
      name: 'Bệnh viện đa khoa Thủ Đức',
      port: 9002,
      address: '29 Phú Châu, Phường Tam Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
    },
    {
      code: 'BVNB',
      slug: 'benh-vien-da-khoa-nha-be',
      name: 'Bệnh viện đa khoa Nhà Bè',
      port: 9003,
      address: '281A Lê Văn Lương, Xã Phước Kiển, Huyện Nhà Bè, TP. Hồ Chí Minh',
    },
    {
      code: 'BVCC',
      slug: 'benh-vien-da-khoa-cu-chi',
      name: 'Bệnh viện đa khoa Củ Chi',
      port: 9004,
      address: '1307 Tỉnh lộ 7, Ấp Chợ Cũ 2, Xã An Nhơn Tây, Huyện Củ Chi, TP. Hồ Chí Minh',
    },
  ];
  for (const [i, f] of realFacilities.entries()) {
    const apiBaseUrl = process.env[`HIS_URL_${f.code}`] || `http://192.168.1.250:${f.port}`;
    await prisma.facility.upsert({
      where: { code: f.code },
      // Chạy seed lại chỉ cập nhật URL kết nối; các thông tin admin đã sửa ở A02 được giữ nguyên.
      update: { apiBaseUrl },
      create: {
        code: f.code,
        slug: f.slug,
        name: f.name,
        type: 'BV_CONG',
        provinceName: 'TP. Hồ Chí Minh',
        address: f.address,
        workingHours: { 'T2-T6': '07:00-16:30', T7: '07:00-11:30' },
        apiBaseUrl,
        secretRef: `HIS_KEY_${f.code}`,
        bookingMode: 'SPECIALTY',
        allowBhyt: false,
        // Chưa có tài khoản ngân hàng/SePay của BV → chỉ thanh toán tại quầy cho tới khi admin cấu hình ở A02
        payOptions: ['AT_FACILITY'],
        featured: true,
        sortOrder: i,
      },
    });
  }

  // Cơ sở mẫu trỏ tới mock ApiDatKham: chỉ tạo khi SEED_MOCK_FACILITIES=true (máy dev/test)
  if (process.env.SEED_MOCK_FACILITIES !== 'true') {
    await seedSettings();
    console.log('[seed] xong: vai trò, admin, 4 bệnh viện, cấu hình hệ thống');
    return;
  }
  const mockBase = `http://localhost:${process.env.MOCK_HIS_PORT ?? 4010}`;
  const facilities = [
    {
      code: 'BVA',
      slug: 'benh-vien-a',
      name: 'Bệnh viện A (mẫu)',
      type: 'BV_TU' as const,
      bookingMode: 'SPECIALTY' as const,
    },
    {
      code: 'BVB',
      slug: 'phong-kham-b',
      name: 'Phòng khám B (mẫu)',
      type: 'PHONG_KHAM' as const,
      bookingMode: 'BOTH' as const,
    },
  ];
  for (const [i, f] of facilities.entries()) {
    await prisma.facility.upsert({
      where: { code: f.code },
      update: {},
      create: {
        ...f,
        provinceName: 'TP. Hồ Chí Minh',
        address: `${100 + i} Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh`,
        workingHours: { 'T2-T6': '07:00-16:30', T7: '07:00-11:30' },
        shortDesc: 'Cơ sở mẫu trỏ tới mock ApiDatKham để phát triển.',
        apiBaseUrl: `${mockBase}/${f.code.toLowerCase()}`,
        secretRef: `HIS_KEY_${f.code}`,
        allowBhyt: true,
        bankCode: 'VCB',
        bankAccountNo: `000000000${i + 1}`,
        bankAccountName: f.name.toUpperCase(),
        webhookKeyRef: `SEPAY_WEBHOOK_KEY_${f.code}`,
        featured: false,
        sortOrder: 100 + i,
      },
    });
  }

  await seedSettings();
  console.log('[seed] xong: vai trò, admin, 4 bệnh viện + 2 cơ sở mẫu, cấu hình hệ thống');
}

async function seedSettings() {
  const settings: Record<string, unknown> = {
    brand: { name: 'MQ Solutions', primaryColor: '#006bff' },
    contact: { hotline: '1900 0000', email: 'hotro@mqsolutions.vn' },
    auth: { passwordMode: 'RANDOM_EMAIL', minLength: 8, maxFailed: 5, lockMinutes: 15, jwtHours: 12 },
    booking: { holdMinutes: 15, maxOpenPerFacility: 3, remindAt: '18:00' },
    maintenance: { enabled: false, bookingOnly: false, message: '' },
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
