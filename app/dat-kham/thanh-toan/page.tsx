import type { Metadata } from 'next';
import { z } from 'zod';
import { requirePageSession } from '@/app/_lib/session';
import { PaymentPanel } from '@/components/features/payment/PaymentPanel';
import { appointmentCodeSchema } from '@/lib/domain/payment/types';
import { getPaymentService } from '@/lib/services/payment';

export const metadata: Metadata = { title: 'Thanh toán đặt khám', robots: { index: false } };

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const session = await requirePageSession();
  const { code } = z.object({ code: appointmentCodeSchema }).parse(await searchParams);
  const payment = await getPaymentService().getOrCreate(session.id, code);
  return (
    <div className="[&_.section-title]:!text-[20px] md:[&_.section-title]:!text-[24px]">
      <PaymentPanel initial={payment} initialNow={Date.now()} />
    </div>
  );
}
