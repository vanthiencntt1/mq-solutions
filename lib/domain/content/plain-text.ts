import type { ContentBlocks } from './blocks';

// W07: JSON-LD FAQPage cần câu trả lời dạng văn bản, không chuyển khối thành HTML.
export function blocksToPlainText(blocks: ContentBlocks): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'paragraph':
        case 'quote':
        case 'callout':
          return block.content.map((part) => part.text).join('');
        case 'heading':
          return block.text;
        case 'list':
          return block.items.map((item) => item.map((part) => part.text).join('')).join('; ');
        case 'table':
          return block.rows.flat().join('; ');
        case 'faq':
          return block.items
            .map((item) => `${item.question}: ${item.answer.map((part) => part.text).join('')}`)
            .join('; ');
        case 'image':
          return block.alt;
        case 'button':
          return block.label;
        case 'video':
          return block.title;
      }
    })
    .join(' ')
    .trim();
}
