import { Facebook, Mail, MessageCircle, Phone } from 'lucide-react';
import { SITE } from '@/lib/config/site';

export function SupportOptions({ zaloUrl, facebookUrl }: { zaloUrl?: string; facebookUrl?: string }) {
  return (
    <aside className="border-hairline bg-paper mt-12 rounded-2xl border p-6 shadow-sm md:p-8">
      <h2 className="section-title">Các hình thức hỗ trợ</h2>
      <p className="text-slate-gray mt-2">Cần giải đáp thêm về quy trình đặt khám hoặc hồ sơ?</p>
      <div className="mt-5 flex flex-wrap gap-4">
        <a
          className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold"
          href={`tel:${SITE.hotline.replace(/\s/g, '')}`}
        >
          <Phone className="size-5" aria-hidden /> {SITE.hotline}
        </a>
        <a
          className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold"
          href={`mailto:${SITE.email}`}
        >
          <Mail className="size-5" aria-hidden /> Email hỗ trợ
        </a>
        {zaloUrl && (
          <a
            className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold"
            href={zaloUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-5" aria-hidden /> Zalo
          </a>
        )}
        {facebookUrl && (
          <a
            className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold"
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook className="size-5" aria-hidden /> Facebook
          </a>
        )}
      </div>
    </aside>
  );
}
