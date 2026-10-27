import Link from 'next/link';
import Image from 'next/image';
import { SITE } from '@/lib/config/site';

export function Logo({
  href = '/',
  name = SITE.name,
  logoUrl,
}: {
  href?: string;
  name?: string;
  logoUrl?: string;
}) {
  return (
    <Link
      href={href}
      className="text-ink-navy flex items-center gap-2 font-bold"
      aria-label={`${name} – trang chủ`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt="" width={36} height={36} unoptimized className="size-9 object-contain" />
      ) : (
        <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-md text-[15px]">
          MQ
        </span>
      )}
      <span className="text-[18px] leading-none">{name}</span>
    </Link>
  );
}
