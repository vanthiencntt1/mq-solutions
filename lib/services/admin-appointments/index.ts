import { randomUUID } from 'node:crypto';
import { getEnv } from '@/lib/config/env';
import { prismaAdminAppointmentRepository } from '@/lib/infra/db/admin-appointment-repository';
import { hisClient } from '@/lib/infra/his';
import { getRedis } from '@/lib/infra/redis/client';
import { AppError } from '@/lib/domain/errors';
import { signTicketCode, verifyTicketCode } from '@/lib/services/ticket/ticket-qr';
import { getNotificationService } from '@/lib/services/notification';
import { getIdentityService } from '@/lib/services/identity';
import { AdminAppointmentsService } from './admin-appointments-service';

let instance: AdminAppointmentsService | undefined;

export function getAdminAppointmentsService(): AdminAppointmentsService {
  if (!instance)
    instance = new AdminAppointmentsService({
      repo: prismaAdminAppointmentRepository,
      // C08 mục 2 / A06 mục 3: chữ ký chỉ gắn mã phiếu, không đưa MaBN vào QR.
      sign: (code) => signTicketCode(code, getEnv().PII_HMAC_SECRET),
      verify: (token) => verifyTicketCode(token, getEnv().PII_HMAC_SECRET),
      queueTicketEmail: (to, vars) =>
        getNotificationService().queueEmail({ code: 'BOOKING_SUCCESS', to, vars }),
      his: hisClient,
      resolveMaBN: async (accountId, facilityCode) =>
        (await getIdentityService().resolve(accountId, facilityCode)).maBN ?? null,
      // C08 mục 4: dùng cùng khóa hủy để admin và bệnh nhân không gửi hai lệnh HIS đồng thời.
      async withCancelLock(code, action) {
        const redis = getRedis();
        const key = `ticket:cancel:${code}`;
        const token = randomUUID();
        if ((await redis.set(key, token, 'EX', 30, 'NX')) !== 'OK') throw new AppError('BOOKING_IN_PROGRESS');
        try {
          return await action();
        } finally {
          await redis.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1,
            key,
            token,
          );
        }
      },
      now: () => new Date(),
    });
  return instance;
}

export { AdminAppointmentsService } from './admin-appointments-service';
export {
  AppointmentQuerySchema,
  AppointmentCodeSchema,
  AppointmentActionSchema,
  CheckInLookupSchema,
} from './schemas';
