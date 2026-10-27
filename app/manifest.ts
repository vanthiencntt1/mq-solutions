import type { MetadataRoute } from 'next';

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
    background_color: '#f8f9fb',
    theme_color: '#006bff',
  };
}
