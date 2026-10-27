# MQ Solutions – web tổng đặt khám đa cơ sở

Next.js 15 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 + Prisma 6 · Redis 7 + BullMQ · ApiDatKham (mỗi cơ sở một server).

Tài liệu nghiệp vụ và thiết kế: `../MQSolutions_Docs` – đọc trước:

| File                      | Nội dung                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- |
| `00-TONG-QUAN-WEBSITE.md` | Website công khai + admin, sơ đồ trang, danh sách tính năng W / A                |
| `00-CONG-NGHE-QUY-UOC.md` | Kiến trúc, quy ước code / API / dữ liệu / HIS / bảo mật / **giao diện (mục 10)** |
| `00-DATABASE.md`          | 30 bảng, ERD, từ điển dữ liệu                                                    |
| `00-TONG-QUAN-CORE.md`    | Tài khoản CCCD, tra hồ sơ theo cơ sở, đặt khám 6 nhánh, thanh toán               |

## Chạy lần đầu (máy dev)

Yêu cầu: Node 22, pnpm 10 (`corepack enable`), Docker Desktop.

```bash
cp .env.example .env && node scripts/gen-secrets.mjs   # tạo .env + sinh 4 khóa bí mật ngẫu nhiên
docker compose -f docker/docker-compose.dev.yml up -d  # Postgres, Redis, Mailpit
pnpm install
pnpm db:setup                                          # lần đầu: tạo migration init (30 bảng) + chỉ mục bổ sung + seed
pnpm mock:his                                          # (cửa sổ khác) mock ApiDatKham cổng 4010
pnpm worker:dev                                        # (cửa sổ khác) job nền
pnpm dev                                               # http://localhost:3000
```

- Mail gửi ra xem tại http://localhost:8025 (Mailpit).
- Ảnh / tệp tải lên lưu trong thư mục `storage/` của dự án (`public/` xem tại `/uploads/...`, `private/` không công khai).
- Seed in ra tài khoản SUPER_ADMIN và mã TOTP ở lần chạy đầu.

## Lệnh thường dùng

| Lệnh                                                        | Việc                                                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                | lint + typecheck + unit test (chạy trước khi tạo PR)                                                |
| `pnpm db:migrate --name <ten>`                              | Tạo migration mới sau khi sửa `prisma/schema.prisma`                                                |
| `pnpm build && pnpm start`                                  | Chạy bản production local                                                                           |
| `docker compose -f docker/docker-compose.yml up -d --build` | Chạy đủ bộ production (nginx, web ×2, worker, migrate, postgres, redis; tệp lưu ở volume `uploads`) |

## Email (Gmail SMTP)

Điền `SMTP_*` trong `.env` (Gmail: `smtp.gmail.com`, cổng `587`, `SMTP_SECURE=false`, `SMTP_PASSWORD` là **mật khẩu ứng dụng** 16 ký tự, `SMTP_FROM` là chính địa chỉ Gmail đó). Thử: `pnpm mail:test email-cua-ban@gmail.com`.

## Sao lưu và chuyển sang server khác

Dữ liệu cần giữ gồm 3 thứ: **database PostgreSQL**, **thư mục `storage/`** (ảnh, tệp) và **4 khóa trong `.env`**. Redis không cần sao lưu (chỉ là cache, giữ chỗ, hàng đợi).

| Việc | Lệnh |
| --- | --- |
| Sao lưu (máy dev, Postgres trong Docker) | `pnpm db:backup` → `backups/<ngày-giờ>/` gồm `db.dump`, `storage.tar.gz`, `manifest.json` |
| Sao lưu trên server production | `pnpm db:backup --compose docker/docker-compose.yml --keep 30` (đặt lịch chạy hằng đêm) |
| Kèm luôn `.env` | thêm `--with-env` (tệp chứa khóa bí mật – cất nơi an toàn) |
| Khôi phục | `pnpm db:restore backups/<ngày-giờ> --yes` (thêm `--compose …` hoặc `--direct` như trên) |

**Chuyển sang server mới:**

