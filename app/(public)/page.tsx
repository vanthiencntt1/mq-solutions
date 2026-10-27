import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { FeaturedFacilities } from '@/components/features/home/featured-facilities';
import {
  HomeHero,
  HomePartners,
  HomeServices,
  HomeSpecialties,
  HomeStats,
  type SectionData,
} from '@/components/features/home/home-sections';
import {
  HomeBenefits,
  HomeCta,
  HomeFaq,
  HomeSteps,
  HomeSupport,
  HomeTestimonials,
} from '@/components/features/home/home-sections-more';
import { RecentNews } from '@/components/features/home/recent-news';
import { BannerCarousel } from '@/components/features/site/banner-carousel';
import { SITE } from '@/lib/config/site';
import type { ContentBlocks } from '@/lib/domain/content/blocks';
import type { SiteBanner, SiteReview } from '@/lib/domain/ports';
import { getContentService } from '@/lib/services/content';
import { getHomeService, getHomeStats } from '@/lib/services/home-service';
import {
  composeHomeBlocks,
  getHomeSpecialties,
  getSiteContentService,
  getSiteSettings,
} from '@/lib/services/site-content';
import type { HomeBlock } from '@/lib/services/site-content/site-content-service';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Đặt lịch khám trực tuyến tại nhiều cơ sở y tế',
  description: 'Tìm cơ sở y tế, chọn lịch khám và nhận phiếu khám trực tuyến trên MQ Solutions.',
};

const defaultTypes = [
  'HERO',
  'PARTNERS',
  'BANNER',
  'SERVICES',
  'FACILITIES',
  'SPECIALTIES',
  'STATS',
  'TESTIMONIALS',
  'STEPS',
  'BENEFITS',
  'FAQ',
  'NEWS',
  'SUPPORT',
  'CTA',
] as const;

function sectionData(block: HomeBlock): SectionData {
  return Array.isArray(block.data) ? {} : (block.data as SectionData);
}

function structuredData(base: string, name: string, hotline: string): string {
  return JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      url: base,
      contactPoint: { '@type': 'ContactPoint', telephone: hotline, contactType: 'customer support' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name,
      url: base,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${base}/tim-kiem?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ]).replace(/</g, '\\u003c');
}

async function HomeSpecialtyFeed({ data }: { data: SectionData }) {
  // W02 mục 4: chậm ở HIS không giữ phản hồi đầu của hero và lối đặt khám.
  const groups = (await getHomeSpecialties().catch(() => []))
    .map((group) => ({
      ...group,
      facilities: group.facilities.filter(({ facility }) => !facility.name.includes('(mẫu)')),
    }))
    .filter((group) => group.facilities.length);
  return (
    <HomeSpecialties
      data={data}
      groups={groups.map((group) => ({ slug: group.slug, name: group.name, count: group.facilities.length }))}
    />
  );
}

async function HomeStatsFeed({ data, facilityCount }: { data: SectionData; facilityCount: number }) {
  if (data.items?.some((item) => item.label && item.value)) {
    return <HomeStats data={data} facilityCount={facilityCount} />;
  }
  const stats = await getHomeStats().catch(() => ({ facilityCount }));
  return <HomeStats data={data} facilityCount={facilityCount} stats={stats} />;
}

async function HomeFacilitiesFeed({
  facilities,
  data,
}: {
  facilities: Awaited<ReturnType<ReturnType<typeof getHomeService>['getFeaturedFacilities']>>;
  data: SectionData;
}) {
  if (!facilities.length) return null;
  const groups = await getHomeSpecialties().catch(() => []);
  const counts = new Map<string, number>();
  for (const group of groups) {
    for (const { facility } of group.facilities)
      counts.set(facility.code, (counts.get(facility.code) ?? 0) + 1);
  }
  return (
    <FeaturedFacilities
      data={data}
      facilities={facilities.map((facility) => ({ ...facility, specialtyCount: counts.get(facility.code) }))}
    />
  );
}

