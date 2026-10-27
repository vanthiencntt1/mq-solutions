import Link from 'next/link';

export const POLICY_SLUGS = [
  'dieu-khoan-su-dung',
  'dieu-khoan-dich-vu',
  'chinh-sach-bao-mat',
  'chinh-sach-xu-ly-du-lieu-ca-nhan',
  'quy-dinh-su-dung',
  'quy-dinh-huy-hoan-tien',
  'chinh-sach-huy-hoan-tien',
] as const;

export function PolicyNav({
  pages,
  current,
}: {
  pages: { slug: string; title: string }[];
  current?: string;
}) {
  return (
    <nav
      aria-label="Mục lục chính sách"
      className="border-hairline bg-paper h-fit rounded-2xl border p-5 shadow-sm lg:sticky lg:top-24"
    >
      <p className="text-ink-navy mb-3 text-xl font-bold">Các chính sách</p>
      <ul className="space-y-1">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/chinh-sach/${page.slug}`}
              aria-current={current === page.slug ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm ${current === page.slug ? 'bg-info-bg text-primary font-semibold' : 'text-ink-navy hover:bg-pebble'}`}
            >
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
