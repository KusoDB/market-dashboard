import type { Lang } from '../types';
import { formatTimestamp } from '../lib/format';
import { t } from '../lib/i18n';

interface Props {
  lang: Lang;
  onToggleLang: () => void;
  onRefresh: () => void;
  loading: boolean;
  updatedAt?: string;
}

export function Header({ lang, onToggleLang, onRefresh, loading, updatedAt }: Props) {
  const tr = t(lang);
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-6">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{tr.title}</h1>
        {updatedAt && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tr.lastUpdated}: {formatTimestamp(updatedAt, lang)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={loading ? 'animate-spin' : ''}
          >
            <path d="M3 12a9 9 0 0 1 15.5-6.36L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15.5 6.36L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          {loading ? tr.refreshing : tr.refresh}
        </button>

        <button
          onClick={onToggleLang}
          className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {lang === 'ja' ? 'EN' : 'JA'}
        </button>
      </div>
    </header>
  );
}
