import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { FacilityCard } from '@/components/features/facility/FacilityCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = (await getFacilityPublicService().specialtyGroups()).find((item) => item.slug === slug);
  return { title: `${group?.name ?? 'Chuyên khoa'} – Đặt lịch khám | MQ Solutions` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getFacilityPublicService();
  const group = (await service.specialtyGroups()).find((item) => item.slug === slug);
  if (!group) notFound();
  const posts = await service.relatedPosts(group.name);
  return (
    <div className="container-page py-10 md:py-16">
      <p className="text-info text-sm font-semibold">CHUYÊN KHOA</p>
      <h1 className="text-ink-navy mt-3 text-[32px] font-bold md:text-[50px]">{group.name}</h1>
      <p className="text-slate-gray mt-4 text-lg">{group.facilities.length} cơ sở đang có chuyên khoa này.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {group.facilities.map(({ facility, hisId }) => (
          <div key={facility.code} className="flex flex-col gap-3">
            <FacilityCard facility={facility} />
            <Button asChild variant="outline">
              <Link
                href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}&chuyen-khoa=${encodeURIComponent(hisId)}`}
              >
                Chọn lịch chuyên khoa <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        ))}
      </div>
      {posts.length > 0 && (
        <section className="mt-14">
          <h2 className="text-ink-navy text-[26px] font-bold md:text-[38px]">Bài viết liên quan</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <Card key={post.slug}>
                <h3 className="text-ink-navy text-lg font-semibold">
                  <Link href={`/tin-tuc/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h3>
                {post.excerpt && <p className="text-slate-gray mt-2 text-sm">{post.excerpt}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
