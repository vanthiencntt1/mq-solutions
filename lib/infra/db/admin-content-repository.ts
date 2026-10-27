import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { AppError } from '@/lib/domain/errors';
import type { AdminContentRepository } from '@/lib/domain/content/admin-ports';
import type { AdminContentInput } from '@/lib/domain/content/admin-schemas';
import { prisma } from './prisma';

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const prismaAdminContentRepository: AdminContentRepository = {
  async list(kind, skip, take) {
    switch (kind) {
      case 'posts': {
        const [rows, total] = await Promise.all([
          prisma.post.findMany({ skip, take, orderBy: { updatedAt: 'desc' } }),
          prisma.post.count(),
        ]);
        return { rows, total };
      }
      case 'categories': {
        const [rows, total] = await Promise.all([
          prisma.postCategory.findMany({ skip, take, orderBy: { sortOrder: 'asc' } }),
          prisma.postCategory.count(),
        ]);
        return { rows, total };
      }
      case 'pages': {
        const [rows, total] = await Promise.all([
          prisma.staticPage.findMany({ skip, take, orderBy: { updatedAt: 'desc' } }),
          prisma.staticPage.count(),
        ]);
        return { rows, total };
      }
      case 'faqs': {
        const [rows, total] = await Promise.all([
          prisma.faqItem.findMany({ skip, take, orderBy: [{ groupName: 'asc' }, { sortOrder: 'asc' }] }),
          prisma.faqItem.count(),
        ]);
        return { rows, total };
      }
      case 'banners': {
        const [rows, total] = await Promise.all([
          prisma.banner.findMany({ skip, take, orderBy: { sortOrder: 'asc' } }),
          prisma.banner.count(),
        ]);
        return { rows, total };
      }
      case 'popups': {
        const [rows, total] = await Promise.all([
          prisma.popup.findMany({ skip, take, orderBy: { id: 'asc' } }),
          prisma.popup.count(),
        ]);
        return { rows, total };
      }
      case 'menus': {
        const [rows, total] = await Promise.all([
          prisma.menuItem.findMany({ skip, take, orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }] }),
          prisma.menuItem.count(),
        ]);
        return { rows, total };
      }
      case 'home-blocks': {
        const [rows, total] = await Promise.all([
          prisma.pageBlock.findMany({ skip, take, orderBy: { sortOrder: 'asc' } }),
          prisma.pageBlock.count(),
        ]);
        return { rows, total };
      }
    }
  },
  find(kind, id) {
    switch (kind) {
      case 'posts':
        return prisma.post.findUnique({ where: { id } });
      case 'categories':
        return prisma.postCategory.findUnique({ where: { id } });
      case 'pages':
        return prisma.staticPage.findUnique({ where: { id } });
      case 'faqs':
        return prisma.faqItem.findUnique({ where: { id } });
      case 'banners':
        return prisma.banner.findUnique({ where: { id } });
      case 'popups':
        return prisma.popup.findUnique({ where: { id } });
      case 'menus':
        return prisma.menuItem.findUnique({ where: { id } });
      case 'home-blocks':
        return prisma.pageBlock.findUnique({ where: { id } });
    }
  },
  async slugExists(kind, slug, excludeId) {
    const where = { slug, ...(excludeId ? { id: { not: excludeId } } : {}) };
    if (kind === 'posts') return (await prisma.post.count({ where })) > 0;
    if (kind === 'pages') return (await prisma.staticPage.count({ where })) > 0;
    return (await prisma.postCategory.count({ where })) > 0;
  },
  category: (id) => prisma.postCategory.findUnique({ where: { id }, select: { slug: true } }),
  async save(input, id, actorId, action = 'CONTENT_SAVE') {
    return prisma.$transaction(async (tx) => {
      const key = id ?? randomUUID();
      const result = await saveEntity(tx, input, key, actorId, Boolean(id));
      await tx.contentVersion.create({
        data: { entity: input.kind, entityId: key, data: json(input), createdBy: actorId },
      });
      await tx.auditLog.create({
        data: { actorType: 'ADMIN', actorId, action, module: 'content', target: `${input.kind}:${key}` },
      });
      return result;
    });
  },
  async remove(kind, id, actorId) {
    await prisma.$transaction(async (tx) => {
      if (kind === 'categories') {
        if (await tx.post.count({ where: { categoryId: id } })) throw new AppError('CONTENT_IN_USE');
        await tx.postCategory.delete({ where: { id } });
      } else if (kind === 'posts') await tx.post.delete({ where: { id } });
      else if (kind === 'pages') await tx.staticPage.delete({ where: { id } });
      else if (kind === 'faqs') await tx.faqItem.delete({ where: { id } });
      else if (kind === 'banners') await tx.banner.delete({ where: { id } });
      else if (kind === 'popups') await tx.popup.delete({ where: { id } });
      else if (kind === 'menus') {
        if (await tx.menuItem.count({ where: { parentId: id } })) throw new AppError('CONTENT_IN_USE');
        await tx.menuItem.delete({ where: { id } });
      } else await tx.pageBlock.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'CONTENT_DELETE',
          module: 'content',
          target: `${kind}:${id}`,
        },
      });
    });
  },
  versions(kind, id) {
    return prisma.contentVersion.findMany({
      where: { entity: kind, entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, createdAt: true, createdBy: true },
    });
  },
  async version(kind, id, versionId) {
    const row = await prisma.contentVersion.findFirst({
      where: { id: versionId, entity: kind, entityId: id },
      select: { data: true },
    });
    return row?.data ?? null;
  },
  mediaCreate: (data) => prisma.media.create({ data, select: { id: true, url: true } }),
  async mediaList(skip, take) {
    const [rows, total] = await Promise.all([
      prisma.media.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: { id: true, url: true, alt: true, mime: true, size: true, createdAt: true },
      }),
      prisma.media.count(),
    ]);
    return { rows, total };
  },
};

