import Link from 'next/link';
import { FOOTER_COLUMNS, SITE, type PublicShell } from '@/lib/config/site';
import { Logo } from './logo';

// Footer nền cloud, tiêu đề cột 12 px IN HOA slate, link 14 px navy (10.6).
export function SiteFooter({ shell }: { shell?: PublicShell }) {
  const contact = shell ?? SITE;
  return (
    <footer className="border-border bg-cloud mt-16 border-t pb-24 lg:pb-0">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 sm:col-span-2 lg:col-span-1">
          <Logo name={contact.name} logoUrl={shell?.logoUrl} />
          <p className="text-body-sm text-slate-gray">{contact.tagline}</p>
          {contact.address && <p className="text-body-sm text-slate-gray">Địa chỉ: {contact.address}</p>}
          <p className="text-body-sm text-ink-navy">
            Hotline:{' '}
            <a className="font-semibold hover:underline" href={`tel:${contact.hotline.replace(/\s/g, '')}`}>
              {contact.hotline}
            </a>
          </p>
          <p className="text-body-sm text-ink-navy">
            Email:{' '}
            <a className="hover:underline" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          </p>
          {contact.taxCode && <p className="text-body-sm text-slate-gray">Mã số thuế: {contact.taxCode}</p>}
          {shell && (
            <div className="text-body-sm flex flex-wrap gap-3">
              {[
                { name: 'Facebook', url: shell.facebookUrl },
                { name: 'Zalo', url: shell.zaloUrl },
                { name: 'YouTube', url: shell.youtubeUrl },
                { name: 'TikTok', url: shell.tiktokUrl },
              ]
                .filter((item) => item.url)
                .map((item) => (
                  <a
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-navy hover:underline"
                  >
                    {item.name}
                  </a>
                ))}
            </div>
          )}
        </div>
        {(shell?.footerColumns ?? FOOTER_COLUMNS).map((col) => (
          <div key={col.title}>
            <h2 className="text-caption text-slate-gray mb-3 font-semibold tracking-wide uppercase">
              {col.title}
            </h2>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={`${l.href}:${l.label}`}>
                  <Link
                    href={l.href}
                    className="text-body-sm text-ink-navy hover:text-primary inline-flex min-h-11 items-center font-medium lg:min-h-0"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-border text-caption text-slate-gray border-t py-4 text-center">
        <div className="container-page space-y-1">
          <p>
            © {new Date().getFullYear()} {contact.name}. Bảo lưu mọi quyền.
          </p>
          <p>Nội dung y tế chỉ có giá trị tham khảo, không thay thế chẩn đoán của bác sĩ.</p>
          {shell?.termsVersion && <p>Điều khoản dịch vụ: phiên bản {shell.termsVersion}</p>}
          {shell?.privacyVersion && <p>Chính sách bảo mật: phiên bản {shell.privacyVersion}</p>}
        </div>
      </div>
    </footer>
  );
}
