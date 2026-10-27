import { getRedis, redisCache, cacheKeys, CACHE_TTL } from '@/lib/infra/redis/client';
import { hisClient } from '@/lib/infra/his';
import { prismaCatalogFacilities } from '@/lib/infra/db/catalog-facility-repository';
import { prismaBookingRules } from '@/lib/infra/db/catalog-booking-repository';
import { getIdentityService } from '@/lib/services/identity';
import type { SlotHoldStore } from '@/lib/domain/booking/draft';
import { BookingDraftService } from './booking-draft-service';
import { CatalogService } from './catalog-service';

const redisHolds: SlotHoldStore = {
  async heldNumbers(facility, room, date, numbers) {
    if (numbers.length === 0) return [];
    const keys = numbers.map((n) => cacheKeys.slotHold(facility, String(room), date, n));
    const values = await getRedis().mget(...keys);
    return numbers.filter((_, i) => values[i] !== null);
  },
  async tryHold(facility, room, date, number, owner, ttl) {
    return (
      (await getRedis().set(
        cacheKeys.slotHold(facility, String(room), date, number),
        owner,
        'EX',
        ttl,
        'NX',
      )) === 'OK'
    );
  },
};

let catalog: CatalogService | undefined;
let drafts: BookingDraftService | undefined;

export function getCatalogService(): CatalogService {
  catalog ??= new CatalogService({
    his: hisClient,
    cache: redisCache,
    facilities: prismaCatalogFacilities,
    holds: redisHolds,
    now: () => new Date(),
    keys: cacheKeys,
    ttl: CACHE_TTL,
  });
  return catalog;
}

export function getBookingDraftService(): BookingDraftService {
  drafts ??= new BookingDraftService({
    cache: redisCache,
    holds: redisHolds,
    catalog: getCatalogService(),
    identity: getIdentityService(),
    keys: cacheKeys,
    ttl: CACHE_TTL,
    rules: prismaBookingRules,
  });
  return drafts;
}

export type { CatalogFacility } from '@/lib/domain/booking/schedule';