async function saveEntity(
  tx: Prisma.TransactionClient,
  input: AdminContentInput,
  id: string,
  actorId: string,
  update: boolean,
): Promise<{ id: string; slug?: string }> {
  switch (input.kind) {
    case 'posts': {
      const v = input.value;
      const data = {
        slug: v.slug!,
        title: v.title,
        excerpt: v.excerpt ?? null,
        coverUrl: v.coverUrl ?? null,
        contentJson: json(v.blocks),
        categoryId: v.categoryId,
        tags: v.tags,
        facilityIds: v.facilityIds,
        specialtyTags: v.specialtyTags,
        authorName: v.authorName ?? null,
        reviewerName: v.reviewerName ?? null,
        status: v.status,
        publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
        seoTitle: v.seoTitle ?? null,
        seoDesc: v.seoDesc ?? null,
      };
      const row = update
        ? await tx.post.update({ where: { id }, data })
        : await tx.post.create({ data: { id, ...data, createdBy: actorId } });
      return { id: row.id, slug: row.slug };
    }
    case 'categories': {
      const data = { slug: input.value.slug!, name: input.value.name, sortOrder: input.value.sortOrder };
      const row = update
        ? await tx.postCategory.update({ where: { id }, data })
        : await tx.postCategory.create({ data: { id, ...data } });
      return { id: row.id, slug: row.slug };
    }
    case 'pages': {
      const v = input.value;
      const data = {
        slug: v.slug!,
        title: v.title,
        contentJson: json(v.blocks),
        version: v.version,
        effectiveAt: new Date(v.effectiveAt),
        requireReconsent: v.requireReconsent,
        status: v.status,
      };
      const row = update
        ? await tx.staticPage.update({ where: { id }, data })
        : await tx.staticPage.create({ data: { id, ...data } });
      return { id: row.id, slug: row.slug };
    }
    case 'faqs': {
      const v = input.value;
      const data = {
        groupName: v.groupName,
        question: v.question,
        answer: json(v.answer),
        sortOrder: v.sortOrder,
        active: v.active,
      };
      const row = update
        ? await tx.faqItem.update({ where: { id }, data })
        : await tx.faqItem.create({ data: { id, ...data } });
      return { id: row.id };
    }
    case 'banners': {
      const v = input.value;
      const data = {
        placement: v.placement,
        imageUrl: v.imageUrl,
        imageMobileUrl: v.imageMobileUrl ?? null,
        title: v.title ?? null,
        link: v.link ?? null,
        startAt: v.startAt ? new Date(v.startAt) : null,
        endAt: v.endAt ? new Date(v.endAt) : null,
        sortOrder: v.sortOrder,
        active: v.active,
      };
      const row = update
        ? await tx.banner.update({ where: { id }, data })
        : await tx.banner.create({ data: { id, ...data } });
      return { id: row.id };
    }
    case 'popups': {
      const v = input.value;
      const data = {
        imageUrl: v.imageUrl,
        link: v.link ?? null,
        pages: v.pages,
        frequency: v.frequency,
        startAt: v.startAt ? new Date(v.startAt) : null,
        endAt: v.endAt ? new Date(v.endAt) : null,
        active: v.active,
      };
      const row = update
        ? await tx.popup.update({ where: { id }, data })
        : await tx.popup.create({ data: { id, ...data } });
      return { id: row.id };
    }
    case 'menus': {
      const v = input.value;
      const data = {
        location: v.location,
        parentId: v.parentId ?? null,
        label: v.label,
        href: v.href,
        sortOrder: v.sortOrder,
        active: v.active,
      };
      const row = update
        ? await tx.menuItem.update({ where: { id }, data })
        : await tx.menuItem.create({ data: { id, ...data } });
      return { id: row.id };
    }
    case 'home-blocks': {
      const v = input.value;
      const data = {
        page: v.page,
        type: v.type,
        data: json(v.blocks),
        sortOrder: v.sortOrder,
        active: v.active,
        status: v.status,
      };
      const row = update
        ? await tx.pageBlock.update({ where: { id }, data })
        : await tx.pageBlock.create({ data: { id, ...data } });
      return { id: row.id };
    }
  }
}
