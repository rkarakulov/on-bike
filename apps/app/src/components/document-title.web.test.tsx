/// <reference types="jest" />
import Head from 'expo-router/head';
import { renderRouter, waitFor } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import { DocumentTitle } from './document-title';

// провайдер Head в приложении ставит корень expo-router (qualified-entry), в тесте — обёртка
const wrapper = ({ children }: { children: ReactNode }) => (
  <Head.Provider>{children}</Head.Provider>
);

describe('DocumentTitle (web)', () => {
  it('ставит заголовок вкладки браузера', async () => {
    await renderRouter(
      { index: () => <DocumentTitle title="Статус сервиса — Приложение" /> },
      { wrapper },
    );

    await waitFor(() => expect(document.title).toBe('Статус сервиса — Приложение'));
  });
});
