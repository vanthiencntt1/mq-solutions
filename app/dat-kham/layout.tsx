import { SiteHeader } from '@/components/layout/site-header';

// Luồng đặt khám 4 chặng (C05): không footer để tập trung.
export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="noi-dung" className="container-page py-8">
        {children}
      </main>
    </>
  );
}
