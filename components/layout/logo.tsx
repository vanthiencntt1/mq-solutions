import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/config/site';
import { cn } from '@/lib/utils/cn';

/** Logo CMS nếu có, mặc định là logo MQ Soft đã gồm chữ. */
export function Logo({
  href = '/',
  name = SITE.name,
  logoUrl,
  size = 'header',
}: {
  href?: string;
  name?: string;
  logoUrl?: string;
  size?: 'header' | 'footer';
}) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-md focus-visible:ring-3"
      aria-label={`${name} – trang chủ`}
    >
      <Image
        src={logoUrl || '/brand/logo.png'}
        alt=""
        width={550}
        height={400}
        unoptimized={Boolean(logoUrl)}
        priority={size === 'header'}
        className={cn('w-auto object-contain', size === 'footer' ? 'h-12' : 'h-11')}
      />
    </Link>
  );
}
