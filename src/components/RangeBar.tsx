import type { MetricView, Status } from '../types';
import { formatValue } from '../lib/format';
import { statusClasses } from '../lib/thresholds';

interface Props {
  view: MetricView;
  status: Status;
}

export function RangeBar({ view, status }: Props) {
  const r = view.range52w;
  if (!r) return null;
  const span = r.high - r.low;
  const pos = span > 0 ? Math.min(1, Math.max(0, (view.current - r.low) / span)) : 0.5;
  const dot = statusClasses(status).dot;

  return (
    <div className="mt-3">
      <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full ring-2 ring-white dark:ring-slate-900 ${dot}`}
          style={{ left: `${pos * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-mono">{formatValue(r.low, view)}</span>
        <span className="font-mono">{formatValue(r.high, view)}</span>
      </div>
    </div>
  );
}
