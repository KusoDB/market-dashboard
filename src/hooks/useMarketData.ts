import { useCallback, useEffect, useState } from 'react';
import type {
  FearGreedData,
  IndexId,
  MetaData,
  MetricView,
  NaaimData,
  QuoteData,
} from '../types';
import { computeStatus } from '../lib/thresholds';

const SENTIMENT_IDS = ['vix', 'fear-greed', 'naaim'] as const;
const INDEX_IDS: IndexId[] = ['qqq', 'soxx', 'xlk', 'tqqq', 'soxl', 'tecl'];

interface RawData {
  quotes?: Record<string, QuoteData>;
  fearGreed?: FearGreedData | null;
  naaim?: NaaimData | null;
  meta?: MetaData | null;
  errors: Record<string, string>;
}

const empty: RawData = { errors: {} };

async function fetchJson<T>(name: string): Promise<T> {
  const url = `${import.meta.env.BASE_URL}data/${name}?cb=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function useMarketData() {
  const [raw, setRaw] = useState<RawData>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const errors: Record<string, string> = {};
    const next: RawData = { errors };

    const tasks: Array<Promise<void>> = [
      fetchJson<Record<string, QuoteData>>('quotes.json')
        .then((v) => {
          next.quotes = v;
        })
        .catch((e) => {
          errors.quotes = String(e?.message ?? e);
        }),
      fetchJson<FearGreedData>('fear-greed.json')
        .then((v) => {
          next.fearGreed = v;
        })
        .catch((e) => {
          errors['fear-greed'] = String(e?.message ?? e);
        }),
      fetchJson<NaaimData>('naaim.json')
        .then((v) => {
          next.naaim = v;
        })
        .catch((e) => {
          errors.naaim = String(e?.message ?? e);
        }),
      fetchJson<MetaData>('meta.json')
        .then((v) => {
          next.meta = v;
        })
        .catch(() => {
          /* meta は失敗しても無視 */
        }),
    ];

    await Promise.allSettled(tasks);
    setRaw(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 表示用モデル化
  const sentiment: MetricView[] = SENTIMENT_IDS.map((id) =>
    buildSentimentView(id, raw),
  );
  const indices: MetricView[] = INDEX_IDS.map((id) => buildIndexView(id, raw));

  return {
    sentiment,
    indices,
    loading,
    refresh,
    updatedAt: raw.meta?.updatedAt,
  };
}

function buildSentimentView(
  id: 'vix' | 'fear-greed' | 'naaim',
  raw: RawData,
): MetricView {
  if (id === 'vix') {
    const q = raw.quotes?.vix;
    if (!q || q.error) return errorView(id, 'VIX', raw.errors.quotes ?? q?.error);
    return {
      id,
      label: 'VIX',
      freq: 'daily',
      current: q.current,
      daily: q.daily,
      weekly: q.weekly,
      range1m: q.range1m,
      range3m: q.range3m,
      range52w: q.range52w,
      status: computeStatus('vix', q.current),
      asOf: q.asOf,
      unit: 'point',
    };
  }
  if (id === 'fear-greed') {
    const fg = raw.fearGreed;
    if (!fg) return errorView(id, 'Fear & Greed', raw.errors['fear-greed']);
    return {
      id,
      label: 'Fear & Greed',
      freq: 'daily',
      current: fg.current,
      daily: {
        pctChange: ((fg.current - fg.previousClose) / fg.previousClose) * 100,
        pointChange: fg.current - fg.previousClose,
      },
      weekly: {
        pctChange: ((fg.current - fg.prevWeek) / fg.prevWeek) * 100,
        pointChange: fg.current - fg.prevWeek,
      },
      range1m: fg.range1m,
      range3m: fg.range3m,
      range52w: fg.range52w ?? undefined,
      status: computeStatus('fear-greed', fg.current),
      rating: fg.rating,
      asOf: fg.asOf,
      unit: 'point',
    };
  }
  // NAAIM
  const n = raw.naaim;
  if (!n) return errorView('naaim', 'NAAIM', raw.errors.naaim);
  return {
    id: 'naaim',
    label: 'NAAIM',
    freq: 'weekly',
    current: n.current,
    daily: null, // NAAIM は週次のみ
    weekly: n.weekly,
    range1m: n.range1m,
    range3m: n.range3m,
    range52w: n.range52w ?? undefined,
    status: computeStatus('naaim', n.current),
    asOf: n.asOf,
    unit: 'point',
  };
}

function buildIndexView(id: IndexId, raw: RawData): MetricView {
  const q = raw.quotes?.[id];
  const label = id.toUpperCase();
  if (!q || q.error) return errorView(id, label, raw.errors.quotes ?? q?.error);
  return {
    id,
    label,
    freq: 'daily',
    current: q.current,
    daily: q.daily,
    weekly: q.weekly,
    range1m: q.range1m,
    range3m: q.range3m,
    range52w: q.range52w,
    status: computeStatus(id, q.current, q.range52w),
    asOf: q.asOf,
    unit: 'pct',
  };
}

function errorView(id: MetricView['id'], label: string, msg?: string): MetricView {
  return {
    id,
    label,
    freq: id === 'naaim' ? 'weekly' : 'daily',
    current: NaN,
    daily: null,
    weekly: null,
    status: 'neutral',
    asOf: '',
    error: msg ?? 'unknown error',
    unit: 'pct',
  };
}
