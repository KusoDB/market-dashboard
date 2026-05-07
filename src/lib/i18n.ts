import type { Lang, Status } from '../types';

export const dict = {
  ja: {
    title: 'マーケット ダッシュボード',
    sentiment: 'センチメント',
    indices: '指数 / セクター',
    refresh: '更新',
    refreshing: '更新中…',
    lastUpdated: '最終更新',
    failed: '取得失敗',
    daily: '日次',
    weekly: '週次',
    daily_short: '日',
    weekly_short: '週',
    high1m: '1ヶ月 高/安',
    high3m: '3ヶ月 高/安',
    high52w: '52週 高/安',
    range52w: '52週レンジ',
    status: {
      safe: '安全',
      neutral: '中立',
      caution: '警戒',
      danger: '危険',
      'high-zone': '高値圏',
      'low-zone': '安値圏',
    } satisfies Record<Status, string>,
    fgRatings: {
      'extreme fear': '極端な恐怖',
      fear: '恐怖',
      neutral: '中立',
      greed: '楽観',
      'extreme greed': '極端な楽観',
    } as Record<string, string>,
  },
  en: {
    title: 'Market Dashboard',
    sentiment: 'Sentiment',
    indices: 'Indices / Sector',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    lastUpdated: 'Last updated',
    failed: 'Fetch failed',
    daily: 'Daily',
    weekly: 'Weekly',
    daily_short: 'D',
    weekly_short: 'W',
    high1m: '1M H/L',
    high3m: '3M H/L',
    high52w: '52W H/L',
    range52w: '52W Range',
    status: {
      safe: 'Safe',
      neutral: 'Neutral',
      caution: 'Caution',
      danger: 'Danger',
      'high-zone': 'High Zone',
      'low-zone': 'Low Zone',
    } satisfies Record<Status, string>,
    fgRatings: {
      'extreme fear': 'Extreme Fear',
      fear: 'Fear',
      neutral: 'Neutral',
      greed: 'Greed',
      'extreme greed': 'Extreme Greed',
    } as Record<string, string>,
  },
} as const;

export function t(lang: Lang) {
  return dict[lang];
}

export function localizeRating(rating: string | undefined, lang: Lang): string {
  if (!rating) return '';
  const key = rating.toLowerCase();
  return dict[lang].fgRatings[key] ?? rating;
}
