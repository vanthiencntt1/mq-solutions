import type { Metadata } from 'next';
import { Building2, CalendarCheck2, MessagesSquare } from 'lucide-react';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { ContactForm } from '@/components/features/content/contact-form';
import { DecorBlob } from '@/components/ui/decor-blob';
import { IconTile } from '@/components/ui/icon-tile';
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
    <main className="container-page py-12 md:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-deep-cobalt text-body-sm mb-3 font-semibold uppercase">
          Kết nối cùng MQ Solutions
        </p>
        <h1 className="text-display-responsive">Liên hệ hợp tác</h1>
        <p className="text-slate-gray mt-4 text-[18px] leading-7">
          Chia sẻ nhu cầu của đơn vị bạn. Chúng tôi sẽ phản hồi qua email hoặc điện thoại.
        </p>
      </header>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-8">
          {content ? (
            <BlockRenderer blocks={content.blocks} />
          ) : (
            <>
              <h2 className="section-title">Cùng kết nối người bệnh với cơ sở y tế</h2>
              <p className="text-slate-gray text-lg leading-8">
                Gửi thông tin đơn vị và nhu cầu hợp tác. MQ Solutions sẽ liên hệ để trao đổi cụ thể.
              </p>
            </>
          )}
          <ul className="space-y-6">
            <li className="flex gap-4">
              <IconTile>
                <Building2 aria-hidden />
              </IconTile>
              <div>
                <h3 className="text-ink-navy text-2xl font-bold">Giới thiệu cơ sở y tế</h3>
                <p className="text-slate-gray mt-2 leading-7">
                  Hiển thị thông tin cơ sở, chuyên khoa và địa chỉ để người bệnh dễ tìm.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <IconTile>
                <CalendarCheck2 aria-hidden />
              </IconTile>
              <div>
                <h3 className="text-ink-navy text-2xl font-bold">Kết nối đặt khám</h3>
                <p className="text-slate-gray mt-2 leading-7">
                  Hỗ trợ người bệnh chọn cơ sở và lịch khám phù hợp.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <IconTile>
                <MessagesSquare aria-hidden />
              </IconTile>
              <div>
                <h3 className="text-ink-navy text-2xl font-bold">Trao đổi nhu cầu</h3>
                <p className="text-slate-gray mt-2 leading-7">
                  Để lại đề xuất để cùng tìm cách hợp tác phù hợp.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div className="relative isolate min-w-0">
          <DecorBlob tone="cyan" className="-top-7 -right-3 -z-10 md:-right-5" />
          <DecorBlob tone="magenta" className="-bottom-7 -left-3 -z-10 md:-left-5" />
          <section className="border-hairline bg-paper rounded-2xl border p-6 shadow-lg md:p-8">
            <h2 className="section-title mb-3">Gửi đề xuất hợp tác</h2>
            <p className="text-slate-gray mb-7">Điền thông tin để chúng tôi liên hệ với bạn.</p>
            <ContactForm siteKey={process.env.TURNSTILE_SITE_KEY || undefined} />
          </section>
        </div>
      </div>
    </main>
  );
}
