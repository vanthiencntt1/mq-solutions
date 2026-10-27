import { z } from 'zod';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AppError } from '@/lib/domain/errors';
import type { CacheStore, HisGateway } from '@/lib/domain/ports';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import {
  parseDoctors,
  parseRooms,
  parseSchedules,
  parseSerial,
  parseSlots,
  parseSubjects,
  priceListSchema,
} from '@/lib/services/catalog/his-schemas';

export const catalogKindSchema = z.enum(['specialties', 'doctors', 'rooms', 'schedules', 'slots', 'prices']);
export type CatalogKind = z.infer<typeof catalogKindSchema>;

export const catalogQuerySchema = z.object({
  facility: z.string().min(1).max(40),
  kind: catalogKindSchema,
  room: z.coerce.number().int().positive().optional(),
  date: z.iso.date().optional(),
});

export interface AdminCatalogFacility {
  id: string;
  code: string;
  name: string;
  status: string;
  health: string;
}

export interface CatalogView {
  kind: CatalogKind;
  rows: unknown[];
  fetchedAt: string;
  source: 'his' | 'cache' | 'stale';
}

interface CachedCatalog {
  fetchedAt: string;
  payload: unknown;
}

const cachedSchema = z.object({ fetchedAt: z.iso.datetime(), payload: z.unknown() });
const staleLimitMs = 24 * 60 * 60_000;

export interface AdminCatalogDeps {
  his: HisGateway;
  cache: CacheStore;
  facilities: {
    list(ids: string[] | null): Promise<AdminCatalogFacility[]>;
    findByCode(code: string): Promise<AdminCatalogFacility | null>;
  };
  limiter: { hit(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean }> };
  purge(facilityCode: string): Promise<void>;
  audit(actorId: string, facilityId: string, ipHash: string): Promise<void>;
  now(): Date;
  ttl: { catalog: number; schedule: number; adminCatalog: number };
}

/** A03 mục 1–2: chỉ đọc HIS; bản dự phòng hết hiệu lực sau 24 giờ. */
export class AdminCatalogService {
  constructor(private readonly d: AdminCatalogDeps) {}

  listFacilities(actor: AdminPrincipal): Promise<AdminCatalogFacility[]> {
    return this.d.facilities.list(actor.facilityIds);
  }

  async read(actor: AdminPrincipal, query: z.infer<typeof catalogQuerySchema>): Promise<CatalogView> {
    const facility = await this.scopedFacility(actor, query.facility);
    this.validateSelection(query);
    const suffix = `${query.kind}:${query.room ?? 'all'}:${query.date ?? 'all'}`;
    const key = `a03:${facility.code}:${suffix}`;
    const live = this.readCached(await this.d.cache.get<unknown>(key), query.kind);
    if (live && this.within24h(live)) {
      return this.view(query.kind, live, facility.health === 'DOWN' ? 'stale' : 'cache');
    }
    const backupKey = `${key}:stale`;
    if (facility.health === 'DOWN') return this.fallback(backupKey, query.kind);
    try {
      const payload = await this.fetchHis(facility, query);
      const fetchedAt = this.d.now().toISOString();
      const record = { fetchedAt, payload };
      // Parser chạy trước khi cache để dữ liệu lỗi từ HIS không ghi đè bản lành.
      this.normalize(query.kind, payload);
      await Promise.all([
        this.d.cache.set(key, record, this.liveTtl(query.kind)),
        this.d.cache.set(backupKey, record, this.d.ttl.adminCatalog),
      ]);
      return this.view(query.kind, record, 'his');
    } catch (error) {
      if (error instanceof AppError && ['HIS_UNAVAILABLE', 'HIS_ERROR'].includes(error.code))
        return this.fallback(backupKey, query.kind);
      throw error;
    }
  }

  async clear(actor: AdminPrincipal, facilityCode: string, ipHash: string): Promise<void> {
    if (!can({ name: actor.role, permissions: actor.permissions }, PERMISSIONS.CATALOG_CLEAR))
      throw new AppError('FORBIDDEN');
    const facility = await this.scopedFacility(actor, facilityCode);
    // A03 mục 2: giới hạn cả theo người thao tác và cơ sở để tránh dội HIS.
    const [accountLimit, ipLimit] = await Promise.all([
      this.d.limiter.hit(`admin:catalog:clear:account:${actor.id}:${facility.id}`, 3, 300),
      this.d.limiter.hit(`admin:catalog:clear:ip:${ipHash}:${facility.id}`, 10, 300),
    ]);
    if (!accountLimit.allowed || !ipLimit.allowed) throw new AppError('RATE_LIMITED');
    await this.d.purge(facility.code);
    await this.d.audit(actor.id, facility.id, ipHash);
  }

  private async scopedFacility(actor: AdminPrincipal, code: string): Promise<AdminCatalogFacility> {
    const facility = await this.d.facilities.findByCode(code);
    if (!facility) throw new AppError('NOT_FOUND');
    if (actor.facilityIds !== null && !actor.facilityIds.includes(facility.id))
      throw new AppError('FORBIDDEN');
    return facility;
  }

