import { PrismaClient } from '@prisma/client';

// Một PrismaClient cho cả tiến trình (tránh tạo nhiều kết nối khi hot reload ở dev).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Lỗi truy vấn đi qua route/worker logger đã che PII; Prisma tự ghi console có thể lộ tham số truy vấn.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: [] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
