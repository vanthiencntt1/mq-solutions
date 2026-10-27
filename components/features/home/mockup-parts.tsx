export function QrGlyph({ className = 'size-16' }: { className?: string }) {
  const rows = ['1110111', '1010100', '1110101', '0001010', '1011101', '0100011', '1110110'];
  return (
    <svg
      viewBox="0 0 7 7"
      className={`text-ink-navy shrink-0 ${className}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === '1' ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  );
}
