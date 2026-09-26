interface HeatmapProps {
  days: { date: string; count: number }[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Cell {
  date: string;
  count: number;
}

function level(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  const q = count / max;
  if (q < 0.25) return 1;
  if (q < 0.5) return 2;
  if (q < 0.75) return 3;
  return 4;
}

const HEAT_VARS = [
  "var(--color-heat-0)",
  "var(--color-heat-1)",
  "var(--color-heat-2)",
  "var(--color-heat-3)",
  "var(--color-heat-4)",
];

export default function Heatmap({ days }: HeatmapProps) {
  const byDate = new Map(days.map((d) => [d.date, d.count]));
  const max = Math.max(0, ...days.map((d) => d.count));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday

  // 53 columns x 7 rows
  const weeks: Cell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 53; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      week.push({ date: iso, count: byDate.get(iso) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month label on the first column where the month changes
  const labels: (string | null)[] = weeks.map((week, i) => {
    const month = new Date(week[0].date + "T00:00:00").getMonth();
    if (i === 0) return MONTHS[month];
    const prevMonth = new Date(weeks[i - 1][0].date + "T00:00:00").getMonth();
    return month !== prevMonth ? MONTHS[month] : null;
  });

  return (
    <section className="rounded-xl bg-surface-dark p-6" aria-label="Contribution activity">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-normal tracking-[-0.02em] text-on-dark">
          Contributions
        </h2>
        <p className="font-mono text-xs text-on-dark-soft">last 12 months</p>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div
          className="grid w-max"
          style={{ gridTemplateColumns: "repeat(53, 12px)", gap: "3px" }}
          role="img"
          aria-label={`Contribution heatmap, ${days.reduce((s, d) => s + d.count, 0)} contributions in the last year`}
        >
          {labels.map((label, i) => (
            <span key={i} className="h-4 font-mono text-[10px] text-on-dark-soft">
              {label ?? ""}
            </span>
          ))}
          {weeks.map((week, wi) =>
            week.map((cell, di) => (
              <span
                key={`${wi}-${di}`}
                title={`${cell.count} contribution${cell.count === 1 ? "" : "s"} on ${cell.date}`}
                className="h-3 w-3 rounded-[2px]"
                style={{ background: HEAT_VARS[level(cell.count, max)] }}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="font-mono text-[10px] text-on-dark-soft">Less</span>
        {HEAT_VARS.map((v, i) => (
          <span key={i} className="h-3 w-3 rounded-[2px]" style={{ background: v }} aria-hidden="true" />
        ))}
        <span className="font-mono text-[10px] text-on-dark-soft">More</span>
      </div>

      {/* Screen-reader fallback */}
      <table className="sr-only">
        <caption>Daily contribution counts for the last 12 months</caption>
        <tbody>
          {WEEKDAYS.map((wd, di) => (
            <tr key={wd}>
              <th scope="row">{wd}</th>
              {weeks.map((week, wi) => (
                <td key={wi}>{`${week[di].date}: ${week[di].count}`}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
