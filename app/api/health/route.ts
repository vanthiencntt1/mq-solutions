import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/services/health-service';

export const dynamic = 'force-dynamic';

// Healthcheck cho Docker / Nginx (00-CONG-NGHE-QUY-UOC mục 13)
export async function GET() {
  const report = await checkHealth().catch(() => ({
    ok: false,
    db: 'down',
    redis: 'down',
    version: 'unknown',
  }));
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
