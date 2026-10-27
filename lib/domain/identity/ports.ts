import type { AuditWriter, PiiCipher, RateLimiter } from '@/lib/domain/account/ports';
import type { CacheStore, HisGateway } from '@/lib/domain/ports';

export interface FacilityRef {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
}

/** Tra cơ sở theo mã / các cơ sở bệnh nhân từng đặt khám (nguồn: bảng facility, appointment). */
export interface FacilityDirectory {
  findByCode(code: string): Promise<FacilityRef | null>;
  listBookedBy(accountId: string): Promise<(FacilityRef & { lastExamDate: Date })[]>;
}

export interface IdentityAccount {
  id: string;
  cccd: string;
  phone: string;
  fullName: string;
  birthYear: number;
}

export interface IdentityAccountReader {
  load(accountId: string): Promise<IdentityAccount | null>;
}

export interface IdentityDeps {
  his: HisGateway;
  cache: CacheStore;
  limiter: RateLimiter;
  audit: AuditWriter;
  facilities: FacilityDirectory;
  accounts: IdentityAccountReader;
  pii: Pick<PiiCipher, 'hmac'>;
  now: () => Date;
}
