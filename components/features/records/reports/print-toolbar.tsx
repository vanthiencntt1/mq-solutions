'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintToolbar({ back }: { back: string }) {
  return (
    <div className="report-toolbar mx-auto flex max-w-[210mm] items-center justify-between gap-3 py-4">
      <Button asChild variant="outline" size="sm">
        <Link href={back}>
          <ArrowLeft className="!size-4" /> Quay lại
        </Link>
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="!size-4" /> In / Lưu PDF
      </Button>
    </div>
  );
}