  private validateSelection(query: z.infer<typeof catalogQuerySchema>): void {
    if (query.kind === 'slots' && (!query.room || !query.date)) throw new AppError('VALIDATION_FAILED');
    if (query.kind !== 'slots' && (query.room || query.date)) throw new AppError('VALIDATION_FAILED');
    if (query.date) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(this.d.now());
      const offset = Math.round(
        (Date.parse(`${query.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
      );
      if (offset < 0 || offset >= 14) throw new AppError('VALIDATION_FAILED');
    }
  }

  private liveTtl(kind: CatalogKind): number {
    return kind === 'schedules' || kind === 'slots' ? this.d.ttl.schedule : this.d.ttl.catalog;
  }

  private within24h(record: CachedCatalog): boolean {
    const age = this.d.now().getTime() - Date.parse(record.fetchedAt);
    return age >= 0 && age <= staleLimitMs;
  }

  private readCached(raw: unknown, kind: CatalogKind): CachedCatalog | null {
    const parsed = cachedSchema.safeParse(raw);
    if (!parsed.success) return null;
    try {
      this.normalize(kind, parsed.data.payload);
      return parsed.data;
    } catch {
      return null;
    }
  }

  private async fallback(key: string, kind: CatalogKind): Promise<CatalogView> {
    const record = this.readCached(await this.d.cache.get<unknown>(key), kind);
    if (record && this.within24h(record)) return this.view(kind, record, 'stale');
    throw new AppError('HIS_UNAVAILABLE');
  }

  private view(kind: CatalogKind, record: CachedCatalog, source: CatalogView['source']): CatalogView {
    return { kind, rows: this.normalize(kind, record.payload), fetchedAt: record.fetchedAt, source };
  }

  private async call(facilityId: string, path: string, body: unknown): Promise<unknown> {
    try {
      return await this.d.his.call<unknown>(facilityId, path, body);
    } catch (error) {
      // ApiDatKham trả 404 cho danh sách rỗng.
      if (error instanceof AppError && error.code === 'NOT_FOUND') return [];
      throw error;
    }
  }

  private async fetchHis(
    facility: AdminCatalogFacility,
    query: z.infer<typeof catalogQuerySchema>,
  ): Promise<unknown> {
    const id = facility.id;
    switch (query.kind) {
      case 'specialties':
        return this.call(id, 'Subjects/GetSubjects', {});
      case 'doctors':
        return this.call(id, 'Doctors/GetDoctors', {});
      case 'rooms': {
        const [base, weekend] = await Promise.all([
          this.call(id, 'Rooms/GetRooms', {}),
          this.call(id, 'Rooms/GetRoomsT7CN', {}),
        ]);
        return { base, weekend };
      }
      case 'schedules': {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(this.d.now());
        const end = new Date(Date.parse(`${today}T00:00:00Z`) + 13 * 86_400_000).toISOString().slice(0, 10);
        return this.call(id, 'Schedules/GetSchedules', {
          start_time: today.replaceAll('-', ''),
          end_time: end.replaceAll('-', ''),
          room_id: 0,
          doctor_id: 0,
        });
      }
      case 'slots': {
        const [slots, serial] = await Promise.all([
          this.call(id, 'Rooms/GetRoomTimeSlots', { ID: String(query.room) }),
          this.call(id, 'Booking/Getserialnumber', {
            date: query.date?.replaceAll('-', ''),
            makp: String(query.room),
          }),
        ]);
        return { room: query.room, slots, serial };
      }
      case 'prices':
        return this.call(id, 'PriceList/GetPriceList', {});
    }
  }

  private normalize(kind: CatalogKind, payload: unknown): unknown[] {
    try {
      switch (kind) {
        case 'specialties':
          return parseSubjects(payload);
        case 'doctors':
          return parseDoctors(payload);
        case 'rooms': {
          const raw = z.object({ base: z.unknown(), weekend: z.unknown() }).parse(payload);
          const weekend = new Map(parseRooms(raw.weekend).map((room) => [room.id, room]));
          return parseRooms(raw.base).map((room) => ({
            ...room,
            priceT7: weekend.get(room.id)?.priceT7 ?? room.priceT7,
            priceCn: weekend.get(room.id)?.priceCn ?? room.priceCn,
          }));
        }
        case 'schedules': {
          const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
            this.d.now(),
          );
          const end = new Date(Date.parse(`${today}T00:00:00Z`) + 14 * 86_400_000).toISOString().slice(0, 10);
          return parseSchedules(payload).filter((row) => row.date >= today && row.date < end);
        }
        case 'slots': {
          const raw = z
            .object({ room: z.number().int().positive(), slots: z.unknown(), serial: z.unknown() })
            .parse(payload);
          const used = new Set(parseSerial(raw.serial));
          // ApiDatKham GetRoomTimeSlots trả tất cả phòng, ID trong mỗi dòng chính là mã phòng.
          return parseSlots(raw.slots)
            .filter((slot) => slot.id === raw.room)
            .map((slot) => {
              let usedCount = 0;
              for (let n = slot.startNumber; n <= slot.maxNumber; n += slot.numberOfJumps)
                if (used.has(n)) usedCount += 1;
              return { ...slot, usedCount };
            });
        }
        case 'prices':
          return z.array(priceListSchema).parse(payload);
      }
    } catch {
      throw new AppError('HIS_ERROR', 'Dữ liệu danh mục từ cơ sở chưa đúng định dạng');
    }
  }
}
