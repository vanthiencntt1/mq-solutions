import Image from 'next/image';
import { Building2 } from 'lucide-react';

/** Logo lấy từ danh mục cơ sở; hiện biểu tượng khi cơ sở chưa có logo. */
export function FacilityLogo({
  name,
  logoUrl,
  className = '',
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`border-hairline bg-paper inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border p-2 ${className}`}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`Logo ${name}`}
          width={48}
          height={48}
          unoptimized
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <Building2 className="text-primary size-6" strokeWidth={1.75} aria-hidden />
      )}
    </span>
  );
}
