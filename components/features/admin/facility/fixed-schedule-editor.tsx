'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FixedSchedule } from '@/lib/domain/booking/schedule';

const WEEKDAYS = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
];

function roomDoctorsText(map: Record<string, string>) {
  return Object.entries(map)
    .map(([room, doctor]) => `${room}=${doctor}`)
    .join(', ');
}

function parseRoomDoctors(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of text.split(/[,\n;]/)) {
    const [room, doctor] = part.split('=').map((s) => s.trim());
    if (room && doctor) result[room] = doctor;
  }
  return result;
}

// A02 tab Đặt khám: khung giờ cố định khi HIS chưa khai lịch DMBSKHAMBENH.
export function FixedScheduleEditor({
  value,
  editable,
  onChange,
}: {
  value: FixedSchedule;
  editable: boolean;
  onChange: (next: FixedSchedule) => void;
}) {
  const [roomText, setRoomText] = useState(() => roomDoctorsText(value.roomDoctors));
  const update = (patch: Partial<FixedSchedule>) => onChange({ ...value, ...patch });
  const updateSlot = (index: number, patch: Partial<FixedSchedule['slots'][number]>) =>
    update({ slots: value.slots.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  return (
    <div className="border-border space-y-4 rounded-md border p-4 sm:col-span-2">
      <p className="text-muted-foreground text-sm">
        Web tự hiện các ngày và khung giờ bên dưới (14 ngày tới). Khi khách đặt, web hỏi HIS các số đã dùng của
        phòng trong ngày rồi gửi <strong>STT nhỏ nhất còn trống</strong>. Chỉ hỗ trợ chọn theo chuyên khoa / phòng
        khám.
      </p>

      <div>
        <p className="mb-2 text-sm font-medium">Ngày cho đặt (chỉ Thứ 2 – Thứ 6)</p>
        <div className="flex flex-wrap gap-4">
          {WEEKDAYS.map((d) => (
            <label key={d.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.weekdays.includes(d.value)}
                disabled={!editable}
                onChange={(e) =>
                  update({
                    weekdays: e.target.checked
                      ? [...value.weekdays, d.value]
                      : value.weekdays.filter((w) => w !== d.value),
                  })
                }
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Khung giờ và dải số thứ tự</p>
        {value.slots.map((slot, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <FormField id={`fs-start-${i}`} label="Từ giờ">
              <Input
                id={`fs-start-${i}`}
                type="time"
                value={slot.start}
                disabled={!editable}
                onChange={(e) => updateSlot(i, { start: e.target.value })}
              />
            </FormField>
            <FormField id={`fs-end-${i}`} label="Đến giờ">
              <Input
                id={`fs-end-${i}`}
                type="time"
                value={slot.end}
                disabled={!editable}
                onChange={(e) => updateSlot(i, { end: e.target.value })}
              />
            </FormField>
            <FormField id={`fs-from-${i}`} label="Số từ">
              <Input
                id={`fs-from-${i}`}
                type="number"
                min={1}
                value={slot.fromNumber}
                disabled={!editable}
                onChange={(e) => updateSlot(i, { fromNumber: Number(e.target.value) })}
              />
            </FormField>
            <FormField id={`fs-to-${i}`} label="Đến số">
              <Input
                id={`fs-to-${i}`}
                type="number"
                min={1}
                value={slot.toNumber}
                disabled={!editable}
                onChange={(e) => updateSlot(i, { toNumber: Number(e.target.value) })}
              />
            </FormField>
            <Button
              type="button"
              variant="outline"
              aria-label="Xóa khung giờ"
              disabled={!editable || value.slots.length === 1}
              onClick={() => update({ slots: value.slots.filter((_, j) => j !== i) })}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={!editable || value.slots.length >= 12}
          onClick={() => {
            const last = value.slots.at(-1);
            const from = (last?.toNumber ?? 0) + 1;
            update({ slots: [...value.slots, { start: '13:00', end: '16:00', fromNumber: from, toNumber: from + 99 }] });
          }}
        >
          <Plus className="size-4" /> Thêm khung giờ
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="fs-doctor" label="Mã bác sĩ mặc định (MaBS)" hint="HIS bắt buộc mã bác sĩ khi đặt, ví dụ 0001">
          <Input
            id="fs-doctor"
            value={value.doctorId}
            disabled={!editable}
            onChange={(e) => update({ doctorId: e.target.value.trim() })}
          />
        </FormField>
        <FormField id="fs-room-doctors" label="Bác sĩ riêng theo phòng (tùy chọn)" hint="Dạng mãphòng=mãBS, ví dụ 101=0001, 102=0005">
          <Input
            id="fs-room-doctors"
            value={roomText}
            disabled={!editable}
            onChange={(e) => {
              setRoomText(e.target.value);
              update({ roomDoctors: parseRoomDoctors(e.target.value) });
            }}
          />
        </FormField>
      </div>
    </div>
  );
}