export default async function HomePage() {
  const home = getHomeService();
  const site = getSiteContentService();
  const [activeResult, featuredResult, blockResult, bannerResult, newsResult, reviewResult, settingsResult] =
    await Promise.allSettled([
      home.getActiveFacilities(),
      home.getFeaturedFacilities(),
      site.homeBlocks(),
      site.banners('HOME'),
      getContentService().posts(1, 6),
      site.testimonials(),
      getSiteSettings(),
    ]);
  const active =
    activeResult.status === 'fulfilled'
      ? activeResult.value.filter((facility) => !facility.name.includes('(mẫu)'))
      : [];
  const featured =
    featuredResult.status === 'fulfilled'
      ? featuredResult.value.filter((facility) => !facility.name.includes('(mẫu)'))
      : [];
  const cmsBlocks = blockResult.status === 'fulfilled' ? blockResult.value : [];
  // W02 mục 2: khi chưa xuất bản khối nào, thứ tự hiện có là cấu hình mặc định.
  const blocks: HomeBlock[] = composeHomeBlocks(cmsBlocks, defaultTypes);
  const banners: SiteBanner[] = bannerResult.status === 'fulfilled' ? bannerResult.value : [];
  const news = newsResult.status === 'fulfilled' ? newsResult.value.items : [];
  const reviews: SiteReview[] = reviewResult.status === 'fulfilled' ? reviewResult.value : [];
  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  const base = process.env.APP_URL ?? 'http://localhost:3000';

  return (
    <>
      <script type="application/ld+json">
        {structuredData(base, settings?.brand.name ?? SITE.name, settings?.contact.hotline ?? SITE.hotline)}
      </script>
      {blocks.map((block) => {
        const data = sectionData(block);
        switch (block.type) {
          case 'HERO':
            return (
              <HomeHero
                key={block.id}
                data={data}
                facilities={active}
                loadError={activeResult.status === 'rejected'}
              />
            );
          case 'BANNER':
            return <BannerCarousel key={block.id} banners={banners} />;
          case 'SERVICES':
            return <HomeServices key={block.id} data={data} />;
          case 'PARTNERS':
            return <HomePartners key={block.id} facilities={active} data={data} />;
          case 'FACILITIES':
            return (
              <Suspense
                key={block.id}
                fallback={
                  <FeaturedFacilities
                    facilities={featured}
                    data={data}
                    loadError={featuredResult.status === 'rejected'}
                  />
                }
              >
                <HomeFacilitiesFeed facilities={featured} data={data} />
              </Suspense>
            );
          case 'SPECIALTIES':
            return (
              <Suspense key={block.id} fallback={null}>
                <HomeSpecialtyFeed data={data} />
              </Suspense>
            );
          case 'STATS':
            return (
              <Suspense key={block.id} fallback={<HomeStats data={data} facilityCount={active.length} />}>
                <HomeStatsFeed data={data} facilityCount={active.length} />
              </Suspense>
            );
          case 'TESTIMONIALS':
            return <HomeTestimonials key={block.id} data={data} reviews={reviews} />;
          case 'STEPS':
            return <HomeSteps key={block.id} data={data} />;
          case 'BENEFITS':
            return <HomeBenefits key={block.id} data={data} />;
          case 'FAQ':
            return <HomeFaq key={block.id} data={data} />;
          case 'NEWS':
            return <RecentNews key={block.id} items={news} data={data} />;
          case 'SUPPORT':
            return (
              <HomeSupport
                key={block.id}
                hotline={settings?.contact.hotline ?? SITE.hotline}
                email={settings?.contact.email ?? SITE.email}
                zaloUrl={settings?.contact.zalo ?? ''}
                facebookUrl={settings?.contact.facebook ?? ''}
                data={data}
              />
            );
          case 'CTA':
            return <HomeCta key={block.id} hotline={settings?.contact.hotline ?? SITE.hotline} data={data} />;
          case 'CONTENT':
            return (
              <section key={block.id} className="container-page py-12">
                <BlockRenderer blocks={block.data as ContentBlocks} />
              </section>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
