import CheckEmailScreen from '../app/(onboarding)/check-email';
import OnboardingLayout from '../app/(onboarding)/_layout';
import RegisterScreen from '../app/(onboarding)/register';
import SignInScreen from '../app/(onboarding)/sign-in';
import CalendarScreen from '../app/(tabs)/calendar';
import HomeScreen from '../app/(tabs)/index';
import TabsLayout from '../app/(tabs)/_layout';
import RacesScreen from '../app/(tabs)/races';
import RidesScreen from '../app/(tabs)/rides';
import RoutesScreen from '../app/(tabs)/routes';
import VerifyEmailScreen from '../app/auth/verify/[token]';
import RootLayout from '../app/_layout';
import StatusScreen from '../app/status';
import UiKitScreen from '../app/ui-kit';

/** Маршруты вкладок для renderRouter (корневой layout подключают отдельные тесты). */
export const tabRoutes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeScreen,
  '(tabs)/races': RacesScreen,
  '(tabs)/rides': RidesScreen,
  '(tabs)/routes': RoutesScreen,
  '(tabs)/calendar': CalendarScreen,
};

/** Всё приложение: корневой layout с гардом, вкладки, регистрация, ссылка из письма, витрина, `/status`. */
export const appRoutes = {
  _layout: RootLayout,
  ...tabRoutes,
  '(onboarding)/_layout': OnboardingLayout,
  '(onboarding)/register': RegisterScreen,
  '(onboarding)/check-email': CheckEmailScreen,
  '(onboarding)/sign-in': SignInScreen,
  'auth/verify/[token]': VerifyEmailScreen,
  'ui-kit': UiKitScreen,
  status: StatusScreen,
};
