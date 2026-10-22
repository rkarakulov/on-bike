import { t } from '@on-bike/i18n';
import { useQuery } from '@tanstack/react-query';

import { api } from './api';

export function App() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });

  return (
    <main className="shell">
      <h1>{t('admin.title')}</h1>
      <p className="muted">API: {health.data?.status ?? (health.isError ? 'down' : '…')}</p>
    </main>
  );
}
