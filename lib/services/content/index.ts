import { prismaContentRepository } from '@/lib/infra/db/content-repository';
import { getEnv } from '@/lib/config/env';
import { ContentService } from './content-service';

let instance: ContentService | undefined;
export function getContentService(): ContentService {
  instance ??= new ContentService(prismaContentRepository);
  return instance;
}
export { ContentService } from './content-service';

export function getSupportLinks() {
  const env = getEnv();
  return { zaloUrl: env.SUPPORT_ZALO_URL, facebookUrl: env.SUPPORT_FACEBOOK_URL };
}
