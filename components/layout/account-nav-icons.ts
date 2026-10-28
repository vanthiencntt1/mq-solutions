import {
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  '/tai-khoan': LayoutDashboard,
  '/tai-khoan/phieu-kham': ClipboardList,
  '/tai-khoan/co-so': Building2,
  '/tai-khoan/thong-bao': Bell,
  '/tai-khoan/gop-y': MessageSquare,
  '/tai-khoan/thong-tin': UserRound,
  '/tai-khoan/doi-mat-khau': LockKeyhole,
};
