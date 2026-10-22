import { isNetworkError } from '@on-bike/api-client';
import { space } from '@on-bike/design-tokens';
import { t } from '@on-bike/i18n';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, EmptyState, SkeletonGroup, TextAction } from '@/components/ui';

/** Минимум от результата TanStack Query v5 — компонент не зависит от конкретного запроса. */
export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  isPending: boolean;
  isError: boolean;
  /** 'paused' — запрос ждёт сеть (onlineManager) */
  fetchStatus: 'fetching' | 'paused' | 'idle';
  refetch: () => unknown;
}

export interface AsyncContentProps<T> {
  query: AsyncState<T>;
  /** скелетон, повторяющий раскладку успешного состояния */
  skeleton: ReactNode;
  /** пустое состояние экрана: когда данные считаются пустыми и что показать */
  empty?: { when: (data: T) => boolean; render: () => ReactNode };
  children: (data: T) => ReactNode;
}

/**
 * Обязательная обёртка данных экрана (AGENTS.md §4.12). Порядок важен:
 * 1. данные есть — показываем их; ошибка фонового обновления — баннер поверх, данные не прячем;
 * 2. первая загрузка — скелетон (а без сети — сразу «Нет соединения», не вечный скелетон);
 * 3. ошибка без данных — «Нет соединения» (сеть) / «Не удалось загрузить» (всё остальное) с повтором;
 * 4. пустые данные — пустое состояние экрана.
 */
export function AsyncContent<T>({ query, skeleton, empty, children }: AsyncContentProps<T>) {
  const retry = () => void query.refetch();
  const { data } = query;

  if (data !== undefined) {
    const content = empty?.when(data) ? empty.render() : children(data);
    if (!query.isError) return <>{content}</>;
    return (
      <View style={styles.stale}>
        <Banner tone="warning" title={t('state.staleTitle')} message={t('state.staleMessage')} />
        <TextAction label={t('state.retry')} onPress={retry} />
        {content}
      </View>
    );
  }

  const offline = query.fetchStatus === 'paused';
  if (query.isPending && !offline) return <SkeletonGroup>{skeleton}</SkeletonGroup>;

  // «Нет соединения» — только когда запрос точно не дошёл; остальное (HTTP, форма ответа) — сервер
  const server = !offline && !isNetworkError(query.error);
  return (
    <View accessibilityLiveRegion="polite">
      <EmptyState
        title={t(server ? 'state.failedTitle' : 'state.errorTitle')}
        message={t(server ? 'state.failedMessage' : 'state.errorMessage')}
        action={{ label: t('state.retry'), onPress: retry }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stale: { gap: space.s3 },
});
