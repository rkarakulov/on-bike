import { isNetworkError } from '@pokatim/api-client';
import { t } from '@pokatim/i18n';
import { useQuery } from '@tanstack/react-query';

import { api } from './api';

export function App() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const retry = () => void health.refetch();
  // «Нет соединения» — только для сети и паузы без сети; остальное — сервер (AGENTS.md §4.12)
  const offline = health.fetchStatus === 'paused';
  const failed = !offline && !isNetworkError(health.error);

  return (
    <main className="shell">
      {/* заголовок виден сразу; асинхронный блок — по AGENTS.md §4.12 */}
      <h1 className="t-panel-title">{t('admin.title')}</h1>
      <section aria-busy={health.isPending} className="status">
        <span className="t-meta muted">{t('admin.apiStatus')}</span>
        {health.data !== undefined ? (
          <>
            <span className="t-meta">
              {t(health.data.status === 'ok' ? 'apiStatus.ok' : 'apiStatus.degraded')}
            </span>
            {health.isError ? (
              <span role="status" className="status-error">
                <span className="t-meta">{t('state.staleTitle')}</span>
                <button type="button" className="button t-panel-button" onClick={retry}>
                  {t('state.retry')}
                </button>
              </span>
            ) : null}
          </>
        ) : health.isPending && !offline ? (
          // неразрывный пробел даёт блоку высоту строки .t-meta — без магических px
          <span
            className="skeleton t-meta status-value"
            role="progressbar"
            aria-label={t('state.loading')}
          >
            {'\u00A0'}
          </span>
        ) : (
          <span role="alert" className="status-error">
            <span className="t-meta">
              {t(failed ? 'state.failedMessage' : 'state.errorMessage')}
            </span>
            <button type="button" className="button t-panel-button" onClick={retry}>
              {t('state.retry')}
            </button>
          </span>
        )}
      </section>
    </main>
  );
}
