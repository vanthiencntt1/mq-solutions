'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Breadcrumb } from './breadcrumb';

const LABELS: Record<string, string> = {
  'co-so-y-te': 'Cơ sở y tế',
  'co-so': 'Cơ sở y tế',
  'dat-kham': 'Đặt khám',
  'chuyen-khoa': 'Chuyên khoa',
  'bac-si': 'Bác sĩ',
  'tin-tuc': 'Tin tức',
  'huong-dan': 'Hướng dẫn',
  'hop-tac': 'Hợp tác',
  'chinh-sach': 'Chính sách',
  'tim-kiem': 'Tìm kiếm',
};

export function AutoBreadcrumb({ baseUrl }: { baseUrl: string }) {
  const pathname = usePathname();
  // Trang chi tiết (cơ sở, bác sĩ, tin…): mục cuối lấy tiêu đề h1 thay vì slug không dấu
  const [title, setTitle] = useState<{ path: string; text: string } | null>(null);
  useEffect(() => {
    const text = document.querySelector('main h1')?.textContent?.trim();
    setTitle(text ? { path: pathname, text } : null);
  }, [pathname]);
  if (pathname === '/') return null;
  const segments = pathname.split('/').filter(Boolean);
  const items = segments.map((segment, index) => {
    let label = LABELS[segment];
    if (!label && index === segments.length - 1 && title?.path === pathname) label = title.text;
    if (!label) {
      try {
        label = decodeURIComponent(segment).replace(/-/g, ' ');
      } catch {
        label = segment.replace(/-/g, ' ');
      }
    }
    return { label, href: `/${segments.slice(0, index + 1).join('/')}` };
  });

  return (
    <div className="container-page">
      <Breadcrumb items={items} baseUrl={baseUrl} />
    </div>
  );
}
