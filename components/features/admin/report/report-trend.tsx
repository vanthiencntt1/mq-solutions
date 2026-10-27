type BookingRow = { period: string; facilityId: string; facilityName: string; bookings: number };

const COLORS = [
  'var(--color-signal-blue)',
  'var(--color-ink-navy)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-slate-gray)',
  'var(--color-info)',
];

export function ReportTrend({ rows }: { rows: BookingRow[] }) {
  const periods = [...new Set(rows.map((row) => row.period))].sort().slice(-30);
  const facilities = [...new Map(rows.map((row) => [row.facilityId, row.facilityName])).entries()];
  const shown = facilities.slice(0, 5);
  const series = [
    ...shown.map(([id, name]) => ({ id, name })),
    ...(facilities.length > 5 ? [{ id: 'other', name: 'Cơ sở khác' }] : []),
  ];
  const points = periods.map((period) => {
    const periodRows = rows.filter((row) => row.period === period);
    return series.map((item) =>
      periodRows
        .filter((row) =>
          item.id === 'other' ? !shown.some(([id]) => id === row.facilityId) : row.facilityId === item.id,
        )
        .reduce((sum, row) => sum + row.bookings, 0),
    );
  });
  const max = Math.max(1, ...points.map((values) => values.reduce((sum, value) => sum + value, 0)));

  if (periods.length === 0)
    return (
      <p className="text-slate-gray py-10 text-center text-sm">Chưa có lịch đặt trong khoảng đã chọn.</p>
    );

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 720 230"
          className="h-56 w-full min-w-[620px]"
          role="img"
          aria-label="Biểu đồ số lịch đặt theo kỳ, tách theo cơ sở"
        >
          <title>Xu hướng lượt đặt theo cơ sở, 30 kỳ gần nhất</title>
          {[0, 0.5, 1].map((part) => (
            <g key={part}>
              <line
                x1="42"
                x2="710"
                y1={195 - part * 165}
                y2={195 - part * 165}
                stroke="var(--color-hairline)"
              />
              <text x="4" y={199 - part * 165} fill="var(--color-slate-gray)" fontSize="11">
                {Math.round(max * part)}
              </text>
            </g>
          ))}
          {points.map((values, index) => {
            const x = 48 + index * (652 / periods.length);
            let height = 0;
            return (
              <g key={periods[index]}>
                {values.map((value, position) => {
                  const segment = (value / max) * 165;
                  const y = 195 - height - segment;
                  height += segment;
                  return (
                    <rect
                      key={series[position]?.id ?? position}
                      x={x}
                      y={y}
                      width={Math.max(5, 652 / periods.length - 4)}
                      height={segment}
                      fill={COLORS[position]}
                    >
                      <title>{`${periods[index]} · ${series[position]?.name ?? ''}: ${value} lịch`}</title>
                    </rect>
                  );
                })}
                {(index === 0 ||
                  index === periods.length - 1 ||
                  index % Math.max(1, Math.ceil(periods.length / 6)) === 0) && (
                  <text x={x} y="216" fill="var(--color-slate-gray)" fontSize="10">
                    {periods[index]?.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="text-slate-gray mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-label="Chú giải cơ sở">
        {series.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: COLORS[index] }} />
            {item.name}
          </li>
        ))}
      </ul>
      {periods.length === 30 && (
        <p className="text-caption text-slate-gray mt-2">
          Biểu đồ hiển thị 30 kỳ gần nhất; CSV có toàn bộ khoảng đã chọn.
        </p>
      )}
    </div>
  );
}
