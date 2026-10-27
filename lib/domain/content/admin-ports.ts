import type { AdminContentInput, AdminContentKind } from './admin-schemas';

export interface AdminContentRepository {
  list(kind: AdminContentKind, skip: number, take: number): Promise<{ rows: unknown[]; total: number }>;
  find(kind: AdminContentKind, id: string): Promise<unknown | null>;
  slugExists(kind: 'posts' | 'categories' | 'pages', slug: string, excludeId?: string): Promise<boolean>;
  category(id: string): Promise<{ slug: string } | null>;
  save(
    input: AdminContentInput,
    id: string | undefined,
    actorId: string,
    action?: string,
  ): Promise<{ id: string; slug?: string }>;
  remove(kind: AdminContentKind, id: string, actorId: string): Promise<void>;
  versions(kind: AdminContentKind, id: string): Promise<{ id: string; createdAt: Date; createdBy: string }[]>;
  version(kind: AdminContentKind, id: string, versionId: string): Promise<unknown | null>;
  mediaCreate(data: {
    key: string;
    url: string;
    mime: string;
    size: number;
    alt: string;
    createdBy: string;
  }): Promise<{ id: string; url: string }>;
  mediaList(skip: number, take: number): Promise<{ rows: unknown[]; total: number }>;
}

export interface AdminContentStorage {
  save(input: {
    data: Buffer;
    mime: string;
    visibility: 'public';
  }): Promise<{ key: string; url: string; size: number; mime: string }>;
}
