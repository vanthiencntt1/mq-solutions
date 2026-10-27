// Giá trị mặc định khi admin chưa cấu hình menu_item / system_setting (W01, A04, A11).

export const SITE = {
  name: 'MQ Solutions',
  tagline: 'Đặt khám nhanh tại các cơ sở y tế',
  hotline: '1900 0000',
  email: 'hotro@mqsolutions.vn',
  address: '',
  taxCode: '',
  zaloUrl: '',
  facebookUrl: '',
  youtubeUrl: '',
  tiktokUrl: '',
} as const;

export interface NavItem {
  href: string;
  label: string;
  children?: NavItem[];
}

export interface PublicShell {
  name: string;
  logoUrl?: string;
  tagline: string;
  hotline: string;
  email: string;
  address: string;
  taxCode: string;
  zaloUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  termsVersion?: string;
  privacyVersion?: string;
  announcement?: { text: string; href?: string };
  mainNav: NavItem[];
  footerColumns: { title: string; links: NavItem[] }[];
}

export const MAIN_NAV: NavItem[] = [
  {
    href: '/co-so-y-te',
    label: 'Cơ sở y tế',
    children: [
      { href: '/co-so-y-te', label: 'Tất cả cơ sở' },
      { href: '/co-so-y-te/benh-vien', label: 'Bệnh viện' },
      { href: '/co-so-y-te/phong-kham', label: 'Phòng khám' },
    ],
  },
  {
    href: '/dat-kham',
    label: 'Đặt khám',
    children: [
      { href: '/co-so-y-te', label: 'Theo cơ sở' },
      { href: '/chuyen-khoa', label: 'Theo chuyên khoa' },
      { href: '/bac-si', label: 'Theo bác sĩ' },
    ],
  },
  { href: '/tin-tuc', label: 'Tin tức' },
  {
    href: '/huong-dan',
    label: 'Hướng dẫn',
    children: [
      { href: '/huong-dan', label: 'Tất cả hướng dẫn' },
      { href: '/huong-dan/quy-trinh-di-kham', label: 'Quy trình đi khám' },
      { href: '/huong-dan/cau-hoi-thuong-gap', label: 'Câu hỏi thường gặp' },
    ],
  },
  { href: '/hop-tac', label: 'Hợp tác' },
];

export const ACCOUNT_NAV: NavItem[] = [
  { href: '/tai-khoan', label: 'Tổng quan' },
  { href: '/tai-khoan/phieu-kham', label: 'Phiếu khám' },
  { href: '/tai-khoan/co-so', label: 'Hồ sơ tại cơ sở' },
  { href: '/tai-khoan/thong-bao', label: 'Thông báo' },
  { href: '/tai-khoan/gop-y', label: 'Góp ý' },
  { href: '/tai-khoan/thong-tin', label: 'Thông tin cá nhân' },
  { href: '/tai-khoan/doi-mat-khau', label: 'Đổi mật khẩu' },
];

export const ADMIN_NAV_GROUPS = ['Vận hành', 'Khách hàng', 'Dữ liệu', 'Hệ thống'] as const;
export type AdminNavGroup = (typeof ADMIN_NAV_GROUPS)[number];
export type AdminNavItem = NavItem & {
  doc: string;
  group: AdminNavGroup;
  icon: string;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Tổng quan', doc: 'A10', group: 'Vận hành', icon: 'overview' },
  { href: '/admin/lich-dat', label: 'Lịch đặt & phiếu khám', doc: 'A06', group: 'Vận hành', icon: 'calendar' },
  { href: '/admin/check-in', label: 'Check-in', doc: 'A06', group: 'Vận hành', icon: 'checkin' },
  { href: '/admin/thanh-toan', label: 'Thanh toán & đối soát', doc: 'A07', group: 'Vận hành', icon: 'payment' },
  { href: '/admin/benh-nhan', label: 'Tài khoản bệnh nhân', doc: 'A05', group: 'Khách hàng', icon: 'patients' },
  { href: '/admin/danh-gia', label: 'Đánh giá & liên hệ', doc: 'A09', group: 'Khách hàng', icon: 'reviews' },
  { href: '/admin/danh-gia/gop-y', label: 'Góp ý', doc: 'A09', group: 'Khách hàng', icon: 'feedback' },
  { href: '/admin/co-so', label: 'Cơ sở y tế', doc: 'A02', group: 'Dữ liệu', icon: 'facility' },
  { href: '/admin/danh-muc', label: 'Danh mục khám', doc: 'A03', group: 'Dữ liệu', icon: 'catalog' },
  { href: '/admin/noi-dung', label: 'Nội dung', doc: 'A04', group: 'Dữ liệu', icon: 'content' },
  { href: '/admin/thong-bao', label: 'Thông báo & email', doc: 'A08', group: 'Dữ liệu', icon: 'notification' },
  { href: '/admin/bao-cao', label: 'Báo cáo & giám sát', doc: 'A10', group: 'Hệ thống', icon: 'report' },
  { href: '/admin/nguoi-dung', label: 'Người dùng admin', doc: 'A01', group: 'Hệ thống', icon: 'users' },
  { href: '/admin/cau-hinh', label: 'Cấu hình', doc: 'A11', group: 'Hệ thống', icon: 'settings' },
];

export const FOOTER_COLUMNS: { title: string; links: NavItem[] }[] = [
  {
    title: 'Dịch vụ',
    links: [
      { href: '/co-so-y-te', label: 'Đặt khám tại cơ sở' },
      { href: '/chuyen-khoa', label: 'Đặt khám theo chuyên khoa' },
      { href: '/bac-si', label: 'Đặt khám theo bác sĩ' },
      { href: '/tai-khoan/co-so', label: 'Tra cứu hồ sơ khám' },
    ],
  },
  {
    title: 'Hướng dẫn & hỗ trợ',
    links: [
      { href: '/huong-dan', label: 'Hướng dẫn đặt khám' },
      { href: '/huong-dan/quy-trinh-di-kham', label: 'Quy trình đi khám' },
      { href: '/huong-dan/huy-phieu', label: 'Hủy phiếu' },
      { href: '/huong-dan/hoan-phi', label: 'Hoàn phí' },
      { href: '/huong-dan/cau-hoi-thuong-gap', label: 'Câu hỏi thường gặp' },
    ],
  },
  {
    title: 'Về MQ',
    links: [
      { href: '/hop-tac', label: 'Liên hệ hợp tác' },
      { href: '/chinh-sach/dieu-khoan-su-dung', label: 'Điều khoản sử dụng' },
      { href: '/chinh-sach/chinh-sach-bao-mat', label: 'Chính sách bảo mật' },
      { href: '/chinh-sach/quy-dinh-huy-hoan-tien', label: 'Quy định hủy, hoàn tiền' },
    ],
  },
];
