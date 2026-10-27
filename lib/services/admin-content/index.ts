import { revalidatePath, revalidateTag } from 'next/cache';
import { prismaAdminContentRepository } from '@/lib/infra/db/admin-content-repository';
import { storage } from '@/lib/infra/storage/local-storage';
import { AdminContentService } from './admin-content-service';

let instance: AdminContentService | undefined;
export function getAdminContentService(): AdminContentService {
  if (!instance)
    instance = new AdminContentService({
      repo: prismaAdminContentRepository,
      storage,
      now: () => new Date(),
      revalidate: (path) => {
        revalidatePath(path);
        if (path === '/') revalidateTag('public-shell');
      },
    });
  return instance;
}
export { AdminContentService } from './admin-content-service';
