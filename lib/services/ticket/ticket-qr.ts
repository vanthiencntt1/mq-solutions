import { createHmac, timingSafeEqual } from 'node:crypto';

const SIZE = 29; // QR Version 3-L: 55 byte dữ liệu, 15 byte sửa lỗi.
const DATA_BYTES = 55;
const ECC_BYTES = 15;

export function signTicketCode(code: string, secret: string): string {
  const mac = createHmac('sha256', secret).update(`C08:ticket:v1:${code}`).digest('hex').slice(0, 16);
  return `${code}.${mac}`;
}

export function verifyTicketCode(value: string, secret: string): string | null {
  const [code, mac, extra] = value.split('.');
  if (!code || !mac || extra || !/^MQ[A-Z0-9]{6,24}$/.test(code) || !/^[a-f0-9]{16}$/.test(mac)) return null;
  const expected = signTicketCode(code, secret).split('.')[1]!;
  return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex')) ? code : null;
}

const gfMul = (a: number, b: number) => {
  let value = 0;
  for (let i = 7; i >= 0; i--) {
    value = (value << 1) ^ ((value >>> 7) * 0x11d);
    value ^= ((b >>> i) & 1) * a;
  }
  return value;
};

function codewords(value: string): number[] {
  const bytes = [...Buffer.from(value, 'utf8')];
  if (bytes.length > 53) throw new Error('Mã QR phiếu quá dài');
  const bits = [0, 1, 0, 0, ...Array.from({ length: 8 }, (_, i) => (bytes.length >>> (7 - i)) & 1)];
  for (const byte of bytes) for (let i = 7; i >= 0; i--) bits.push((byte >>> i) & 1);
  for (let i = 0; i < Math.min(4, DATA_BYTES * 8 - bits.length); i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  // QR padding luôn bắt đầu bằng EC, bất kể độ dài dữ liệu trước đó chẵn hay lẻ.
  let firstPad = true;
  while (data.length < DATA_BYTES) {
    data.push(firstPad ? 0xec : 0x11);
    firstPad = !firstPad;
  }

  let divisor = [1];
  let root = 1;
  for (let i = 0; i < ECC_BYTES; i++) {
    const next = Array<number>(divisor.length + 1).fill(0);
    divisor.forEach((coefficient, j) => {
      next[j] = next[j]! ^ coefficient;
      next[j + 1] = next[j + 1]! ^ gfMul(coefficient, root);
    });
    divisor = next;
    root = gfMul(root, 2);
  }
  const remainder = [...data, ...Array<number>(ECC_BYTES).fill(0)];
  for (let i = 0; i < DATA_BYTES; i++) {
    const factor = remainder[i]!;
    divisor.forEach((coefficient, j) => {
      remainder[i + j] = remainder[i + j]! ^ gfMul(coefficient, factor);
    });
  }
  return [...data, ...remainder.slice(DATA_BYTES)];
}

function matrix(value: string): boolean[][] {
  const modules = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const used = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const put = (x: number, y: number, black: boolean) => {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) {
      modules[y]![x] = black;
      used[y]![x] = true;
    }
  };
  for (const [cx, cy] of [
    [3, 3],
    [SIZE - 4, 3],
    [3, SIZE - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        put(cx + dx, cy + dy, dist === 3 || dist <= 1);
      }
  }
  for (let i = 8; i < SIZE - 8; i++) {
    put(6, i, i % 2 === 0);
    put(i, 6, i % 2 === 0);
  }
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      put(22 + dx, 22 + dy, dist === 2 || dist === 0);
    }
  // Level L + mask 0 có 15 bit định dạng 0x77c4 theo ISO/IEC 18004.
  const format = 0x77c4;
  const bit = (i: number) => ((format >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) put(8, i, bit(i));
  put(8, 7, bit(6));
  put(8, 8, bit(7));
  put(7, 8, bit(8));
  for (let i = 9; i < 15; i++) put(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) put(SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) put(8, SIZE - 15 + i, bit(i));
  put(8, SIZE - 8, true);

  const dataBits = codewords(value).flatMap((byte) =>
    Array.from({ length: 8 }, (_, i) => (byte >>> (7 - i)) & 1),
  );
  let index = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < SIZE; vertical++) {
      const y = ((right + 1) & 2) === 0 ? SIZE - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset++) {
        const x = right - offset;
        if (!used[y]![x]) modules[y]![x] = ((dataBits[index++] ?? 0) !== 0) !== ((x + y) % 2 === 0);
      }
    }
  }
  return modules;
}

/** SVG sinh phía server; QR chỉ mang mã phiếu và HMAC, không có MaBN/CCCD. */
export function signedTicketQr(code: string, secret: string): string {
  const cells = matrix(signTicketCode(code, secret));
  const paths = cells.flatMap((row, y) =>
    row.flatMap((black, x) => (black ? [`M${x + 4} ${y + 4}h1v1h-1z`] : [])),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h37v37H0z"/><path fill="#0b3558" d="${paths.join('')}"/></svg>`;
}
