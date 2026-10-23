import { t } from '@on-bike/i18n';
import { TextAction } from '@rkarakulov/ui';
import { useRouter } from 'expo-router';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

/** Вход по паролю — слайс 2; пока заглушка с возвратом к регистрации. */
export default function SignInScreen() {
  const router = useRouter();

  return (
    <ScreenPlaceholder title="auth.signIn.title">
      <TextAction
        label={t('auth.signIn.toRegister')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/register'))}
      />
    </ScreenPlaceholder>
  );
}
