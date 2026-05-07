// 共有型定義

export type Lang = 'ja' | 'en';

export type Status =
  | 'safe'
  | 'neutral'
  | 'caution'
  | 'danger'
  | 'high-zone'
  | 'low-zone';

export type MetricId =
  | 'vix'
  | 'fear-greed'
  | 'naaim'
  | 'qqq'
  | 'soxx'
  | 'xlk'
  | 'tqqq'
  | 'soxl'
  | 'tecl';

export type IndexId = 'qqq' | 'soxx' | 'xlk' | 'tqqq' | 'soxl' | 'tecl';

export type Frequency = 'daily' | 'weekly';

export interface Change {
  pctChange: number;
  pointChange: number;
}

export interface Range {
  high: number;
  low: number;
}

// /api/quotes 相当 (公開JSONの shape)
export interface QuoteData {
  symbol: string;
  current: number;
  prevClose: number;
  daily: Change;
  weekly: Change | null;
  range1m: Range | null;
  range3m: Range | null;
  range52w: Range;
  asOf: string;
  error?: string;
}

export interface FearGreedData {
  current: number;
  rating: string;
  previousClose: number;
  prevWeek: number;
  prevMonth: number;
  prevYear: number;
  range1m: Range | null;
  range3m: Range | null;
  range52w: Range | null;
  asOf: string;
}

export interface NaaimData {
  current: number;
  prev: number;
  weekly: Change;
  range1m: Range | null;
  range3m: Range | null;
  range52w: Range | null;
  asOf: string;
  history: { date: string; value: number }[];
}

export interface MetaData {
  updatedAt: string;
  errors: { name: string; message: string }[];
}

// 統一された表示用モデル
export interface MetricView {
  id: MetricId;
  label: string;
  freq: Frequency;
  current: number;
  daily: Change | null;
  weekly: Change | null;
  range1m?: Range | null;
  range3m?: Range | null;
  range52w?: Range;
  status: Status;
  rating?: string;
  asOf: string;
  error?: string;
  unit: 'pct' | 'point' | 'index';
}
