import type { MetadataRoute } from 'next';
import { DEFAULT_BACKGROUND_COLOR, DEFAULT_PRIMARY_COLOR } from '@/lib/config/brand-colors';

// W09: manifest nhận diện web khi người dùng lưu lối tắt trên thiết bị.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MQ Solutions – Đặt khám',
    short_name: 'MQ Solutions',
    description: 'Đặt lịch khám tại nhiều cơ sở y tế',
    lang: 'vi',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: DEFAULT_BACKGROUND_COLOR,
    theme_color: DEFAULT_PRIMARY_COLOR,
  };
}
