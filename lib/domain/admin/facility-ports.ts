import type { HisGateway, Storage } from '@/lib/domain/ports';
import type { FacilityCreateInput, FacilityListInput, FacilityUpdateInput } from './facility-schemas';

export interface FacilityRow extends Omit<FacilityCreateInput, 'status'> {
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  id: string;
  health: string;
  lastOkAt: Date | null;
  updatedAt: Date;
  appointmentsToday: number;
}

export interface FacilityRepository {
  list(query: FacilityListInput, scope: string[] | null): Promise<{ rows: FacilityRow[]; total: number }>;
  find(id: string): Promise<FacilityRow | null>;
  exists(code: string, slug: string): Promise<boolean>;
  create(input: FacilityCreateInput, actorId: string): Promise<FacilityRow>;
  update(
    id: string,
    changes: (Omit<FacilityUpdateInput, 'confirmPassword'> & { health?: string }) | { status: FacilityRow['status'] },
    actorId: string,
    diff: Record<string, { from: unknown; to: unknown }>,
  ): Promise<FacilityRow>;
  passwordHash(actorId: string): Promise<string | null>;
  recordHealth(
    id: string,
    health: string,
    at: Date | null,
    durationMs: number,
    error?: string,
  ): Promise<void>;
  activeIds(): Promise<string[]>;
}

export interface FacilityDeps {
  repo: FacilityRepository;
  his: HisGateway;
  verifyPassword(hash: string, plain: string): Promise<boolean>;
  envHas(ref: string): boolean;
  invalidateConnection(id: string): void;
  clearCache(code: string): Promise<number>;
  storage: Pick<Storage, 'save'>;
  now(): Date;
  elapsed(): number;
}
