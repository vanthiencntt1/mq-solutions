import { Logo } from '@/components/layout/logo';
import { Card } from '@/components/ui/card';

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <Logo href="/admin" />
      <Card className="w-full max-w-md p-6">{children}</Card>
    </div>
  );
}
