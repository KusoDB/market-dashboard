import type { Lang, MetricView } from '../types';

export function formatValue(v: number, view: MetricView): string {
  switch (view.id) {
    case 'vix':
    case 'naaim':
      return v.toFixed(2);
    case 'fear-greed':
      return v.toFixed(1);
    case 'qqq':
    case 'soxx':
    case 'xlk':
    case 'tqqq':
    case 'soxl':
    case 'tecl':
      return v.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  }
}

export function formatChange(
  change: { pctChange: number; pointChange: number } | null | undefined,
  unit: MetricView['unit'],
): { text: string; positive: boolean | null } {
  if (!change) return { text: '—', positive: null };
  const useUnit = unit === 'pct' ? 'pct' : unit === 'point' ? 'point' : 'pct';
  const v = useUnit === 'pct' ? change.pctChange : change.pointChange;
  if (!Number.isFinite(v)) return { text: '—', positive: null };
  const sign = v > 0 ? '+' : '';
  const suffix = useUnit === 'pct' ? '%' : '';
  return {
    text: `${sign}${v.toFixed(2)}${suffix}`,
    positive: v > 0 ? true : v < 0 ? false : null,
  };
}

export function formatRange(
  r: { high: number; low: number } | null | undefined,
  view: MetricView,
): string {
  if (!r) return '—';
  return `${formatValue(r.high, view)} / ${formatValue(r.low, view)}`;
}

export function formatTimestamp(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
