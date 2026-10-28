import { prisma } from '@/lib/infra/db/prisma';

// Dịch vụ cơ sở y tế (W03, A02). Chỉ đọc bảng facility; danh mục khám đọc qua HisClient ở các service khác.

export interface FacilityCard {
  code: string;
  slug: string;
  name: string;
  type: string;
  address: string;
  provinceName: string;
  logoUrl: string | null;
  allowOnlinePayment: boolean;
}

/** Trang hồ sơ truy cập trực tiếp bằng mã cơ sở, kể cả khi có hơn 24 cơ sở hoạt động (W08). */
export async function getActiveFacilityByCode(
  code: string,
): Promise<Pick<FacilityCard, 'code' | 'name' | 'address' | 'logoUrl'> | null> {
  const row = await prisma.facility.findUnique({
    where: { code },
    select: { code: true, name: true, address: true, logoUrl: true, status: true },
  });
  return row?.status === 'ACTIVE'
    ? { code: row.code, name: row.name, address: row.address, logoUrl: row.logoUrl }
    : null;
}

export async function listActiveFacilities(
  opts: { featuredOnly?: boolean; take?: number } = {},
): Promise<FacilityCard[]> {
  const rows = await prisma.facility.findMany({
    where: { status: 'ACTIVE', ...(opts.featuredOnly ? { featured: true } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    take: Math.min(opts.take ?? 24, 100),
    select: {
      code: true,
      slug: true,
      name: true,
      type: true,
      address: true,
      provinceName: true,
      logoUrl: true,
      bankAccountNo: true,
      webhookKeyRef: true,
    },
  });
  return rows.map(({ bankAccountNo, webhookKeyRef, ...f }) => ({
    ...f,
    // C07 mục 5: chưa cấu hình đủ tài khoản → ẩn thanh toán online
    allowOnlinePayment: Boolean(bankAccountNo && webhookKeyRef),
  }));
}
