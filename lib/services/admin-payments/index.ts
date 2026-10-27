import { prismaReconcilePaymentsRepository } from '@/lib/infra/db/reconcile-payments-repository';
import { getNotificationService } from '@/lib/services/notification';
import { AdminPaymentsService } from './admin-payments-service';

let instance: AdminPaymentsService | undefined;
export function getAdminPaymentsService(): AdminPaymentsService {
  instance ??= new AdminPaymentsService(prismaReconcilePaymentsRepository, (to, vars) =>
    getNotificationService().queueEmail({ code: 'REFUND_DONE', to, vars }),
  );
  return instance;
}
