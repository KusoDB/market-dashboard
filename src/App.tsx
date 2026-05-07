import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { useMarketData } from './hooks/useMarketData';
import type { Lang } from './types';

export default function App() {
  const [lang, setLang] = useState<Lang>('ja');
  const { sentiment, indices, loading, refresh, updatedAt } = useMarketData();

  return (
    <div className="mx-auto w-full max-w-[1152px] px-4 sm:px-6">
      <Header
        lang={lang}
        onToggleLang={() => setLang(lang === 'ja' ? 'en' : 'ja')}
        onRefresh={refresh}
        loading={loading}
        updatedAt={updatedAt}
      />
      <Dashboard
        sentiment={sentiment}
        indices={indices}
        lang={lang}
        loading={loading}
      />
    </div>
  );
}
