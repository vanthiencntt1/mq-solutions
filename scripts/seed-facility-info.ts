// Nạp thông tin công khai của 4 bệnh viện (lấy từ website chính thức ngày 27/10/2026). Chạy: npx tsx --env-file=.env scripts/seed-facility-info.ts
// Ảnh trỏ tới storage/public/2026/10 – khi dựng máy chủ mới cần chép kèm các tệp ảnh đó.
import { PrismaClient } from '@prisma/client';
import { ContentBlocksSchema } from '../lib/domain/content/blocks';

const prisma = new PrismaClient();
const p = (text: string) => ({ type: 'paragraph' as const, content: [{ text }] });
const h = (text: string) => ({ type: 'heading' as const, level: 2 as const, text });
const list = (items: string[]) => ({ type: 'list' as const, ordered: false, items: items.map((text) => [{ text }]) });
const link = (label: string, href: string) => [{ text: label, href }];

const data = {
  BVAB: {
    address: '146 An Bình, Phường An Đông, TP. Hồ Chí Minh',
    hotline: '028 3923 4359',
    workingHours: { 'Khám bệnh (T2–T6)': '07:00–16:30', 'Cấp cứu': '24/7' },
    shortDesc:
      'Bệnh viện công lập tại TP.HCM với khoảng 1.000 nhân viên, đón khoảng 3.000 lượt khám mỗi ngày. Phương châm: Kiến thức – Trách nhiệm – Tình thương.',
    images: ['/uploads/2026/10/12d55353-d0b3-4b21-91e4-16c5cf852413.webp'],
    intro: [
      p('Bệnh viện An Bình hoạt động với phương châm "Kiến thức – Trách nhiệm – Tình thương", có khoảng 1.000 nhân viên và tiếp nhận khoảng 3.000 lượt khám mỗi ngày.'),
      h('Chuyên khoa nổi bật'),
      list(['Nội tim mạch', 'Tiêu hóa', 'Nội thần kinh', 'Da liễu', 'Mắt', 'Phụ sản', 'Ngoại tổng hợp', 'Chấn thương chỉnh hình', 'Phục hồi chức năng', 'Phẫu thuật tạo hình thẩm mỹ', 'Chẩn đoán hình ảnh, xét nghiệm']),
      h('Dịch vụ'),
      list(['Khám sức khỏe định kỳ', 'Tiêm chủng', 'Đưa đón người bệnh tại nhà, giao thuốc tận nhà', 'Phòng sanh gia đình, lớp học tiền sản', 'Cấy ghép Implant', 'Điều trị trong ngày']),
      h('Liên hệ'),
      { type: 'list' as const, ordered: false, items: [
        [{ text: 'Cấp cứu, tổng đài: (028) 3923 4359 – (028) 3923 4260' }],
        [{ text: 'Email: bv.anbinh@tphcm.gov.vn' }],
        link('Website benhvienanbinh.vn', 'https://benhvienanbinh.vn/'),
        link('Fanpage Facebook', 'https://www.facebook.com/benhvienanbinh.vn'),
        link('Zalo OA', 'https://zalo.me/4595432398291249253'),
      ] },
    ],
  },
  BVTD: {
    address: '29 Phú Châu, Phường Tam Bình, TP. Hồ Chí Minh',
    hotline: '0966 331 010',
    workingHours: { 'Khám bệnh (T2–T6)': '07:00–16:30', 'Cấp cứu': '24/7' },
    shortDesc:
      'Bệnh viện đa khoa hạng I trực thuộc Sở Y tế TP.HCM, 800 giường kế hoạch, khám ngoại trú khoảng 4.000–4.500 lượt mỗi ngày.',
    images: [] as string[],
    intro: [
      p('Bệnh viện Đa khoa Thủ Đức là bệnh viện hạng I trực thuộc Sở Y tế TP. Hồ Chí Minh, theo định hướng "Lấy người bệnh làm trung tâm", phục vụ người dân thành phố và các tỉnh lân cận.'),
      p('Từ 50 giường ban đầu, bệnh viện nay có 800 giường kế hoạch, 40 khoa và 10 phòng ban, khoảng 1.544 nhân sự; khám ngoại trú khoảng 4.000–4.500 lượt và tiếp nhận khoảng 100 ca cấp cứu mỗi ngày.'),
      h('Các mốc phát triển'),
      list(['2007: thành lập với tên Bệnh viện quận Thủ Đức', '2014: được xếp hạng I', '2018: Huân chương Lao động hạng III', '2021: đổi tên Bệnh viện thành phố Thủ Đức', '2025: đổi tên Bệnh viện Đa khoa Thủ Đức']),
      h('Khối chuyên khoa'),
      list([
        'Khối Nội: Nội tổng hợp, Nhi, Nội tiết, Nội thần kinh, Da liễu, Y học cổ truyền, Dinh dưỡng',
        'Khối Ngoại: Ngoại tổng hợp, Ung bướu, Tiết niệu – Nam khoa, Sản, Chấn thương chỉnh hình, Mắt, Tai mũi họng, Răng hàm mặt, Tạo hình thẩm mỹ',
        'Khối Tim mạch: Nội tim mạch – Lão học, Ngoại lồng ngực – Mạch máu, Tim mạch can thiệp',
        'Khối Hồi sức: Cấp cứu, Hồi sức tích cực – Chống độc, Nội thận – Thận nhân tạo, Hồi sức nhi – Sơ sinh',
      ]),
      h('Liên hệ'),
      { type: 'list' as const, ordered: false, items: [
        [{ text: 'Hotline: 0966 331 010 · CSKH: (028) 7302 2115 (T2–T6, 7:00–16:30)' }],
        [{ text: 'Email: bv.dkthuduc@tphcm.gov.vn' }],
        link('Website benhvienthuduc.vn', 'https://benhvienthuduc.vn/'),
        link('Fanpage Facebook', 'https://www.facebook.com/benhviendakhoathuduc2'),
        link('Zalo', 'https://zalo.me/84966331010'),
      ] },
    ],
  },
  BVNB: {
    address: '281A Lê Văn Lương, Ấp 21, Xã Nhà Bè, TP. Hồ Chí Minh',
    hotline: '0966 291 010',
    workingHours: { 'Cấp cứu': '24/24' },
    shortDesc:
      'Bệnh viện đa khoa hạng II thuộc Sở Y tế TP.HCM, 110 giường; năm 2026 dự kiến chuyển về cơ sở mới quy mô 300 giường.',
    images: [] as string[],
    intro: [
      p('Bệnh viện Đa khoa Nhà Bè (trước đây là Bệnh viện huyện Nhà Bè) là đơn vị y tế công lập thuộc Sở Y tế TP. Hồ Chí Minh, khám chữa bệnh đa khoa và là cơ sở thực hành cho sinh viên khối ngành sức khỏe.'),
      p('Bệnh viện xếp hạng II, có 110 giường với 12 khoa lâm sàng và 4 khoa cận lâm sàng. Trong năm 2026, bệnh viện dự kiến chuyển về cơ sở mới quy mô 300 giường.'),
      h('Chuyên khoa và dịch vụ'),
      list(['Khoa Thận – Lọc máu (thành lập 10/2025)', 'Phụ sản', 'Y, Dược cổ truyền', 'Xét nghiệm', 'Cấp cứu – Hồi sức tích cực và chống độc 24/24, trạm cấp cứu ngoại viện 115', 'Đặt khám online, khám từ xa và khám bệnh tại nhà']),
      h('Liên hệ'),
      { type: 'list' as const, ordered: false, items: [
        [{ text: 'Hotline: 0966 291 010 · Cấp cứu: 115 hoặc (028) 3781 6574' }],
        [{ text: 'Điện thoại: (028) 3781 5558 · CSKH: (028) 6681 4156' }],
        link('Website benhviennhabe.vn', 'https://www.benhviennhabe.vn/'),
      ] },
    ],
  },
  BVCC: {
    address: '1307 Tỉnh lộ 7, Xã An Nhơn Tây, TP. Hồ Chí Minh',
    hotline: '0966 301 010',
    workingHours: { 'T2–T6': '07:00–16:30', 'T7–CN': '07:00–11:30', 'Cấp cứu': '24/24' },
    shortDesc:
      'Bệnh viện đa khoa trực thuộc Sở Y tế TP.HCM, hơn 260 giường; có trạm cấp cứu vệ tinh 115, chụp CT và MRI. Phương châm: Vững tin – Đổi mới – Chất lượng.',
    images: ['/uploads/2026/10/bbf6fc30-3d2f-4f61-8aca-656553589bca.jpg'],
    intro: [
      p('Bệnh viện Đa khoa Củ Chi có nguồn gốc từ trạm y tế thành lập năm 1975, trở thành bệnh viện từ 30/04/1977. Bệnh viện có hơn 260 giường sau khi đưa khu nhà mới vào sử dụng năm 2016.'),
      p('Ngoài khám chữa bệnh thông thường, bệnh viện phẫu thuật, can thiệp được nhiều ca bệnh nặng, phức tạp mà không cần chuyển lên tuyến trên. Bệnh viện là trạm cấp cứu vệ tinh 115 thứ 15 của TP.HCM.'),
      h('Chuyên khoa và cận lâm sàng'),
      list(['Khám bệnh, Cấp cứu', 'Nội – Nhi', 'Ngoại tổng hợp', 'Phụ sản', 'Y học cổ truyền', 'Vật lý trị liệu cho người liệt nửa người và trẻ bại não', 'Xét nghiệm, X-quang, chụp cắt lớp vi tính (CT) và MRI']),
      h('Liên hệ'),
      { type: 'list' as const, ordered: false, items: [
        [{ text: 'Hotline: 0966 301 010 · Cấp cứu: (028) 3794 6394' }],
        link('Website benhvienhuyencuchi.com', 'https://benhvienhuyencuchi.com/'),
        link('Fanpage Facebook', 'https://www.facebook.com/bvdakhoacuchi'),
      ] },
    ],
  },
};

async function main() {
  for (const [code, d] of Object.entries(data)) {
    const introJson = ContentBlocksSchema.parse(d.intro);
    const before = await prisma.facility.findUniqueOrThrow({ where: { code }, select: { images: true } });
    const images = [...new Set([...d.images, ...before.images])];
    await prisma.facility.update({
      where: { code },
      data: {
        address: d.address,
        hotline: d.hotline,
        workingHours: d.workingHours,
        shortDesc: d.shortDesc,
        introJson,
        images,
      },
    });
    console.log('ok', code, images.length, 'ảnh');
  }
}
main().finally(() => prisma.$disconnect());
