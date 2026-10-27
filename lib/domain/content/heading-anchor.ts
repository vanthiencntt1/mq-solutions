// W06 mục 1: cùng thuật toán cho id tiêu đề và mục lục để liên kết luôn khớp.
export function headingAnchor(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `muc-${index}-${slug || 'noi-dung'}`;
}
