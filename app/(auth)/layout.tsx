import { Logo } from '@/components/layout/logo';
import { Card } from '@/components/ui/card';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <Card className="w-full max-w-md rounded-2xl p-6 shadow-lg md:p-8">{children}</Card>
    </div>
  );
}
