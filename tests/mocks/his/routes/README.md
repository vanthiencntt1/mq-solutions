Mỗi tính năng thêm endpoint mock trong một file riêng ở thư mục này (ví dụ `c06-booking.ts`), export `routes: Record<string, (body) => unknown>`.
Server tự nạp mọi file `*.ts` ở đây khi khởi động – không cần sửa server.ts (tránh xung đột khi nhiều người làm song song).
