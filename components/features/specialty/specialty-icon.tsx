import Image from 'next/image';
import React from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

function normalize(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Quy tắc cụ thể đứng trước quy tắc chung để tên khoa ghép chọn đúng ảnh. */
const illustrationRules: ReadonlyArray<readonly [RegExp, string]> = [
  [/\by hoc co truyen\b/, 'ck-y-hoc-co-truyen.webp'],
  [/\bngoai tieu hoa\b/, 'ck-ngoai-tieu-hoa.webp'],
  [/\bnoi tong quat nhiem\b|\btruyen nhiem\b|\bnhiet doi\b/, 'ck-truyen-nhiem.webp'],
  [/\bthan kinh\b/, 'ck-than-kinh.webp'],
  [/\btam the\b|\btam than\b|\btam ly\b/, 'ck-tam-than.webp'],
  [/\bnoi than\b|\bloc mau\b|\bthan nhan tao\b/, 'ck-than-loc-mau.webp'],
  [/\bngoai tiet nieu\b|\btiet nieu\b|\bnam khoa\b|\bthan\b/, 'ck-than-tiet-nieu.webp'],
  [/\btim mach\b|\blong nguc\b|\bmach mau\b/, 'ck-tim-mach.webp'],
  [/\btieu hoa\b|\bgan mat\b/, 'ck-tieu-hoa.webp'],
  [/\bngoai tong hop\b|\bngoai tong quat\b|\bphau thuat\b/, 'ck-ngoai-tong-hop.webp'],
  [/\bchan thuong chinh hinh\b|\bxuong khop\b/, 'ck-chan-thuong-chinh-hinh.webp'],
  [/\bung buou\b|\bhoa tri\b/, 'ck-ung-buou.webp'],
  [/\bphuc hoi chuc nang\b|\bvat ly tri lieu\b/, 'ck-phuc-hoi-chuc-nang.webp'],
  [/\bnoi tiet\b|\bdai thao duong\b/, 'ck-noi-tiet.webp'],
  [/\bdinh duong\b|\btiet che\b/, 'ck-dinh-duong.webp'],
  [/\bhoi suc tich cuc\b|\bcap cuu\b|\bchong doc\b/, 'ck-cap-cuu.webp'],
  [/\bhuyet hoc\b|\btruyen mau\b|\bxet nghiem\b/, 'ck-xet-nghiem.webp'],
  [/\bchan doan hinh anh\b|\bx quang\b|\bct\b|\bmri\b|\bsieu am\b/, 'ck-chan-doan-hinh-anh.webp'],
  [/\bgiai phau benh\b/, 'ck-giai-phau-benh.webp'],
  [/\btiem chung\b|\bvac xin\b/, 'ck-tiem-chung.webp'],
  [/\bduoc\b/, 'ck-duoc.webp'],
  [/\bkham benh\b|\bphong kham da khoa\b/, 'ck-kham-benh.webp'],
  [
    /\bnoi tong hop\b|\bnoi tong quat\b|\bkham tong quat\b|\bkham suc khoe\b|\bbac si gia dinh\b/,
    'ck-kham-tong-quat.webp',
  ],
  [/\bmat\b|\bnhan khoa\b/, 'ck-mat.webp'],
  [/\btai mui hong\b|\btmh\b/, 'ck-tai-mui-hong.webp'],
  [/\bda lieu\b/, 'ck-da-lieu.webp'],
  [/\bsan\b|\bphu khoa\b/, 'ck-san-phu-khoa.webp'],
];

/** Ảnh chuyên khoa có sẵn; các tên chưa khớp tiếp tục dùng Lucide. */
export function specialtyIllustration(name: string): string | null {
  const value = normalize(name);
  if (/\bham mat\b|\bnha khoa\b/.test(value)) return null;

  for (const [pattern, file] of illustrationRules) {
    if (pattern.test(value)) return `/images/minh-hoa/${file}`;
  }
  return null;
}

/** Chọn biểu tượng lucide theo tên chuyên khoa tiếng Việt, không phụ thuộc mã HIS. */
export function specialtyIcon(name: string): LucideIcon {
  const value = normalize(name);
  if (/\bnhi\b|tre em/.test(value)) return Baby;
  if (/tim|mach/.test(value)) return HeartPulse;
  if (/rang ham mat|nha khoa/.test(value)) return Smile;
  if (/\bmat\b|nhan khoa/.test(value)) return Eye;
  if (/tai mui hong|\btmh\b/.test(value)) return Ear;
  if (/than kinh|tam than/.test(value)) return Brain;
  if (/da lieu/.test(value)) return Sparkles;
  if (/san|phu khoa/.test(value)) return Venus;
  if (/huyet hoc/.test(value)) return Droplet;
  if (/xet nghiem/.test(value)) return FlaskConical;
  if (/chan doan hinh anh|sieu am|x quang|ct scan|mri/.test(value)) return Scan;
  if (/phuc hoi chuc nang|vat ly tri lieu/.test(value)) return Accessibility;
  if (/chan thuong chinh hinh|xuong|co xuong khop/.test(value)) return Bone;
  if (/ho hap|phoi/.test(value)) return Wind;
  if (/tieu hoa|da day/.test(value)) return Pill;
  if (/than|tiet nieu/.test(value)) return Droplets;
  if (/noi tiet/.test(value)) return Activity;
  if (/ung buou|ung thu/.test(value)) return Ribbon;
  if (/ngoai khoa|\bngoai\b|phau thuat/.test(value)) return Scissors;
  return Stethoscope;
}

/** Icon chuyên khoa theo cùng quy ước nét và màu của hệ giao diện. */
export function SpecialtyIcon({
  name,
  size = 'md',
  className,
  ...props
}: Omit<ComponentProps<'svg'>, 'ref'> & { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const imageSizes = { sm: 'size-8', md: 'size-12', lg: 'size-16' };
  const iconSizes = { sm: 'size-5', md: 'size-6', lg: 'size-8' };
  const illustration = specialtyIllustration(name);
  if (illustration) {
    return (
      <Image
        src={illustration}
        alt=""
        width={240}
        height={240}
        loading="lazy"
        className={cn('bg-pebble shrink-0 rounded-2xl object-contain', imageSizes[size], className)}
      />
    );
  }
  const Icon = specialtyIcon(name);
  return (
    <Icon
      strokeWidth={1.75}
      aria-hidden="true"
      className={cn('text-primary shrink-0', iconSizes[size], className)}
      {...props}
    />
  );
}
