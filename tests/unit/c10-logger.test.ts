import { describe, expect, it } from 'vitest';
import { createLogger, redactLogValue } from '@/lib/infra/logger';

describe('C10 log không lộ dữ liệu cá nhân', () => {
  it('che khóa nhạy cảm ở mọi độ sâu, kể cả Data và Result của HIS', () => {
    const input = {
      req: { body: { cccd: '079090000001' } },
      his: { Data: [{ Result: { maBN: '123456', hoTen: 'Nguyễn Văn Mẫu' } }] },
      contact: { phone: '0900000001', EMAIL: 'mau@example.com' },
      facilityId: 'BVQ7',
    };
    const output = redactLogValue(input);
    const json = JSON.stringify(output);
    expect(json).toContain('BVQ7');
    expect(json).not.toContain('079090000001');
    expect(json).not.toContain('123456');
    expect(json).not.toContain('Nguyễn Văn Mẫu');
    expect(json).not.toContain('mau@example.com');
  });

  it('Pino lọc cả lỗi và chuỗi ghi log trước khi xuất', () => {
    let line = '';
    const stream = {
      write: (chunk: string) => {
        line += chunk;
      },
    };
    const logger = createLogger(stream);
    logger.error(
      { err: new Error('CCCD 079090000001'), nested: { mobile: '0900000001' } },
      'mail mau@example.com',
    );
    logger.child({ fullName: 'Nguyễn Văn Mẫu', his: { Data: { maBN: '123456' } } }).info('child');
    expect(line).toContain('[ẩn]');
    expect(line).not.toContain('079090000001');
    expect(line).not.toContain('0900000001');
    expect(line).not.toContain('mau@example.com');
    expect(line).not.toContain('Nguyễn Văn Mẫu');
    expect(line).not.toContain('123456');
  });
});
