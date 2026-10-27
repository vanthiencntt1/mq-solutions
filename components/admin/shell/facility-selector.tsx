'use client';

import { Building2, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/input';

export interface ShellFacility { id: string; name: string }

export function FacilitySelector({ facilities, central, selected, onChange }: {
  facilities: ShellFacility[];
  central: boolean;
  selected: string;
  onChange: (id: string) => void;
}) {
  if (!central) return <span className="text-slate-gray flex max-w-20 items-center gap-1 text-xs sm:max-w-40" title={facilities[0]?.name ?? 'Cơ sở'}>
    <Building2 size={16} className="shrink-0" aria-hidden /><span className="truncate">{facilities[0]?.name ?? 'Cơ sở'}</span>
  </span>;
  return <div className="relative flex items-center">
    <Building2 size={16} className="text-slate-gray pointer-events-none absolute left-2 hidden sm:block" aria-hidden />
    <Label htmlFor="admin-facility" className="sr-only">Cơ sở hiện tại</Label>
    <select id="admin-facility" value={selected} onChange={(event) => onChange(event.target.value)}
      className="border-border bg-card text-ink-navy h-10 w-20 appearance-none truncate rounded-md border pr-5 pl-2 text-[11px] font-medium sm:w-40 sm:pr-8 sm:pl-8 lg:w-52">
      <option value="">Tất cả cơ sở</option>
      {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
    </select>
    <ChevronDown size={12} className="text-slate-gray pointer-events-none absolute right-1 sm:right-2" aria-hidden />
  </div>;
}
