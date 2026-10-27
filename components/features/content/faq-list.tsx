'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { PublicFaq } from '@/lib/domain/content/types';
import { filterFaqs } from '@/lib/domain/content/faq-search';
import { BlockRenderer } from './block-renderer';

export function FaqList({ items }: { items: PublicFaq[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterFaqs(items, query), [items, query]);
  const groups = [...new Set(filtered.map((item) => item.groupName))];
  return (
    <section id="cau-hoi-thuong-gap" className="space-y-6">
      <div>
        <h2 className="text-[26px] md:text-[38px]">Câu hỏi thường gặp</h2>
        <p className="text-slate-gray mt-2">Tìm câu trả lời theo chủ đề hoặc từ khóa.</p>
      </div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Tìm trong câu hỏi thường gặp</span>
        <Search className="text-slate-gray absolute top-3 left-3 size-5" aria-hidden />
        <Input
          className="pl-10"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ví dụ: hoàn tiền, tài khoản..."
        />
      </label>
      {groups.map((group) => (
        <div key={group}>
          <h3 className="mb-3 text-[20px]">{group}</h3>
          <div className="space-y-3">
            {filtered
              .filter((item) => item.groupName === group)
              .map((item) => (
                <details key={item.id} className="border-hairline bg-paper rounded-xl border p-4 shadow-sm">
                  <summary className="cursor-pointer font-semibold">{item.question}</summary>
                  <div className="mt-4">
                    <BlockRenderer blocks={item.blocks} />
                  </div>
                </details>
              ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-slate-gray">Không tìm thấy câu hỏi phù hợp.</p>}
    </section>
  );
}
