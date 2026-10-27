# Primitive giao diện công khai

Các component dùng token trong `app/globals.css`, không ghi màu trực tiếp. Component trong `components/` chỉ nhận props; dữ liệu lấy ở `app/` hoặc qua API.

| Component       | Cách dùng                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Button`        | `<Button size="lg">Đặt khám</Button>`; `lg` là 18px/600, cao 48px.                                               |
| `Card`          | `<Card>…</Card>` bo 16px; `<Card variant="panel">…</Card>` bo 24px.                                              |
| `Badge`         | `<Badge tone="info">…</Badge>`; hỗ trợ `success`, `warning`, `danger`, `neutral`.                                |
| `DecorBlob`     | `<DecorBlob tone="magenta" className="-top-6 -right-5" />`; dùng sau mockup, chỉ trang trí.                      |
| `ProductFrame`  | `<ProductFrame caption="Minh họa">…giao diện JSX…</ProductFrame>`; `blobs={false}` để tắt vệt màu.               |
| `IconTile`      | `<IconTile size="md"><CalendarDays aria-hidden /></IconTile>`; `sm`, `md`, `lg`.                                 |
| `SectionHeader` | `<SectionHeader title="…" description="…" action={<Link href="…">Xem tất cả</Link>} />`; `align="left"` nếu cần. |
| `Stat`          | `<Stat value={count} label="Cơ sở y tế" />`; truyền số liệu thật từ trang.                                       |
| `EmptyState`    | `<EmptyState title="Không tìm thấy kết quả" description="Thử từ khóa khác." action={<Button>…</Button>} />`.     |

Chuyên khoa: `specialtyIcon(name)` trả về `LucideIcon`; `<SpecialtyIcon name={name} className="size-6 text-primary" />` ở `components/features/specialty/specialty-icon.tsx`.

Giữ nhãn và nội dung tiếng Việt rõ nghĩa. Mockup giao diện ví dụ cần `caption="Minh họa"`. Chỉ hiện mục số liệu hoặc nội dung khi có dữ liệu thật.
