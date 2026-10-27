import { describe, expect, it } from 'vitest';
import {
  Accessibility,
  Activity,
  Baby,
  Bone,
  Brain,
  Droplet,
  Droplets,
  Ear,
  Eye,
  FlaskConical,
  HeartPulse,
  Pill,
  Ribbon,
  Scan,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  Venus,
  Wind,
} from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SpecialtyIcon,
  specialtyIcon,
  specialtyIllustration,
} from '@/components/features/specialty/specialty-icon';

describe('specialtyIcon', () => {
  it.each([
    ['Nhi khoa', Baby],
    ['TIM MẠCH', HeartPulse],
    ['Mắt', Eye],
    ['Tai Mũi Họng', Ear],
    ['TMH', Ear],
    ['Răng-Hàm-Mặt', Smile],
    ['Thần kinh', Brain],
    ['Da liễu', Sparkles],
    ['Sản - Phụ khoa', Venus],
    ['Huyết học', Droplet],
    ['Xét nghiệm', FlaskConical],
    ['Chẩn đoán hình ảnh', Scan],
    ['Phục hồi chức năng', Accessibility],
    ['Chấn thương chỉnh hình', Bone],
    ['Hô hấp', Wind],
    ['Tiêu hóa', Pill],
    ['Thận - Tiết niệu', Droplets],
    ['Nội tiết', Activity],
    ['Ung bướu', Ribbon],
    ['Ngoại khoa', Scissors],
    ['Nội tổng quát', Stethoscope],
    ['Tên chưa có ánh xạ', Stethoscope],
  ])('maps %s to its expected icon', (name, icon) => {
    expect(specialtyIcon(name)).toBe(icon);
  });
});

