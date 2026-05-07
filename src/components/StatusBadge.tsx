import type { Lang, Status } from '../types';
import { t } from '../lib/i18n';
import { statusClasses } from '../lib/thresholds';

interface Props {
  status: Status;
  lang: Lang;
}

export function StatusBadge({ status, lang }: Props) {
  const cls = statusClasses(status);
  const label = t(lang).status[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls.bg} ${cls.fg}`}
    >
      {label}
    </span>
  );
}