1. Server cũ: `pnpm db:backup --with-env` → chép thư mục `backups/<ngày-giờ>` sang server mới (USB, ổ mạng, `scp`…).
2. Server mới: cài Docker, chép mã nguồn, **dùng lại `.env` cũ** (ít nhất `PII_SECRET`, `PII_HMAC_SECRET`, `JWT_SECRET`), sửa `APP_URL`, `DATABASE_URL` nếu khác.
3. Bật Postgres + Redis, chạy `pnpm db:deploy` (tạo bảng), rồi `pnpm db:restore backups/<ngày-giờ> --yes`.
4. Khởi động web + worker. Script tự chặn nếu khóa trong `.env` khác máy cũ (sai khóa thì không đọc được CCCD đã lưu).

Thêm **cơ sở y tế mới** thì **không cần chuyển dữ liệu**: web tổng dùng chung một database; chỉ cần cài ApiDatKham tại cơ sở đó rồi vào Admin → Cơ sở y tế → Thêm cơ sở, nhập URL API, tên biến khóa, tài khoản ngân hàng.

## Cấu trúc

```
app/                 Trình bày (App Router) – chỉ gọi lib/services
  (public)/          Trang công khai: trang chủ, cơ sở, chuyên khoa, bác sĩ, tin tức, hướng dẫn…   W01–W07
  (auth)/            Đăng nhập, đăng ký, quên mật khẩu                                            C01
  (account)/         Khu tài khoản /tai-khoan                                                      W08, C03, C04, C08
  dat-kham/          Luồng đặt khám 4 chặng                                                        C05–C07
  admin/             Quản trị: (panel)/… và dang-nhap                                              A01–A11
  api/               Route Handlers (/api/health …)
components/ui        Button, Card, Badge, Input – đã gắn token giao diện
components/layout    Header, footer, thanh mobile, sidebar admin
lib/domain           Quy tắc nghiệp vụ thuần TS: lỗi, 6 nhánh đặt khám, trạng thái phiếu, CCCD, interface
lib/services         Điều phối nghiệp vụ (facility, health … bổ sung theo từng tính năng)
lib/infra            Prisma, Redis + cache key, HisClient (3DES, cầu dao), lưu tệp trên ổ đĩa, mã hóa PII, JWT bệnh nhân, logger
lib/config           Env (Zod, thiếu là dừng), menu
lib/http             Định dạng phản hồi API, bắt lỗi, kiểm Origin
worker/              BullMQ: kiểm tra kết nối, gửi lại HIS, cập nhật trạng thái, đối soát, email
prisma/              schema.prisma (30 bảng), seed.ts, sql/extras.sql; migrations/ sinh bằng pnpm db:setup lần đầu
tests/               unit/, mocks/his (mock ApiDatKham)
docker/              Dockerfile, compose dev / production, nginx.conf
```

Quy tắc phân lớp được ESLint (`eslint-plugin-boundaries`) kiểm tự động: `components` không được import `lib/infra`, `lib/domain` không import gì ngoài domain…

## Trạng thái khung (v0.1)

Đã có: cấu trúc thư mục, token giao diện, layout public / tài khoản / đặt khám / admin, 39 trang giữ chỗ gắn mã tài liệu, middleware chặn khu tài khoản và admin, HisClient + mock ApiDatKham, env Zod, Prisma 30 bảng + seed, worker khung, Docker, CI, 23 unit test. `lint`, `typecheck`, `test`, `build` đều đã chạy qua.

Ghi chú: thư mục `prisma/migrations` chưa có sẵn – chạy `pnpm db:setup` lần đầu trên máy có Docker để Prisma sinh migration `init` rồi commit thư mục đó.

Đã làm thêm: **C01** tài khoản (đăng ký / đăng nhập / đổi mật khẩu), **C03** định danh theo cơ sở (`/tai-khoan/co-so`, `POST /api/facilities/[code]/identify[/by-mabn]`, `GET /api/me/facilities`; kết quả chỉ ở Redis 30 phút, MaBN không trả về trình duyệt).

Tiếp theo: C04 (tra hồ sơ bệnh án) → C05/C06 (chọn lịch, đặt khám 6 nhánh) → C07/C08 (thanh toán, phiếu khám) → admin A02, A06 (theo `00-TONG-QUAN-WEBSITE.md` mục 9).
