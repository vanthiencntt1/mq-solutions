import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { JsonLd } from '@/components/features/content/json-ld';

describe('render nội dung CMS an toàn', () => {
  it('escape chuỗi có thẻ HTML trong đoạn văn', () => {
    const html = renderToStaticMarkup(
      createElement(BlockRenderer, {
        blocks: [{ type: 'paragraph', content: [{ text: '<script>alert(1)</script>' }] }],
      }),
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
  it('JSON-LD không cho nội dung đóng thẻ script', () => {
    const html = renderToStaticMarkup(
      createElement(JsonLd, { data: { headline: '</script><script>alert(1)</script>' } }),
    );
    expect(html).not.toContain('</script><script>');
    expect(html).toContain('u003c');
  });
});
