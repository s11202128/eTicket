import type { SalesPoint } from "@/features/manager/model/salesSeries";

const dayLabel = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

// Simple bar chart of tickets booked per day (no chart library needed).
export function SalesChart({ points }: { points: SalesPoint[] }) {
  const max = Math.max(...points.map((point) => point.count), 1);
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const labelEvery = Math.ceil(points.length / 7);

  return (
    <figure className="grid gap-3">
      <div
        role="img"
        aria-label={`${total} tickets booked over the last ${points.length} days`}
        className="flex h-40 items-end gap-[2px] border-b border-border"
      >
        {points.map((point) => (
          <div key={point.date} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-sm bg-accent/80 transition-colors group-hover:bg-accent"
              style={{ height: `${(point.count / max) * 100}%`, minHeight: point.count ? 2 : 0 }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-fg px-2 py-1 text-xs text-surface group-hover:block">
              {dayLabel(point.date)}: {point.count}
            </span>
          </div>
        ))}
      </div>
      <div aria-hidden className="flex gap-[2px] text-[10px] text-muted">
        {points.map((point, index) => (
          <span key={point.date} className="flex-1 truncate text-center">
            {index % labelEvery === 0 ? dayLabel(point.date) : ""}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        <table>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <td>{dayLabel(point.date)}</td>
                <td>{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
