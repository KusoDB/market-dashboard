import type { Lang, MetricView } from '../types';
import { t } from '../lib/i18n';
import { MetricCard } from './MetricCard';

interface Props {
  sentiment: MetricView[];
  indices: MetricView[];
  lang: Lang;
  loading: boolean;
}

export function Dashboard({ sentiment, indices, lang, loading }: Props) {
  const tr = t(lang);
  return (
    <main className="flex flex-col gap-8 pb-12">
      <Section title={tr.sentiment}>
        {sentiment.map((v) => (
          <MetricCard key={v.id} view={v} lang={lang} loading={loading} />
        ))}
      </Section>
      <Section title={tr.indices}>
        {indices.map((v) => (
          <MetricCard key={v.id} view={v} lang={lang} loading={loading} />
        ))}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}
