import React from 'react';

// JSON-LD từ nội dung đã kiểm Zod; escape dấu < để không đóng thẻ script trong HTML.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json">{JSON.stringify(data).replace(/</g, '\\u003c')}</script>;
}

