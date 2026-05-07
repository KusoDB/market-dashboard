import type { Lang, MetricView } from '../types';
import { formatChange, formatRange, formatValue } from '../lib/format';
import { localizeRating, t } from '../lib/i18n';
import { StatusBadge } from './StatusBadge';
import { RangeBar } from './RangeBar';

interface Props {
  view: MetricView;
  lang: Lang;
  loading: boolean;
}

export function MetricCard({ view, lang, loading }: Props) {
  const tr = t(lang);
  const daily = formatChange(view.daily, view.unit);
  const weekly = formatChange(view.weekly, view.unit);
  const freqLabel = view.freq === 'daily' ? tr.daily : tr.weekly;

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-opacity ${
        loading ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-mono text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
            {view.label}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {freqLabel}
          </span>
        </div>
        {view.error ? (
          <span className="rounded-full bg-rose-100 dark:bg-rose-900/40 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {tr.failed}
          </span>
        ) : (
          <StatusBadge status={view.status} lang={lang} />
        )}
      </div>

      {view.error ? (
        <p className="mt-4 break-all text-xs text-rose-600 dark:text-rose-400">
          {view.error}
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums">
              {formatValue(view.current, view)}
            </span>
            {view.rating && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {localizeRating(view.rating, lang)}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <ChangeLine label={tr.daily_short} change={daily} />
            <ChangeLine label={tr.weekly_short} change={weekly} />
          </div>

          {(view.range1m || view.range3m || view.range52w) && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {view.range1m && (
                <div>
                  <span className="text-slate-400">{tr.high1m}</span>{' '}
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {formatRange(view.range1m, view)}
                  </span>
                </div>
              )}
              {view.range3m && (
                <div>
                  <span className="text-slate-400">{tr.high3m}</span>{' '}
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {formatRange(view.range3m, view)}
                  </span>
                </div>
              )}
              {view.range52w && (
                <div className="col-span-2">
                  <span className="text-slate-400">{tr.high52w}</span>{' '}
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {formatRange(view.range52w, view)}
                  </span>
                </div>
              )}
            </div>
          )}

          {view.range52w && <RangeBar view={view} status={view.status} />}
        </>
      )}
    </div>
  );
}

function ChangeLine({
  label,
  change,
}: {
  label: string;
  change: { text: string; positive: boolean | null };
}) {
  const color =
    change.positive === true
      ? 'text-emerald-600 dark:text-emerald-400'
      : change.positive === false
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-500 dark:text-slate-400';
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-slate-400">{label}:</span>
      <span className={`font-mono font-medium ${color}`}>{change.text}</span>
    </span>
  );
}
