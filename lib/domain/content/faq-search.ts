import type { PublicFaq } from './types';
import { blocksToPlainText } from './plain-text';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();

// W07 mục 1: tìm cả câu hỏi và nội dung trả lời, không phân biệt dấu tiếng Việt.
export function filterFaqs(items: PublicFaq[], query: string): PublicFaq[] {
  const needle = normalize(query.trim());
  if (!needle) return items;
  return items.filter((item) =>
    normalize(`${item.groupName} ${item.question} ${blocksToPlainText(item.blocks)}`).includes(needle),
  );
}
