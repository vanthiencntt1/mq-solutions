import { prisma } from '@/lib/infra/db/prisma';
import { SeoService } from './seo-service';

let instance: SeoService | undefined;

export function getSeoService(): SeoService {
  if (!instance) {
    instance = new SeoService({
      listFacilities: () =>
        prisma.facility.findMany({
          where: { status: 'ACTIVE' },
          select: { slug: true, updatedAt: true },
          take: 10000,
        }),
      listPosts: () =>
        prisma.post.findMany({
          where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
          select: { slug: true, updatedAt: true },
          take: 30000,
        }),
      listPages: () =>
        prisma.staticPage.findMany({
          where: { status: 'PUBLISHED', effectiveAt: { lte: new Date() } },
          select: { slug: true, updatedAt: true },
          take: 9000,
        }),
    });
  }
  return instance;
}
