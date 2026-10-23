/// <reference types="jest" />
import { onlineManager } from '@tanstack/react-query';

import { connectOnlineManager } from './online-manager';

describe('onlineManager (web)', () => {
  it('без NetInfo: сеть доступна, пока браузер не сообщил обратное', () => {
    connectOnlineManager();
    expect(onlineManager.isOnline()).toBe(true);
  });
});
