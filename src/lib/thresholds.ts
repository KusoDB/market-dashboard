import type { MetricId, Range, Status } from '../types';

// 仕様書 §3 のステータス判定ロジック。閾値変更はここを編集する。
export function computeStatus(
  id: MetricId,
  value: number,
  range52w?: Range,
): Status {
  switch (id) {
    case 'vix':
      if (value < 20) return 'safe';
      if (value <= 30) return 'caution';
      return 'danger';

    case 'fear-greed':
      if (value < 25) return 'danger';
      if (value < 45) return 'caution';
      if (value <= 55) return 'neutral';
      if (value <= 75) return 'caution';
      return 'danger';

    case 'naaim':
      if (value < 30) return 'danger';
      if (value < 60) return 'caution';
      if (value <= 90) return 'neutral';
      if (value <= 100) return 'caution';
      return 'danger';

    case 'ndx':
    case 'sox':
    case 'xlk': {
      if (!range52w) return 'neutral';
      const span = range52w.high - range52w.low;
      if (span <= 0) return 'neutral';
      const pos = (value - range52w.low) / span;
      if (pos > 0.9) return 'high-zone';
      if (pos < 0.1) return 'low-zone';
      return 'neutral';
    }
  }
}

// ステータスの Tailwind クラス対応表
export function statusClasses(status: Status): { bg: string; fg: string; dot: string } {
  switch (status) {
    case 'safe':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/40', fg: 'text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500' };
    case 'neutral':
      return { bg: 'bg-slate-200 dark:bg-slate-700', fg: 'text-slate-700 dark:text-slate-200', dot: 'bg-slate-500' };
    case 'caution':
      return { bg: 'bg-amber-100 dark:bg-amber-900/40', fg: 'text-amber-800 dark:text-amber-200', dot: 'bg-amber-500' };
    case 'danger':
      return { bg: 'bg-rose-100 dark:bg-rose-900/40', fg: 'text-rose-800 dark:text-rose-200', dot: 'bg-rose-500' };
    case 'high-zone':
      return { bg: 'bg-orange-100 dark:bg-orange-900/40', fg: 'text-orange-800 dark:text-orange-200', dot: 'bg-orange-500' };
    case 'low-zone':
      return { bg: 'bg-sky-100 dark:bg-sky-900/40', fg: 'text-sky-800 dark:text-sky-200', dot: 'bg-sky-500' };
  }
}
