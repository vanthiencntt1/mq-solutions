import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, MapPin, Star } from 'lucide-react';
import { SpecialtyIcon } from '@/components/features/specialty/specialty-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';
import { formatMoney } from '@/lib/utils/format';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = (await getFacilityPublicService().specialtyGroups()).find((item) => item.slug === slug);
  return { title: `${group?.name ?? 'Chuyên khoa'} – Đặt lịch khám` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getFacilityPublicService();
  const group = (await service.specialtyGroups()).find((item) => item.slug === slug);
  if (!group) notFound();
  const [posts, facilities] = await Promise.all([
    service.relatedPosts(group.name),
    Promise.all(
      group.facilities.map(async (entry) => {
        const catalog = await service.facilityCatalog(entry.facility.code);
        const prices = (catalog.rooms ?? [])
          .filter((room) => room.specialtyHisId === entry.hisId && room.priceDv > 0)
          .map((room) => room.priceDv);
        return { ...entry, price: prices.length ? Math.min(...prices) : null };
      }),
    ),
  ]);
  return (
    <main className="container-page py-12 md:py-16">
      <header className="flex max-w-4xl items-start gap-5">
        <IconTile size="lg" className="size-16 rounded-xl [&_svg]:size-8">
          <SpecialtyIcon name={group.name} size="lg" />
        </IconTile>
        <div>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">Chuyên khoa</p>
          <h1 className="text-ink-navy mt-2 text-[42px] leading-tight font-bold md:text-[68px]">
            {group.name}
          </h1>
          <p className="text-slate-gray mt-4 text-lg">
            {group.facilities.length} cơ sở y tế đang nhận đặt khám.
          </p>
        </div>
      </header>
      <section className="mt-12" aria-labelledby="facility-heading">
        <h2 id="facility-heading" className="section-title">
          Cơ sở có chuyên khoa này
        </h2>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {facilities.map(({ facility, hisId, price }) => (
            <Card key={facility.code} className="flex min-w-0 flex-col gap-5 p-5 md:flex-row md:p-6">
              <div className="border-hairline bg-paper relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                {facility.logoUrl ? (
                  <Image
                    src={facility.logoUrl}
                    alt={`Logo ${facility.name}`}
                    fill
                    unoptimized
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="text-primary text-3xl font-bold" aria-hidden>
                    {facility.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="text-ink-navy text-2xl leading-snug font-bold">
                  <Link href={`/co-so/${facility.slug}`} className="hover:text-primary">
                    {facility.name}
                  </Link>
                </h3>
                {facility.address && (
                  <p className="text-slate-gray mt-3 flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {facility.address}
                  </p>
                )}
                {facility.rating !== null && (
                  <p className="text-slate-gray mt-2 flex items-center gap-2 text-sm">
                    <Star className="text-warning size-4" aria-hidden />
                    {facility.rating.toFixed(1)} · {facility.reviewCount} đánh giá
                  </p>
                )}
                {price !== null && (
                  <p className="text-ink-navy mt-3 text-sm">
                    Giá khám từ <strong>{formatMoney(price)}</strong>
                  </p>
                )}
                <Button asChild className="mt-5 w-full sm:w-fit">
                  <Link
                    href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}&chuyen-khoa=${encodeURIComponent(hisId)}`}
                  >
                    Đặt khám <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
      {posts.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title">Bài viết liên quan</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <Card key={post.slug}>
                <h3 className="text-ink-navy text-2xl font-bold">
                  <Link href={`/tin-tuc/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h3>
                {post.excerpt && <p className="text-slate-gray mt-2 leading-7">{post.excerpt}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
