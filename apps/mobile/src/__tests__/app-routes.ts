import CalendarScreen from '../app/(tabs)/calendar';
import HomeScreen from '../app/(tabs)/index';
import TabsLayout from '../app/(tabs)/_layout';
import RacesScreen from '../app/(tabs)/races';
import RidesScreen from '../app/(tabs)/rides';
import RoutesScreen from '../app/(tabs)/routes';

/** Маршруты вкладок для renderRouter (корневой layout подключают отдельные тесты). */
export const tabRoutes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeScreen,
  '(tabs)/races': RacesScreen,
  '(tabs)/rides': RidesScreen,
  '(tabs)/routes': RoutesScreen,
  '(tabs)/calendar': CalendarScreen,
};
