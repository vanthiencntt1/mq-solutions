import type { AuditWriter, PiiCipher, RateLimiter } from '@/lib/domain/account/ports';
import type { FacilityDirectory } from '@/lib/domain/identity/ports';
import type { IdentResult } from '@/lib/domain/identity/types';
import type { CacheStore, HisGateway } from '@/lib/domain/ports';

export interface IdentityResolver {
  resolve(accountId: string, facilityCode: string): Promise<IdentResult>;
}

export interface RecordsDeps {
  identity: IdentityResolver;
  facilities: Pick<FacilityDirectory, 'findByCode'>;
  his: HisGateway;
  cache: CacheStore;
  limiter: RateLimiter;
  audit: AuditWriter;
  pii: PiiCipher;
  now: () => Date;
  token: () => string;
}