describe('specialtyIllustration', () => {
  it.each([
    ['Nội thận - Thận nhân tạo', 'ck-than-loc-mau.webp'],
    ['Lọc máu', 'ck-than-loc-mau.webp'],
    ['Thận nhân tạo', 'ck-than-loc-mau.webp'],
    ['Ngoại tiết niệu - Nam khoa', 'ck-than-tiet-nieu.webp'],
    ['Tiết niệu', 'ck-than-tiet-nieu.webp'],
    ['Thận', 'ck-than-tiet-nieu.webp'],
    ['Nam khoa', 'ck-than-tiet-nieu.webp'],
    ['Ngoại lồng ngực - Mạch máu', 'ck-tim-mach.webp'],
    ['Nội Tim mạch', 'ck-tim-mach.webp'],
    ['Nội tim mạch - Lão học', 'ck-tim-mach.webp'],
    ['Hồi sức tim mạch', 'ck-tim-mach.webp'],
    ['Tim mạch', 'ck-tim-mach.webp'],
    ['Lồng ngực', 'ck-tim-mach.webp'],
    ['Mạch máu', 'ck-tim-mach.webp'],
    ['Ngoại thần kinh', 'ck-than-kinh.webp'],
    ['Nội thần kinh', 'ck-than-kinh.webp'],
    ['Tâm thể', 'ck-tam-than.webp'],
    ['Tâm thần', 'ck-tam-than.webp'],
    ['Tâm lý', 'ck-tam-than.webp'],
    ['Nội Tiêu hóa', 'ck-tieu-hoa.webp'],
    ['Mắt', 'ck-mat.webp'],
    ['Nhãn khoa', 'ck-mat.webp'],
    ['Tai Mũi Họng', 'ck-tai-mui-hong.webp'],
    ['TMH', 'ck-tai-mui-hong.webp'],
    ['Da liễu', 'ck-da-lieu.webp'],
    ['Tiêu hóa', 'ck-tieu-hoa.webp'],
    ['Gan mật', 'ck-tieu-hoa.webp'],
    ['Ngoại tiêu hóa', 'ck-ngoai-tieu-hoa.webp'],
    ['Ngoại tổng hợp', 'ck-ngoai-tong-hop.webp'],
    ['Ngoại tổng quát', 'ck-ngoai-tong-hop.webp'],
    ['Phẫu thuật', 'ck-ngoai-tong-hop.webp'],
    ['Phẫu thuật - Tạo hình thẩm mỹ', 'ck-ngoai-tong-hop.webp'],
    ['Chấn thương chỉnh hình', 'ck-chan-thuong-chinh-hinh.webp'],
    ['Xương khớp', 'ck-chan-thuong-chinh-hinh.webp'],
    ['Ung bướu', 'ck-ung-buou.webp'],
    ['Hóa trị', 'ck-ung-buou.webp'],
    ['Y học cổ truyền', 'ck-y-hoc-co-truyen.webp'],
    ['Y học cổ truyền - Vật lý trị liệu', 'ck-y-hoc-co-truyen.webp'],
    ['Phục hồi chức năng', 'ck-phuc-hoi-chuc-nang.webp'],
    ['Vật lý trị liệu', 'ck-phuc-hoi-chuc-nang.webp'],
    ['Nội tiết', 'ck-noi-tiet.webp'],
    ['Đái tháo đường', 'ck-noi-tiet.webp'],
    ['Dinh dưỡng - Tiết chế', 'ck-dinh-duong.webp'],
    ['Hồi sức tích cực', 'ck-cap-cuu.webp'],
    ['Hồi sức tích cực Nhi', 'ck-cap-cuu.webp'],
    ['Cấp cứu', 'ck-cap-cuu.webp'],
    ['Chống độc', 'ck-cap-cuu.webp'],
    ['Huyết học - Truyền máu', 'ck-xet-nghiem.webp'],
    ['Xét nghiệm', 'ck-xet-nghiem.webp'],
    ['Huyết học', 'ck-xet-nghiem.webp'],
    ['Chẩn đoán hình ảnh', 'ck-chan-doan-hinh-anh.webp'],
    ['X-quang', 'ck-chan-doan-hinh-anh.webp'],
    ['CT', 'ck-chan-doan-hinh-anh.webp'],
    ['MRI', 'ck-chan-doan-hinh-anh.webp'],
    ['Siêu âm', 'ck-chan-doan-hinh-anh.webp'],
    ['Giải phẫu bệnh', 'ck-giai-phau-benh.webp'],
    ['Truyền nhiễm', 'ck-truyen-nhiem.webp'],
    ['Nhiệt đới', 'ck-truyen-nhiem.webp'],
    ['Nội tổng quát Nhiễm', 'ck-truyen-nhiem.webp'],
    ['Tiêm chủng', 'ck-tiem-chung.webp'],
    ['Vắc xin', 'ck-tiem-chung.webp'],
    ['Dược', 'ck-duoc.webp'],
    ['Khám bệnh', 'ck-kham-benh.webp'],
    ['Phòng khám đa khoa', 'ck-kham-benh.webp'],
    ['Nội tổng hợp', 'ck-kham-tong-quat.webp'],
    ['Sản khoa', 'ck-san-phu-khoa.webp'],
    ['Phụ khoa', 'ck-san-phu-khoa.webp'],
    ['Sản phụ', 'ck-san-phu-khoa.webp'],
    ['Khám tổng quát', 'ck-kham-tong-quat.webp'],
    ['Nội tổng quát', 'ck-kham-tong-quat.webp'],
    ['Khám sức khỏe', 'ck-kham-tong-quat.webp'],
    ['Bác sĩ gia đình', 'ck-kham-tong-quat.webp'],
  ])('maps %s to %s', (name, file) => {
    expect(specialtyIllustration(name)).toBe(`/images/minh-hoa/${file}`);
  });

  it.each([
    'Răng-Hàm-Mặt',
    'Răng Hàm Mặt',
    'Nhi',
    'Nhi khoa',
    'Nội Hô hấp',
    'Lão học',
    'Chuyên gia',
    'Dịch vụ',
    'Chăm sóc tại nhà',
    'Chân',
    'Tên chưa có ánh xạ',
  ])('keeps a Lucide icon for %s', (name) => {
    expect(specialtyIllustration(name)).toBeNull();
    expect(renderToStaticMarkup(createElement(SpecialtyIcon, { name }))).toContain('<svg');
  });

  it('keeps the Smile icon for Răng Hàm Mặt', () => {
    expect(specialtyIcon('Răng Hàm Mặt')).toBe(Smile);
  });

  it('renders the matching image as decorative', () => {
    const markup = renderToStaticMarkup(createElement(SpecialtyIcon, { name: 'Mắt' }));
    expect(markup).toContain('ck-mat.webp');
    expect(markup).toContain('alt=""');
    expect(markup).toContain('width="240"');
    expect(markup).toContain('height="240"');
  });
});
