'use client';

import { Alert } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <Alert tone="danger">Chưa tải được góp ý của bạn. Vui lòng thử lại.</Alert>
      <Button type="button" variant="outline" onClick={reset}>
        Tải lại
      </Button>
    </div>
  );
}
