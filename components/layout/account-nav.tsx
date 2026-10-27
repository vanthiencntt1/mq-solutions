import Link from 'next/link';
import { LogoutButton } from '@/components/features/auth/session-buttons';
import { ACCOUNT_NAV } from '@/lib/config/site';

export function AccountNav() {
  return (
    <nav aria-label="Tài khoản" className="hidden md:block">
      <ul className="border-border bg-card space-y-1 rounded-xl border p-2 shadow-sm">
        {ACCOUNT_NAV.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="text-body-sm text-ink-navy hover:bg-muted block rounded-md px-3 py-2 font-medium"
            >
              {i.label}
            </Link>
          </li>
        ))}
        <li className="border-border border-t px-1 pt-2">
          <LogoutButton />
        </li>
      </ul>
    </nav>
  );
}
