import type { Metadata } from 'next';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { ContactForm } from '@/components/features/content/contact-form';
import { getContentService } from '@/lib/services/content';

export const revalidate = 60;
export async function generateMetadata(): Promise<Metadata> {
  const content = await getContentService().pageBySlug('hop-tac');
  return {
    title: content?.title ?? 'Liên hệ hợp tác',
    description: 'Hợp tác cùng MQ Solutions để kết nối người bệnh với dịch vụ y tế thuận tiện hơn.',
    alternates: { canonical: '/hop-tac' },
  };
}

export default async function Page() {
  const content = await getContentService().pageBySlug('hop-tac');
  return (
    <div className="container-page py-10 md:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-deep-cobalt text-body-sm mb-3 font-semibold uppercase">
          Kết nối cùng MQ Solutions
        </p>
        <h1 className="text-[32px] leading-tight md:text-[50px]">Liên hệ hợp tác</h1>
        <p className="text-slate-gray mt-4 text-[18px] leading-7">
          Chia sẻ nhu cầu của đơn vị bạn. Chúng tôi sẽ phản hồi qua email hoặc điện thoại.
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
        <div className="border-hairline bg-paper rounded-2xl border p-6 shadow-sm">
          {content ? (
            <BlockRenderer blocks={content.blocks} />
          ) : (
            <>
              <h2 className="mb-4 text-[26px]">Cùng mở rộng khả năng tiếp cận y tế</h2>
              <p className="text-slate-gray leading-7">
                MQ Solutions kết nối người bệnh với cơ sở y tế qua trải nghiệm đặt khám và theo dõi thông tin
                thuận tiện. Chúng tôi chào đón đề xuất từ cơ sở y tế, phòng mạch và đối tác truyền thông.
              </p>
            </>
          )}
        </div>
        <section className="border-hairline bg-paper rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-5 text-[26px]">Gửi đề xuất hợp tác</h2>
          <ContactForm siteKey={process.env.TURNSTILE_SITE_KEY || undefined} />
        </section>
      </div>
    </div>
  );
}
