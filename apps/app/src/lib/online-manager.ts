import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * В RN нет `navigator.onLine`: без NetInfo onlineManager считает сеть всегда доступной,
 * запросы не встают на паузу и «Нет соединения» видно только после всех ретраев (rules/app.md).
 */
export function connectOnlineManager() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
}
